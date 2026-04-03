import { execSync } from 'child_process';
import { Commit } from './types';

const DELIMITER = '||COMMIT||';
const FIELD_SEP = '||FIELD||';

/**
 * Returns the latest git tag in the repo, or null if none exist.
 */
export function getLatestTag(repoPath: string): string | null {
  try {
    const tag = execSync('git describe --tags --abbrev=0', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return tag || null;
  } catch {
    return null;
  }
}

/**
 * Returns all tags sorted by creation date (newest first).
 */
export function getTags(repoPath: string): string[] {
  try {
    const output = execSync('git tag --sort=-creatordate', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return output ? output.split('\n') : [];
  } catch {
    return [];
  }
}

/**
 * Read git log and return commits as structured objects.
 */
export function getCommits(
  repoPath: string,
  since?: string,
  until?: string
): Commit[] {
  const format = [
    '%H',   // full hash
    '%h',   // short hash
    '%ai',  // author date ISO
    '%an',  // author name
    '%s',   // subject
    '%b',   // body
  ].join(FIELD_SEP);

  const rangeArgs: string[] = [];
  if (since) {
    // If it looks like a tag/ref, use range syntax; otherwise use --since
    if (since.match(/^v?\d/)) {
      rangeArgs.push(`${since}..HEAD`);
    } else {
      rangeArgs.push(`--since="${since}"`);
    }
  }
  if (until) {
    rangeArgs.push(`--until="${until}"`);
  }

  const cmd = [
    'git log',
    `--pretty=format:"${format}${DELIMITER}"`,
    ...rangeArgs,
  ].join(' ');

  let raw: string;
  try {
    raw = execSync(cmd, {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('not a git repository')) {
      throw new Error(`Not a git repository: ${repoPath}`);
    }
    // Could be an empty repo or bad range — return empty
    return [];
  }

  return parseRawLog(raw);
}

function parseRawLog(raw: string): Commit[] {
  const commits: Commit[] = [];
  const entries = raw.split(DELIMITER).filter((e) => e.trim());

  for (const entry of entries) {
    const cleaned = entry.replace(/^"/, '').replace(/"$/, '').trim();
    const fields = cleaned.split(FIELD_SEP);
    if (fields.length < 5) continue;

    commits.push({
      hash: fields[0].trim(),
      shortHash: fields[1].trim(),
      date: fields[2].trim(),
      author: fields[3].trim(),
      subject: fields[4].trim(),
      body: (fields[5] || '').trim(),
    });
  }

  return commits;
}
