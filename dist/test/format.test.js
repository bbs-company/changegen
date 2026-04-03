"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const format_1 = require("../format");
const categorize_1 = require("../categorize");
function makeCommit(subject) {
    return {
        hash: 'abc1234567890',
        shortHash: 'abc1234',
        date: '2024-01-01T00:00:00+00:00',
        author: 'Test User',
        subject,
        body: '',
    };
}
(0, node_test_1.describe)('formatMarkdown', () => {
    (0, node_test_1.it)('produces a versioned header', () => {
        const commits = [(0, categorize_1.parseCommit)(makeCommit('feat: add login'))];
        const md = (0, format_1.formatMarkdown)(commits, '1.0.0', '2024-01-01');
        strict_1.default.ok(md.includes('## [1.0.0] - 2024-01-01'));
    });
    (0, node_test_1.it)('includes Features section for feat commits', () => {
        const commits = [(0, categorize_1.parseCommit)(makeCommit('feat: add dashboard'))];
        const md = (0, format_1.formatMarkdown)(commits, '1.0.0', '2024-01-01');
        strict_1.default.ok(md.includes('### Features'));
        strict_1.default.ok(md.includes('add dashboard'));
        strict_1.default.ok(md.includes('abc1234'));
    });
    (0, node_test_1.it)('includes Bug Fixes section for fix commits', () => {
        const commits = [(0, categorize_1.parseCommit)(makeCommit('fix: resolve crash on startup'))];
        const md = (0, format_1.formatMarkdown)(commits, '1.0.0', '2024-01-01');
        strict_1.default.ok(md.includes('### Bug Fixes'));
        strict_1.default.ok(md.includes('resolve crash on startup'));
    });
    (0, node_test_1.it)('includes Breaking Changes section', () => {
        const commits = [(0, categorize_1.parseCommit)(makeCommit('feat!: remove old API'))];
        const md = (0, format_1.formatMarkdown)(commits, '2.0.0', '2024-01-01');
        strict_1.default.ok(md.includes('### Breaking Changes'));
        strict_1.default.ok(md.includes('BREAKING'));
    });
    (0, node_test_1.it)('includes scope in output', () => {
        const commits = [(0, categorize_1.parseCommit)(makeCommit('fix(auth): fix token refresh'))];
        const md = (0, format_1.formatMarkdown)(commits, '1.1.0', '2024-01-01');
        strict_1.default.ok(md.includes('**auth:**'));
    });
    (0, node_test_1.it)('handles multiple commit types', () => {
        const commits = [
            (0, categorize_1.parseCommit)(makeCommit('feat: new feature')),
            (0, categorize_1.parseCommit)(makeCommit('fix: bug fix')),
            (0, categorize_1.parseCommit)(makeCommit('docs: update readme')),
        ];
        const md = (0, format_1.formatMarkdown)(commits, '1.0.0', '2024-01-01');
        strict_1.default.ok(md.includes('### Features'));
        strict_1.default.ok(md.includes('### Bug Fixes'));
        strict_1.default.ok(md.includes('### Documentation'));
    });
});
(0, node_test_1.describe)('formatStats', () => {
    (0, node_test_1.it)('counts commits correctly', () => {
        const commits = [
            (0, categorize_1.parseCommit)(makeCommit('feat: a')),
            (0, categorize_1.parseCommit)(makeCommit('fix: b')),
        ];
        const stats = (0, format_1.formatStats)(commits);
        strict_1.default.ok(stats.includes('2 commits'));
        strict_1.default.ok(stats.includes('1 feature'));
        strict_1.default.ok(stats.includes('1 fix'));
    });
    (0, node_test_1.it)('handles empty list', () => {
        const stats = (0, format_1.formatStats)([]);
        strict_1.default.ok(stats.includes('0 commits'));
    });
});
(0, node_test_1.describe)('formatEmpty', () => {
    (0, node_test_1.it)('mentions since when provided', () => {
        const msg = (0, format_1.formatEmpty)('v1.0.0');
        strict_1.default.ok(msg.includes('v1.0.0'));
    });
    (0, node_test_1.it)('works without since', () => {
        const msg = (0, format_1.formatEmpty)();
        strict_1.default.ok(msg.length > 0);
    });
});
//# sourceMappingURL=format.test.js.map