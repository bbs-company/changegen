import { ParsedCommit } from './types';
export declare function formatMarkdown(commits: ParsedCommit[], version: string, date: string): string;
export declare function formatTerminal(commits: ParsedCommit[], version: string, date: string): string;
export declare function formatEmpty(since?: string): string;
export declare function formatStats(commits: ParsedCommit[]): string;
//# sourceMappingURL=format.d.ts.map