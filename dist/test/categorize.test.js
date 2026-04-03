"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const categorize_1 = require("../categorize");
function makeCommit(subject, body = '') {
    return {
        hash: 'abc1234567890',
        shortHash: 'abc1234',
        date: '2024-01-01T00:00:00+00:00',
        author: 'Test User',
        subject,
        body,
    };
}
(0, node_test_1.describe)('parseCommit', () => {
    (0, node_test_1.it)('parses a feat commit', () => {
        const result = (0, categorize_1.parseCommit)(makeCommit('feat: add user login'));
        strict_1.default.equal(result.type, 'feat');
        strict_1.default.equal(result.description, 'add user login');
        strict_1.default.equal(result.scope, null);
        strict_1.default.equal(result.breaking, false);
    });
    (0, node_test_1.it)('parses a commit with scope', () => {
        const result = (0, categorize_1.parseCommit)(makeCommit('fix(auth): handle expired token'));
        strict_1.default.equal(result.type, 'fix');
        strict_1.default.equal(result.scope, 'auth');
        strict_1.default.equal(result.description, 'handle expired token');
    });
    (0, node_test_1.it)('parses a breaking change with !', () => {
        const result = (0, categorize_1.parseCommit)(makeCommit('feat!: redesign API'));
        strict_1.default.equal(result.type, 'feat');
        strict_1.default.equal(result.breaking, true);
    });
    (0, node_test_1.it)('parses a breaking change with scope', () => {
        const result = (0, categorize_1.parseCommit)(makeCommit('feat(api)!: remove v1 endpoints'));
        strict_1.default.equal(result.type, 'feat');
        strict_1.default.equal(result.scope, 'api');
        strict_1.default.equal(result.breaking, true);
    });
    (0, node_test_1.it)('detects BREAKING CHANGE in body', () => {
        const result = (0, categorize_1.parseCommit)(makeCommit('feat: new auth', 'BREAKING CHANGE: old tokens invalid'));
        strict_1.default.equal(result.breaking, true);
    });
    (0, node_test_1.it)('falls back to other for non-conventional commits', () => {
        const result = (0, categorize_1.parseCommit)(makeCommit('Updated dependencies'));
        strict_1.default.equal(result.type, 'other');
        strict_1.default.equal(result.description, 'Updated dependencies');
    });
    (0, node_test_1.it)('handles chore commits', () => {
        const result = (0, categorize_1.parseCommit)(makeCommit('chore: bump version'));
        strict_1.default.equal(result.type, 'chore');
    });
    (0, node_test_1.it)('handles case-insensitive types', () => {
        const result = (0, categorize_1.parseCommit)(makeCommit('FEAT: add feature'));
        strict_1.default.equal(result.type, 'feat');
    });
    (0, node_test_1.it)('handles unknown types as other', () => {
        const result = (0, categorize_1.parseCommit)(makeCommit('unknown: some change'));
        strict_1.default.equal(result.type, 'other');
    });
});
//# sourceMappingURL=categorize.test.js.map