#!/usr/bin/env node
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
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const git_1 = require("./git");
const categorize_1 = require("./categorize");
const format_1 = require("./format");
const VERSION = '0.1.0';
function printHelp() {
    console.log(`
changegen — Generate changelogs from git history

USAGE
  changegen [options] [path]

OPTIONS
  --since <ref>      Start from a tag, commit hash, or date (default: latest tag)
  --until <ref>      End at a tag, commit hash, or date
  --version <ver>    Version label for the changelog header (default: next)
  --output <mode>    Output mode: markdown | terminal | both (default: both)
  --out <file>       Write markdown to this file (default: CHANGELOG.md)
  --no-file          Print only; do not write to file
  --list-tags        Show available tags and exit
  --help, -h         Show this help
  --version, -v      Show changegen version

EXAMPLES
  changegen                         # Since latest tag, write CHANGELOG.md + print
  changegen --since v1.0.0          # Since a specific tag
  changegen --since "2024-01-01"    # Since a date
  changegen --output terminal       # Terminal output only
  changegen --no-file               # Print without writing file
  changegen /path/to/repo           # Run against a different repo
`);
}
function parseCLIArgs(argv) {
    const opts = {
        repoPath: process.cwd(),
        output: 'both',
        outFile: 'CHANGELOG.md',
        listTags: false,
        noFile: false,
        showVersion: false,
    };
    const args = argv.slice(2);
    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        switch (arg) {
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
                break;
            case '--version':
            case '-v':
                if (args[i + 1] && !args[i + 1].startsWith('--')) {
                    opts.version = args[++i];
                }
                else {
                    opts.showVersion = true;
                }
                break;
            case '--since':
                opts.since = args[++i];
                break;
            case '--until':
                opts.until = args[++i];
                break;
            case '--output':
                const mode = args[++i];
                if (mode !== 'markdown' && mode !== 'terminal' && mode !== 'both') {
                    console.error(`Invalid --output value: ${mode}. Use markdown, terminal, or both.`);
                    process.exit(1);
                }
                opts.output = mode;
                break;
            case '--out':
                opts.outFile = args[++i];
                break;
            case '--no-file':
                opts.noFile = true;
                break;
            case '--list-tags':
                opts.listTags = true;
                break;
            default:
                if (!arg.startsWith('-')) {
                    opts.repoPath = path.resolve(arg);
                }
                else {
                    console.error(`Unknown option: ${arg}`);
                    printHelp();
                    process.exit(1);
                }
        }
        i++;
    }
    return opts;
}
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}
async function main() {
    const opts = parseCLIArgs(process.argv);
    if (opts.showVersion) {
        console.log(`changegen v${VERSION}`);
        process.exit(0);
    }
    // Validate repo path
    if (!fs.existsSync(opts.repoPath)) {
        console.error(`Path does not exist: ${opts.repoPath}`);
        process.exit(1);
    }
    const gitDir = path.join(opts.repoPath, '.git');
    if (!fs.existsSync(gitDir)) {
        console.error(`Not a git repository: ${opts.repoPath}`);
        process.exit(1);
    }
    if (opts.listTags) {
        const tags = (0, git_1.getTags)(opts.repoPath);
        if (tags.length === 0) {
            console.log('No tags found in this repository.');
        }
        else {
            console.log('Available tags (newest first):');
            tags.forEach((t) => console.log(`  ${t}`));
        }
        process.exit(0);
    }
    // Default: since the latest tag if no --since given
    let since = opts.since;
    let sinceLabel;
    if (!since) {
        const latestTag = (0, git_1.getLatestTag)(opts.repoPath);
        if (latestTag) {
            since = latestTag;
            sinceLabel = latestTag;
        }
    }
    else {
        sinceLabel = since;
    }
    const rawCommits = (0, git_1.getCommits)(opts.repoPath, since, opts.until);
    if (rawCommits.length === 0) {
        console.log((0, format_1.formatEmpty)(sinceLabel));
        process.exit(0);
    }
    const parsed = rawCommits.map(categorize_1.parseCommit);
    const version = opts.version || 'Unreleased';
    const date = getCurrentDate();
    if (opts.output === 'terminal' || opts.output === 'both') {
        const terminal = (0, format_1.formatTerminal)(parsed, version, date);
        console.log(terminal);
        console.log(`  ${(0, format_1.formatStats)(parsed)}`);
        console.log();
    }
    if (!opts.noFile && (opts.output === 'markdown' || opts.output === 'both')) {
        const markdown = (0, format_1.formatMarkdown)(parsed, version, date);
        const outPath = path.isAbsolute(opts.outFile)
            ? opts.outFile
            : path.join(opts.repoPath, opts.outFile);
        let existing = '';
        if (fs.existsSync(outPath)) {
            existing = fs.readFileSync(outPath, 'utf8');
            // Prepend after any existing header
            if (existing.startsWith('# Changelog')) {
                const headerEnd = existing.indexOf('\n\n');
                if (headerEnd !== -1) {
                    existing = existing.slice(0, headerEnd + 2) + markdown + '\n' + existing.slice(headerEnd + 2);
                    fs.writeFileSync(outPath, existing, 'utf8');
                    console.log(`Updated ${outPath}`);
                    return;
                }
            }
            // Prepend to file
            fs.writeFileSync(outPath, markdown + '\n' + existing, 'utf8');
        }
        else {
            const header = '# Changelog\n\nAll notable changes to this project will be documented here.\n\n';
            fs.writeFileSync(outPath, header + markdown, 'utf8');
        }
        console.log(`Wrote ${outPath}`);
    }
    else if (opts.output === 'markdown' && opts.noFile) {
        const markdown = (0, format_1.formatMarkdown)(parsed, version, date);
        process.stdout.write(markdown);
    }
}
main().catch((err) => {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
});
//# sourceMappingURL=index.js.map