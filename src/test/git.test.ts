import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { getCommits, getLatestTag, getTags } from '../git';

function initTestRepo(dir: string): void {
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
}

function makeCommit(dir: string, msg: string): void {
  const file = path.join(dir, `${Date.now()}.txt`);
  fs.writeFileSync(file, msg);
  execSync(`git add .`, { cwd: dir, stdio: 'pipe' });
  execSync(`git commit -m "${msg}"`, { cwd: dir, stdio: 'pipe' });
}

describe('getCommits', () => {
  it('returns empty array for repo with no commits', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
    try {
      initTestRepo(dir);
      const commits = getCommits(dir);
      assert.equal(commits.length, 0);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('returns commits from a repo with history', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
    try {
      initTestRepo(dir);
      makeCommit(dir, 'feat: first commit');
      makeCommit(dir, 'fix: second commit');
      const commits = getCommits(dir);
      assert.equal(commits.length, 2);
      assert.ok(commits[0].subject.includes('second commit'));
      assert.ok(commits[1].subject.includes('first commit'));
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('filters commits since a tag', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
    try {
      initTestRepo(dir);
      makeCommit(dir, 'feat: before tag');
      execSync('git tag v1.0.0', { cwd: dir, stdio: 'pipe' });
      makeCommit(dir, 'feat: after tag');
      const commits = getCommits(dir, 'v1.0.0');
      assert.equal(commits.length, 1);
      assert.ok(commits[0].subject.includes('after tag'));
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('throws for non-git directory', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
    try {
      assert.throws(() => getCommits(dir), /not a git repository/i);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});

describe('getLatestTag', () => {
  it('returns null when no tags exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
    try {
      initTestRepo(dir);
      makeCommit(dir, 'initial commit');
      const tag = getLatestTag(dir);
      assert.equal(tag, null);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('returns the latest tag', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
    try {
      initTestRepo(dir);
      makeCommit(dir, 'initial commit');
      execSync('git tag v1.0.0', { cwd: dir, stdio: 'pipe' });
      makeCommit(dir, 'second commit');
      execSync('git tag v1.1.0', { cwd: dir, stdio: 'pipe' });
      const tag = getLatestTag(dir);
      assert.equal(tag, 'v1.1.0');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});

describe('getTags', () => {
  it('returns empty array when no tags', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
    try {
      initTestRepo(dir);
      const tags = getTags(dir);
      assert.deepEqual(tags, []);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('returns all tags', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changegen-test-'));
    try {
      initTestRepo(dir);
      makeCommit(dir, 'first');
      execSync('git tag v1.0.0', { cwd: dir, stdio: 'pipe' });
      makeCommit(dir, 'second');
      execSync('git tag v2.0.0', { cwd: dir, stdio: 'pipe' });
      const tags = getTags(dir);
      assert.ok(tags.includes('v1.0.0'));
      assert.ok(tags.includes('v2.0.0'));
      assert.equal(tags.length, 2);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});
