import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import StripeLib = require('stripe');
import { getCommits } from './git';
import { parseCommit } from './categorize';
import { formatMarkdown, formatStats } from './format';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '3000', 10);
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';

// ---------------------------------------------------------------------------
// Stripe client (lazy — only constructed when a key is present)
// ---------------------------------------------------------------------------

let _stripe: StripeLib.Stripe | null = null;

function getStripe(): StripeLib.Stripe {
  if (!_stripe) {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _stripe = new (StripeLib as any)(STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' }) as StripeLib.Stripe;
  }
  return _stripe!;
}

// ---------------------------------------------------------------------------
// In-memory subscription store
// apiKey → subscription record; subscriptionId → apiKey
// ---------------------------------------------------------------------------

interface SubscriptionRecord {
  customerId: string;
  subscriptionId: string;
  active: boolean;
}

const subscriptions = new Map<string, SubscriptionRecord>();
const subToKey = new Map<string, string>();

function generateApiKey(): string {
  return 'cg_live_' + crypto.randomBytes(24).toString('hex');
}

// ---------------------------------------------------------------------------
// Rate limiting — simple in-memory token bucket per IP
// ---------------------------------------------------------------------------

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const RATE_LIMIT_CAPACITY = 10;       // max burst
const RATE_LIMIT_REFILL_RATE = 1;     // tokens per second
const buckets = new Map<string, Bucket>();

function allowRequest(ip: string): boolean {
  const now = Date.now();
  let bucket = buckets.get(ip);

  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_CAPACITY - 1, lastRefill: now };
    buckets.set(ip, bucket);
    return true;
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(
    RATE_LIMIT_CAPACITY,
    bucket.tokens + elapsed * RATE_LIMIT_REFILL_RATE
  );
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// URL / path sanitization
// ---------------------------------------------------------------------------

const ALLOWED_PROTOCOLS = ['https:', 'http:'];

export function sanitizeRepoUrl(input: string): string {
  // Reject empty
  if (!input || !input.trim()) {
    throw new Error('repoUrl is required');
  }

  const trimmed = input.trim();

  // Reject local path traversal attempts and file:// URIs
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('~') ||
    trimmed.startsWith('.') ||
    trimmed.startsWith('file:')
  ) {
    throw new Error('Local paths and file:// URIs are not allowed');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid URL: ${trimmed}`);
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new Error(`Protocol not allowed: ${parsed.protocol}`);
  }

  // Reconstruct URL from parsed parts to strip any embedded credentials
  return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
}

// ---------------------------------------------------------------------------
// Clone a remote repo to a temp dir and return the path
// ---------------------------------------------------------------------------

function cloneRepo(repoUrl: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-clone-'));
  try {
    execSync(`git clone --depth=500 ${JSON.stringify(repoUrl)} ${JSON.stringify(tmpDir)}`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60_000,
    });
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to clone repository: ${msg}`);
  }
  return tmpDir;
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

