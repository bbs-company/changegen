import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatMarkdown, formatStats, formatEmpty } from '../format';
import { parseCommit } from '../categorize';
import { Commit } from '../types';

function makeCommit(subject: string): Commit {
  return {
    hash: 'abc1234567890',
    shortHash: 'abc1234',
    date: '2024-01-01T00:00:00+00:00',
    author: 'Test User',
    subject,
    body: '',
  };
}

describe('formatMarkdown', () => {
  it('produces a versioned header', () => {
    const commits = [parseCommit(makeCommit('feat: add login'))];
    const md = formatMarkdown(commits, '1.0.0', '2024-01-01');
    assert.ok(md.includes('## [1.0.0] - 2024-01-01'));
  });

  it('includes Features section for feat commits', () => {
    const commits = [parseCommit(makeCommit('feat: add dashboard'))];
    const md = formatMarkdown(commits, '1.0.0', '2024-01-01');
    assert.ok(md.includes('### Features'));
    assert.ok(md.includes('add dashboard'));
    assert.ok(md.includes('abc1234'));
  });

  it('includes Bug Fixes section for fix commits', () => {
    const commits = [parseCommit(makeCommit('fix: resolve crash on startup'))];
    const md = formatMarkdown(commits, '1.0.0', '2024-01-01');
    assert.ok(md.includes('### Bug Fixes'));
    assert.ok(md.includes('resolve crash on startup'));
  });

  it('includes Breaking Changes section', () => {
    const commits = [parseCommit(makeCommit('feat!: remove old API'))];
    const md = formatMarkdown(commits, '2.0.0', '2024-01-01');
    assert.ok(md.includes('### Breaking Changes'));
    assert.ok(md.includes('BREAKING'));
  });

  it('includes scope in output', () => {
    const commits = [parseCommit(makeCommit('fix(auth): fix token refresh'))];
    const md = formatMarkdown(commits, '1.1.0', '2024-01-01');
    assert.ok(md.includes('**auth:**'));
  });

  it('handles multiple commit types', () => {
    const commits = [
      parseCommit(makeCommit('feat: new feature')),
      parseCommit(makeCommit('fix: bug fix')),
      parseCommit(makeCommit('docs: update readme')),
    ];
    const md = formatMarkdown(commits, '1.0.0', '2024-01-01');
    assert.ok(md.includes('### Features'));
    assert.ok(md.includes('### Bug Fixes'));
    assert.ok(md.includes('### Documentation'));
  });
});

describe('formatStats', () => {
  it('counts commits correctly', () => {
    const commits = [
      parseCommit(makeCommit('feat: a')),
      parseCommit(makeCommit('fix: b')),
    ];
    const stats = formatStats(commits);
    assert.ok(stats.includes('2 commits'));
    assert.ok(stats.includes('1 feature'));
    assert.ok(stats.includes('1 fix'));
  });

  it('handles empty list', () => {
    const stats = formatStats([]);
    assert.ok(stats.includes('0 commits'));
  });
});

describe('formatEmpty', () => {
  it('mentions since when provided', () => {
    const msg = formatEmpty('v1.0.0');
    assert.ok(msg.includes('v1.0.0'));
  });

  it('works without since', () => {
    const msg = formatEmpty();
    assert.ok(msg.length > 0);
  });
});
