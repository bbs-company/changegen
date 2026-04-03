import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommit } from '../categorize';
import { Commit } from '../types';

function makeCommit(subject: string, body = ''): Commit {
  return {
    hash: 'abc1234567890',
    shortHash: 'abc1234',
    date: '2024-01-01T00:00:00+00:00',
    author: 'Test User',
    subject,
    body,
  };
}

describe('parseCommit', () => {
  it('parses a feat commit', () => {
    const result = parseCommit(makeCommit('feat: add user login'));
    assert.equal(result.type, 'feat');
    assert.equal(result.description, 'add user login');
    assert.equal(result.scope, null);
    assert.equal(result.breaking, false);
  });

  it('parses a commit with scope', () => {
    const result = parseCommit(makeCommit('fix(auth): handle expired token'));
    assert.equal(result.type, 'fix');
    assert.equal(result.scope, 'auth');
    assert.equal(result.description, 'handle expired token');
  });

  it('parses a breaking change with !', () => {
    const result = parseCommit(makeCommit('feat!: redesign API'));
    assert.equal(result.type, 'feat');
    assert.equal(result.breaking, true);
  });

  it('parses a breaking change with scope', () => {
    const result = parseCommit(makeCommit('feat(api)!: remove v1 endpoints'));
    assert.equal(result.type, 'feat');
    assert.equal(result.scope, 'api');
    assert.equal(result.breaking, true);
  });

  it('detects BREAKING CHANGE in body', () => {
    const result = parseCommit(makeCommit('feat: new auth', 'BREAKING CHANGE: old tokens invalid'));
    assert.equal(result.breaking, true);
  });

  it('falls back to other for non-conventional commits', () => {
    const result = parseCommit(makeCommit('Updated dependencies'));
    assert.equal(result.type, 'other');
    assert.equal(result.description, 'Updated dependencies');
  });

  it('handles chore commits', () => {
    const result = parseCommit(makeCommit('chore: bump version'));
    assert.equal(result.type, 'chore');
  });

  it('handles case-insensitive types', () => {
    const result = parseCommit(makeCommit('FEAT: add feature'));
    assert.equal(result.type, 'feat');
  });

  it('handles unknown types as other', () => {
    const result = parseCommit(makeCommit('unknown: some change'));
    assert.equal(result.type, 'other');
  });
});
