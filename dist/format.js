"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMarkdown = formatMarkdown;
exports.formatTerminal = formatTerminal;
exports.formatEmpty = formatEmpty;
exports.formatStats = formatStats;
const categorize_1 = require("./categorize");
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
function formatMarkdown(commits, version, date) {
    const lines = [];
    const groups = (0, categorize_1.groupCommits)(commits);
    const breakingCommits = commits.filter((c) => c.breaking);
    lines.push(`## [${version}] - ${date}`);
    lines.push('');
    if (breakingCommits.length > 0) {
        lines.push('### Breaking Changes');
        lines.push('');
        for (const commit of breakingCommits) {
            lines.push(formatMarkdownCommitLine(commit));
        }
        lines.push('');
    }
    for (const type of categorize_1.COMMIT_TYPE_ORDER) {
        const typeCommits = groups.get(type);
        if (!typeCommits || typeCommits.length === 0)
            continue;
        if (type === 'other' && typeCommits.every((c) => isNoise(c)))
            continue;
        lines.push(`### ${categorize_1.COMMIT_TYPE_LABELS[type]}`);
        lines.push('');
        for (const commit of typeCommits) {
            lines.push(formatMarkdownCommitLine(commit));
        }
        lines.push('');
    }
    return lines.join('\n').trimEnd() + '\n';
}
function formatMarkdownCommitLine(commit) {
    const scope = commit.scope ? `**${commit.scope}:** ` : '';
    const breaking = commit.breaking ? ' ⚠️ **BREAKING**' : '';
    return `- ${scope}${commit.description} (\`${commit.raw.shortHash}\`)${breaking}`;
}
function formatTerminal(commits, version, date) {
    const lines = [];
    const groups = (0, categorize_1.groupCommits)(commits);
    const breakingCommits = commits.filter((c) => c.breaking);
    lines.push(`${BOLD}${CYAN}Changelog — ${version}${RESET}  ${DIM}${date}${RESET}`);
    lines.push(`${DIM}${'─'.repeat(50)}${RESET}`);
    lines.push('');
    if (breakingCommits.length > 0) {
        lines.push(`${BOLD}${RED}⚠️  Breaking Changes${RESET}`);
        for (const commit of breakingCommits) {
            lines.push(formatTerminalCommitLine(commit, RED));
        }
        lines.push('');
    }
    for (const type of categorize_1.COMMIT_TYPE_ORDER) {
        const typeCommits = groups.get(type);
        if (!typeCommits || typeCommits.length === 0)
            continue;
        if (type === 'other' && typeCommits.every((c) => isNoise(c)))
            continue;
        const color = typeColor(type);
        lines.push(`${BOLD}${color}${categorize_1.COMMIT_TYPE_LABELS[type]}${RESET}`);
        for (const commit of typeCommits) {
            lines.push(formatTerminalCommitLine(commit, color));
        }
        lines.push('');
    }
    return lines.join('\n');
}
function formatTerminalCommitLine(commit, _color) {
    const scope = commit.scope ? `${BOLD}${commit.scope}${RESET}: ` : '';
    const hash = `${DIM}${commit.raw.shortHash}${RESET}`;
    const breaking = commit.breaking ? ` ${RED}[BREAKING]${RESET}` : '';
    return `  ${GREEN}•${RESET} ${scope}${commit.description} ${hash}${breaking}`;
}
function typeColor(type) {
    switch (type) {
        case 'feat': return GREEN;
        case 'fix': return YELLOW;
        case 'perf': return CYAN;
        case 'docs': return CYAN;
        case 'revert': return RED;
        default: return DIM;
    }
}
function isNoise(commit) {
    const desc = commit.description.toLowerCase();
    return desc.startsWith('merge ') || desc.startsWith('wip') || desc.length < 3;
}
function formatEmpty(since) {
    const sinceMsg = since ? ` since ${since}` : '';
    return `No commits found${sinceMsg}.\n`;
}
function formatStats(commits) {
    const total = commits.length;
    const breaking = commits.filter((c) => c.breaking).length;
    const groups = (0, categorize_1.groupCommits)(commits);
    const features = (groups.get('feat') || []).length;
    const fixes = (groups.get('fix') || []).length;
    const parts = [`${total} commit${total !== 1 ? 's' : ''}`];
    if (features > 0)
        parts.push(`${features} feature${features !== 1 ? 's' : ''}`);
    if (fixes > 0)
        parts.push(`${fixes} fix${fixes !== 1 ? 'es' : ''}`);
    if (breaking > 0)
        parts.push(`${breaking} breaking`);
    return parts.join(' · ');
}
//# sourceMappingURL=format.js.map