function getClientIp(req: http.IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function readBodyBuffer(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJSON(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendHTML(res: http.ServerResponse, status: number, html: string): void {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function checkAuth(req: http.IncomingMessage): boolean {
  const staticKey = process.env.CHANGEGEN_API_KEY || '';
  // If no static key AND Stripe is not configured, auth is disabled (dev mode)
  if (!staticKey && !STRIPE_SECRET_KEY) return true;

  const authHeader = req.headers['authorization'] || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const providedKey = match[1];

  // Check against static admin key (self-hosted)
  if (staticKey && providedKey === staticKey) return true;

  // Check against active Stripe subscription keys
  const record = subscriptions.get(providedKey);
  return !!(record && record.active);
}

// ---------------------------------------------------------------------------
// Static file server for public/
// ---------------------------------------------------------------------------

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function serveStatic(
  req: http.IncomingMessage,
  res: http.ServerResponse
): boolean {
  const url = req.url || '/';
  // Only serve GET requests for the root path
  if (req.method !== 'GET') return false;
  if (url !== '/' && url !== '/index.html') return false;

  const filePath = path.join(PUBLIC_DIR, 'index.html');
  let content: Buffer;
  try {
    content = fs.readFileSync(filePath);
  } catch {
    return false;
  }

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': content.length,
  });
  res.end(content);
  return true;
}

// ---------------------------------------------------------------------------
// Stripe handlers
// ---------------------------------------------------------------------------

async function handleSubscribe(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  if (!STRIPE_PRICE_ID) {
    sendJSON(res, 503, { error: 'Stripe is not configured' });
    return;
  }

  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || `localhost:${PORT}`;
  const baseUrl = `${proto}://${host}`;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${baseUrl}/?subscribed=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/#pricing`,
    });
    sendJSON(res, 200, { url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendJSON(res, 500, { error: message });
  }
}

async function handleWebhook(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  if (!STRIPE_WEBHOOK_SECRET) {
    sendJSON(res, 503, { error: 'Webhook secret is not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || Array.isArray(sig)) {
    sendJSON(res, 400, { error: 'Missing stripe-signature header' });
    return;
  }

  let rawBody: Buffer;
  try {
    rawBody = await readBodyBuffer(req);
  } catch {
    sendJSON(res, 400, { error: 'Failed to read request body' });
    return;
  }

  interface StripeWebhookEvent {
    type: string;
    data: { object: { id: string; customer: string } };
  }

  let event: StripeWebhookEvent;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET) as StripeWebhookEvent;
  } catch {
    sendJSON(res, 400, { error: 'Webhook signature verification failed' });
    return;
  }

  if (event.type === 'customer.subscription.created') {
    const sub = event.data.object;
    const apiKey = generateApiKey();
    subscriptions.set(apiKey, {
      customerId: sub.customer,
      subscriptionId: sub.id,
      active: true,
    });
    subToKey.set(sub.id, apiKey);
    console.log(`[webhook] subscription created: ${sub.id} — API key issued`);
  } else if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const apiKey = subToKey.get(sub.id);
    if (apiKey) {
      const record = subscriptions.get(apiKey);
      if (record) {
        record.active = false;
      }
    }
    console.log(`[webhook] subscription cancelled: ${sub.id}`);
  }

  sendJSON(res, 200, { received: true });
}

// ---------------------------------------------------------------------------
// Changelog handler
// ---------------------------------------------------------------------------

