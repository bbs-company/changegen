import { Commit, CommitType, ParsedCommit } from './types';

// Matches: type(scope)!: description  or  type!: description  or  type: description
const CONVENTIONAL_REGEX =
  /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?:\s*(?<desc>.+)$/i;

export const COMMIT_TYPE_LABELS: Record<CommitType, string> = {
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

export const COMMIT_TYPE_ORDER: CommitType[] = [
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

export function parseCommit(commit: Commit): ParsedCommit {
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
  const isBreaking =
    !!breaking ||
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

function normalizeType(type: string): CommitType {
  const valid: CommitType[] = [
    'feat', 'fix', 'docs', 'style', 'refactor',
    'perf', 'test', 'build', 'ci', 'chore', 'revert',
  ];
  return valid.includes(type as CommitType) ? (type as CommitType) : 'other';
}

export function groupCommits(commits: ParsedCommit[]): Map<CommitType, ParsedCommit[]> {
  const groups = new Map<CommitType, ParsedCommit[]>();

  for (const commit of commits) {
    const existing = groups.get(commit.type) || [];
    existing.push(commit);
    groups.set(commit.type, existing);
  }

  return groups;
}
