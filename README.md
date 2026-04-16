# changegen

[![npm](https://img.shields.io/npm/v/@bbs-company/changegen)](https://www.npmjs.com/package/@bbs-company/changegen)

Generate clean, categorized changelogs from git commit history using [Conventional Commits](https://www.conventionalcommits.org/).

## Quick Start

```bash
npx @bbs-company/changegen
```

Reads your git history since the latest tag, prints a colorized summary to the terminal, and writes `CHANGELOG.md`.

## Installation

```bash
npm install -g @bbs-company/changegen
# or use without installing:
npx @bbs-company/changegen
```

## Usage

```
changegen [options] [path]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--since <ref>` | Start from a tag, commit hash, or date | latest tag |
| `--until <ref>` | End at a tag, commit hash, or date | HEAD |
| `--version <ver>` | Version label in the changelog header | `Unreleased` |
| `--output <mode>` | `markdown`, `terminal`, or `both` | `both` |
| `--out <file>` | Write markdown to this file | `CHANGELOG.md` |
| `--no-file` | Print only; do not write to a file | — |
| `--list-tags` | Show available tags and exit | — |
| `--help, -h` | Show help | — |

### Examples

```bash
# Generate since latest tag (default behavior)
npx @bbs-company/changegen

# Generate since a specific tag
npx @bbs-company/changegen --since v1.2.0

# Label this as v1.3.0
npx @bbs-company/changegen --since v1.2.0 --version 1.3.0

# Terminal output only (no file write)
npx @bbs-company/changegen --output terminal

# Write markdown to stdout (pipe-friendly)
npx @bbs-company/changegen --output markdown --no-file > CHANGELOG.md

# Generate for a specific date range
npx @bbs-company/changegen --since "2024-01-01" --until "2024-06-30"

# Run against a different repository
npx @bbs-company/changegen /path/to/another/repo

# List available tags
npx @bbs-company/changegen --list-tags
```

## Commit Format

`changegen` recognizes [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
[optional footer(s)]
```

### Supported types

| Type | Section |
|------|---------|
| `feat` | Features |
| `fix` | Bug Fixes |
| `perf` | Performance Improvements |
| `refactor` | Refactoring |
| `docs` | Documentation |
| `test` | Tests |
| `build` | Build System |
| `ci` | CI/CD |
| `style` | Code Style |
| `chore` | Chores |
| `revert` | Reverts |
| anything else | Other Changes |

### Breaking changes

Mark breaking changes with `!` after the type/scope, or include `BREAKING CHANGE:` in the commit footer:

```
feat!: redesign authentication API
feat(api)!: remove deprecated v1 endpoints

feat: new login flow

BREAKING CHANGE: session tokens are no longer compatible with v1 clients
```

## Non-conventional repos

If your repo doesn't use conventional commits, `changegen` still works — all commits will appear under **Other Changes**. No errors, no drama.

## Example output

```
Changelog — 1.3.0  2024-06-15
──────────────────────────────────────────────────

⚠️  Breaking Changes
  • redesign authentication API  bb7ef54  [BREAKING]

Features
  • add dark mode toggle  a1b2c3d
  • add export to PDF  e4f5g6h

Bug Fixes
  • auth: resolve token refresh race condition  i7j8k9l
  • fix crash on empty repository  m0n1o2p

Documentation
  • update API reference  q3r4s5t

  7 commits · 2 features · 2 fixes · 1 breaking
```

## Self-hosting the API server

`changegen` ships an HTTP server (`src/server.ts`) that exposes a REST API with Lemon Squeezy subscription gating.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Port to listen on (default: `3000`) |
| `CHANGEGEN_API_KEY` | No | Static bearer token for self-hosted deployments (bypasses subscription checks) |
| `LEMONSQUEEZY_API_KEY` | Yes (for payments) | Lemon Squeezy API key from your dashboard |
| `LEMONSQUEEZY_STORE_ID` | Yes (for payments) | Lemon Squeezy store ID |
| `LEMONSQUEEZY_VARIANT_ID` | Yes (for payments) | Lemon Squeezy product variant ID to sell |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Yes (for webhooks) | Signing secret from the Lemon Squeezy webhook settings |

### API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Health check |
| `POST` | `/api/subscribe` | None | Returns a Lemon Squeezy checkout URL |
| `POST` | `/api/webhook` | Signature | Handles Lemon Squeezy webhook events |
| `POST` | `/api/changelog` | Bearer token | Generates a changelog for a remote repo |

### Webhook events handled

- `subscription_created` — issues a new API key for the subscriber
- `subscription_cancelled` — deactivates the subscriber's API key
- `subscription_expired` — deactivates the subscriber's API key

## Requirements

- Node.js >= 18
- Git available in PATH

## License

MIT