async function handleChangelog(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  let body: string;
  try {
    body = await readBody(req);
  } catch {
    sendJSON(res, 400, { error: 'Failed to read request body' });
    return;
  }

  let parsed: {
    repoUrl?: string;
    since?: string;
    until?: string;
    version?: string;
    format?: string;
  };
  try {
    parsed = JSON.parse(body);
  } catch {
    sendJSON(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  // Validate and sanitize the repo URL
  let safeUrl: string;
  try {
    safeUrl = sanitizeRepoUrl(parsed.repoUrl || '');
  } catch (err) {
    sendJSON(res, 400, { error: (err as Error).message });
    return;
  }

  const version = parsed.version || 'Unreleased';
  const date = new Date().toISOString().split('T')[0];

  let repoPath: string | null = null;
  try {
    repoPath = cloneRepo(safeUrl);

    const rawCommits = getCommits(repoPath, parsed.since, parsed.until);
    const parsedCommits = rawCommits.map(parseCommit);
    const changelog = formatMarkdown(parsedCommits, version, date);
    const stats = {
      total: parsedCommits.length,
      summary: formatStats(parsedCommits),
    };

    sendJSON(res, 200, { changelog, stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendJSON(res, 500, { error: message });
  } finally {
    if (repoPath) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }
  }
}

// ---------------------------------------------------------------------------
// Subscription success page
// ---------------------------------------------------------------------------

async function handleSubscriptionSuccess(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host}`);
  const sessionId = urlObj.searchParams.get('session_id');

  if (!sessionId || !STRIPE_SECRET_KEY) {
    sendHTML(res, 400, '<h1>Invalid request</h1>');
    return;
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    }) as { subscription?: string | { id: string } | null };

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as { id: string } | null | undefined)?.id;

    let apiKey: string | undefined;
    if (subscriptionId) {
      apiKey = subToKey.get(subscriptionId);
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Subscription confirmed — changegen</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0d1117; color: #e6edf3;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 40px;
            max-width: 480px; text-align: center; }
    h1 { color: #3fb950; margin-bottom: 12px; }
    p { color: #8b949e; margin-bottom: 16px; }
    code { background: #21262d; border: 1px solid #30363d; border-radius: 4px;
           padding: 12px 20px; display: block; font-size: 0.9rem; word-break: break-all;
           color: #a5d6ff; margin: 16px 0; }
    a { color: #58a6ff; }
  </style>
</head>
<body>
  <div class="card">
    <h1>✓ Subscription confirmed</h1>
    <p>Thank you for subscribing to changegen API.</p>
    ${apiKey
      ? `<p>Your API key:</p><code>${apiKey}</code><p style="font-size:0.85rem">Save this key — it will not be shown again.</p>`
      : `<p>Your API key will be delivered once your subscription is fully activated. Please check back in a moment or contact support.</p>`
    }
    <p><a href="/">← Back to home</a></p>
  </div>
</body>
</html>`;

    sendHTML(res, 200, html);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendHTML(res, 500, `<h1>Error: ${message}</h1>`);
  }
}

// ---------------------------------------------------------------------------
// Main request router
// ---------------------------------------------------------------------------

async function onRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const ip = getClientIp(req);
  const method = req.method || 'GET';
  const url = req.url || '/';
  const pathname = url.split('?')[0];

  // Health check — no auth, no rate limiting
  if (method === 'GET' && pathname === '/health') {
    sendJSON(res, 200, { status: 'ok' });
    return;
  }

  // Landing page — no auth, no rate limiting
  if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    if (serveStatic(req, res)) return;
  }

  // Webhook — rate limited, but no auth (Stripe authenticates via signature)
  if (method === 'POST' && pathname === '/api/webhook') {
    if (!allowRequest(ip)) {
      sendJSON(res, 429, { error: 'Too Many Requests' });
      return;
    }
    await handleWebhook(req, res);
    return;
  }

  // Rate limiting
  if (!allowRequest(ip)) {
    sendJSON(res, 429, { error: 'Too Many Requests' });
    return;
  }

  // Subscribe — rate limited, no auth required (users subscribe to get a key)
  if (method === 'POST' && pathname === '/api/subscribe') {
    await handleSubscribe(req, res);
    return;
  }

  // Subscription success page — rate limited, no auth
  if (method === 'GET' && pathname === '/subscription-success') {
    await handleSubscriptionSuccess(req, res);
    return;
  }

  // Auth required for all remaining routes
  if (!checkAuth(req)) {
    sendJSON(res, 401, { error: 'Unauthorized' });
    return;
  }

  if (method === 'POST' && pathname === '/api/changelog') {
    await handleChangelog(req, res);
    return;
  }

  sendJSON(res, 404, { error: 'Not Found' });
}

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

export function createServer(): http.Server {
  return http.createServer((req, res) => {
    onRequest(req, res).catch((err) => {
      console.error('Unhandled error:', err);
      if (!res.headersSent) {
        sendJSON(res, 500, { error: 'Internal Server Error' });
      }
    });
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`changegen server listening on port ${PORT}`);
    if (!process.env.CHANGEGEN_API_KEY && !STRIPE_SECRET_KEY) {
      console.warn('Warning: neither CHANGEGEN_API_KEY nor STRIPE_SECRET_KEY is set — authentication is disabled');
    }
    if (!STRIPE_SECRET_KEY) {
      console.warn('Warning: STRIPE_SECRET_KEY is not set — /api/subscribe and /api/webhook are disabled');
    }
  });
}
