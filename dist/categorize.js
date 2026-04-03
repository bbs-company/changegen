"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMIT_TYPE_ORDER = exports.COMMIT_TYPE_LABELS = void 0;
exports.parseCommit = parseCommit;
exports.groupCommits = groupCommits;
// Matches: type(scope)!: description  or  type!: description  or  type: description
const CONVENTIONAL_REGEX = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?:\s*(?<desc>.+)$/i;
exports.COMMIT_TYPE_LABELS = {
    feat: 'Features',
    fix: 'Bug Fixes',
    perf: 'Performance Improvements',
    refactor: 'Refactoring',
    docs: 'Documentation',
    test: 'Tests',
    build: 'Build System',
    ci: 'CI/CD',
    style: 'Code Style',
    chore: 'Chores',
    revert: 'Reverts',
    other: 'Other Changes',
};
exports.COMMIT_TYPE_ORDER = [
    'feat',
    'fix',
    'perf',
    'refactor',
    'docs',
    'test',
    'build',
    'ci',
    'style',
    'chore',
    'revert',
    'other',
];
function parseCommit(commit) {
    const match = CONVENTIONAL_REGEX.exec(commit.subject);
    if (!match || !match.groups) {
        return {
            raw: commit,
            type: 'other',
            scope: null,
            description: commit.subject,
            breaking: false,
        };
    }
    const { type, scope, breaking, desc } = match.groups;
    const normalizedType = normalizeType(type.toLowerCase());
    // Also check body for BREAKING CHANGE footer
    const isBreaking = !!breaking ||
        /^BREAKING.CHANGE:/m.test(commit.body) ||
        /^BREAKING.CHANGE:/m.test(commit.subject);
    return {
        raw: commit,
        type: normalizedType,
        scope: scope || null,
        description: desc.trim(),
        breaking: isBreaking,
    };
}
function normalizeType(type) {
    const valid = [
        'feat', 'fix', 'docs', 'style', 'refactor',
        'perf', 'test', 'build', 'ci', 'chore', 'revert',
    ];
    return valid.includes(type) ? type : 'other';
}
function groupCommits(commits) {
    const groups = new Map();
    for (const commit of commits) {
        const existing = groups.get(commit.type) || [];
        existing.push(commit);
        groups.set(commit.type, existing);
    }
    return groups;
}
//# sourceMappingURL=categorize.js.map