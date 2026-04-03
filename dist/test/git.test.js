"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const git_1 = require("../git");
function initTestRepo(dir) {
    (0, child_process_1.execSync)('git init', { cwd: dir, stdio: 'pipe' });
    (0, child_process_1.execSync)('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
    (0, child_process_1.execSync)('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
}
function makeCommit(dir, msg) {
    const file = path.join(dir, `${Date.now()}.txt`);
    fs.writeFileSync(file, msg);
    (0, child_process_1.execSync)(`git add .`, { cwd: dir, stdio: 'pipe' });
    (0, child_process_1.execSync)(`git commit -m "${msg}"`, { cwd: dir, stdio: 'pipe' });
}
(0, node_test_1.describe)('getCommits', () => {
    (0, node_test_1.it)('returns empty array for repo with no commits', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
        try {
            initTestRepo(dir);
            const commits = (0, git_1.getCommits)(dir);
            strict_1.default.equal(commits.length, 0);
        }
        finally {
            fs.rmSync(dir, { recursive: true });
        }
    });
    (0, node_test_1.it)('returns commits from a repo with history', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
        try {
            initTestRepo(dir);
            makeCommit(dir, 'feat: first commit');
            makeCommit(dir, 'fix: second commit');
            const commits = (0, git_1.getCommits)(dir);
            strict_1.default.equal(commits.length, 2);
            strict_1.default.ok(commits[0].subject.includes('second commit'));
            strict_1.default.ok(commits[1].subject.includes('first commit'));
        }
        finally {
            fs.rmSync(dir, { recursive: true });
        }
    });
    (0, node_test_1.it)('filters commits since a tag', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
        try {
            initTestRepo(dir);
            makeCommit(dir, 'feat: before tag');
            (0, child_process_1.execSync)('git tag v1.0.0', { cwd: dir, stdio: 'pipe' });
            makeCommit(dir, 'feat: after tag');
            const commits = (0, git_1.getCommits)(dir, 'v1.0.0');
            strict_1.default.equal(commits.length, 1);
            strict_1.default.ok(commits[0].subject.includes('after tag'));
        }
        finally {
            fs.rmSync(dir, { recursive: true });
        }
    });
    (0, node_test_1.it)('throws for non-git directory', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
        try {
            strict_1.default.throws(() => (0, git_1.getCommits)(dir), /not a git repository/i);
        }
        finally {
            fs.rmSync(dir, { recursive: true });
        }
    });
});
(0, node_test_1.describe)('getLatestTag', () => {
    (0, node_test_1.it)('returns null when no tags exist', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
        try {
            initTestRepo(dir);
            makeCommit(dir, 'initial commit');
            const tag = (0, git_1.getLatestTag)(dir);
            strict_1.default.equal(tag, null);
        }
        finally {
            fs.rmSync(dir, { recursive: true });
        }
    });
    (0, node_test_1.it)('returns the latest tag', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
        try {
            initTestRepo(dir);
            makeCommit(dir, 'initial commit');
            (0, child_process_1.execSync)('git tag v1.0.0', { cwd: dir, stdio: 'pipe' });
            makeCommit(dir, 'second commit');
            (0, child_process_1.execSync)('git tag v1.1.0', { cwd: dir, stdio: 'pipe' });
            const tag = (0, git_1.getLatestTag)(dir);
            strict_1.default.equal(tag, 'v1.1.0');
        }
        finally {
            fs.rmSync(dir, { recursive: true });
        }
    });
});
(0, node_test_1.describe)('getTags', () => {
    (0, node_test_1.it)('returns empty array when no tags', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
        try {
            initTestRepo(dir);
            const tags = (0, git_1.getTags)(dir);
            strict_1.default.deepEqual(tags, []);
        }
        finally {
            fs.rmSync(dir, { recursive: true });
        }
    });
    (0, node_test_1.it)('returns all tags', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
        try {
            initTestRepo(dir);
            makeCommit(dir, 'first');
            (0, child_process_1.execSync)('git tag v1.0.0', { cwd: dir, stdio: 'pipe' });
            makeCommit(dir, 'second');
            (0, child_process_1.execSync)('git tag v2.0.0', { cwd: dir, stdio: 'pipe' });
            const tags = (0, git_1.getTags)(dir);
            strict_1.default.ok(tags.includes('v1.0.0'));
            strict_1.default.ok(tags.includes('v2.0.0'));
            strict_1.default.equal(tags.length, 2);
        }
        finally {
            fs.rmSync(dir, { recursive: true });
        }
    });
});
//# sourceMappingURL=git.test.js.map