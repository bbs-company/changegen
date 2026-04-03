import { Commit, CommitType, ParsedCommit } from './types';
export declare const COMMIT_TYPE_LABELS: Record<CommitType, string>;
export declare const COMMIT_TYPE_ORDER: CommitType[];
export declare function parseCommit(commit: Commit): ParsedCommit;
export declare function groupCommits(commits: ParsedCommit[]): Map<CommitType, ParsedCommit[]>;
//# sourceMappingURL=categorize.d.ts.map