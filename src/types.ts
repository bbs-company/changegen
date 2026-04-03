export interface Commit {
  hash: string;
  shortHash: string;
  date: string;
  author: string;
  subject: string;
  body: string;
}

export interface ParsedCommit {
  raw: Commit;
  type: CommitType;
  scope: string | null;
  description: string;
  breaking: boolean;
}

export type CommitType =
  | 'feat'
  | 'fix'
  | 'docs'
  | 'style'
  | 'refactor'
  | 'perf'
  | 'test'
  | 'build'
  | 'ci'
  | 'chore'
  | 'revert'
  | 'other';

export interface ChangelogSection {
  type: CommitType;
  label: string;
  commits: ParsedCommit[];
}

export interface ChangelogOptions {
  repoPath: string;
  since?: string;
  until?: string;
  output?: 'markdown' | 'terminal' | 'both';
  outFile?: string;
  tag?: string;
  version?: string;
}
