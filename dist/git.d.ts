import { Commit } from './types';
/**
 * Returns the latest git tag in the repo, or null if none exist.
 */
export declare function getLatestTag(repoPath: string): string | null;
/**
 * Returns all tags sorted by creation date (newest first).
 */
export declare function getTags(repoPath: string): string[];
/**
 * Read git log and return commits as structured objects.
 */
export declare function getCommits(repoPath: string, since?: string, until?: string): Commit[];
//# sourceMappingURL=git.d.ts.map