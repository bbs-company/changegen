"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestTag = getLatestTag;
exports.getTags = getTags;
exports.getCommits = getCommits;
const child_process_1 = require("child_process");
const DELIMITER = '||COMMIT||';
const FIELD_SEP = '||FIELD||';
/**
 * Returns the latest git tag in the repo, or null if none exist.
 */
function getLatestTag(repoPath) {
    try {
        const tag = (0, child_process_1.execSync)('git describe --tags --abbrev=0', {
            cwd: repoPath,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        return tag || null;
    }
    catch {
        return null;
    }
}
/**
 * Returns all tags sorted by creation date (newest first).
 */
function getTags(repoPath) {
    try {
        const output = (0, child_process_1.execSync)('git tag --sort=-creatordate', {
            cwd: repoPath,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        return output ? output.split('\n') : [];
    }
    catch {
        return [];
    }
}
/**
 * Read git log and return commits as structured objects.
 */
function getCommits(repoPath, since, until) {
    const format = [
        '%H', // full hash
        '%h', // short hash
        '%ai', // author date ISO
        '%an', // author name
        '%s', // subject
        '%b', // body
    ].join(FIELD_SEP);
    const rangeArgs = [];
    if (since) {
        // If it looks like a tag/ref, use range syntax; otherwise use --since
        if (since.match(/^v?\d/)) {
            rangeArgs.push(`${since}..HEAD`);
        }
        else {
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
    let raw;
    try {
        raw = (0, child_process_1.execSync)(cmd, {
            cwd: repoPath,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('not a git repository')) {
            throw new Error(`Not a git repository: ${repoPath}`);
        }
        // Could be an empty repo or bad range — return empty
        return [];
    }
    return parseRawLog(raw);
}
function parseRawLog(raw) {
    const commits = [];
    const entries = raw.split(DELIMITER).filter((e) => e.trim());
    for (const entry of entries) {
        const cleaned = entry.replace(/^"/, '').replace(/"$/, '').trim();
        const fields = cleaned.split(FIELD_SEP);
        if (fields.length < 5)
            continue;
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
//# sourceMappingURL=git.js.map