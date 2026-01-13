/**
 * search_files Tool
 *
 * Search for text patterns across repository files.
 * Based on PRD v1.4 Section 7.2.3
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { PathValidator } from '../validation/pathValidator.js';
import {
  validateSearchFilesArgs,
  escapeRegex,
} from '../validation/inputValidator.js';
import { MCPError, MCPErrorCodes, SearchTimeoutError, toMCPError } from '../errors/index.js';

/**
 * Search match result
 */
export interface SearchMatch {
  path: string;
  line_number: number;
  line_content: string;
  context: {
    before: string[];
    after: string[];
  };
}

/**
 * search_files result
 */
export interface SearchFilesResult {
  matches: SearchMatch[];
  total_matches: number;
  files_searched: number;
  truncated: boolean;
  duration_ms: number;
}

/**
 * Default files to exclude from search
 */
const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/*.map',
];

/**
 * Binary file extensions to skip
 */
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.bmp',
  '.pdf', '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.wasm', '.pyc', '.class',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.sqlite', '.db',
]);

/**
 * Check if file should be skipped based on extension
 */
function shouldSkipFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Search a single file for matches
 */
async function searchInFile(
  filePath: string,
  regex: RegExp,
  contextLines: number,
  validator: PathValidator
): Promise<SearchMatch[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const matches: SearchMatch[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        // Get context lines
        const beforeStart = Math.max(0, i - contextLines);
        const afterEnd = Math.min(lines.length, i + contextLines + 1);

        matches.push({
          path: validator.toRelative(filePath),
          line_number: i + 1, // 1-indexed
          line_content: lines[i],
          context: {
            before: lines.slice(beforeStart, i),
            after: lines.slice(i + 1, afterEnd),
          },
        });
      }
    }

    return matches;
  } catch {
    // Skip files that can't be read (binary, permission issues, etc.)
    return [];
  }
}

/**
 * Execute search_files tool
 */
export async function searchFiles(
  args: unknown,
  validator: PathValidator,
  maxResults: number,
  timeoutMs: number
): Promise<SearchFilesResult> {
  const startTime = Date.now();

  // Validate arguments
  const params = validateSearchFilesArgs(args);

  try {
    // Build regex pattern (avoid global flag to prevent lastIndex skipping across lines)
    let regex: RegExp;
    const flags = params.case_sensitive ? '' : 'i';
    if (params.is_regex) {
      regex = new RegExp(params.pattern, flags);
    } else {
      const escaped = escapeRegex(params.pattern);
      regex = new RegExp(escaped, flags);
    }

    // Build glob pattern for files to search
    const globPattern = params.glob || '**/*';
    const fullPattern = path.join(validator.getAllowedRoot(), globPattern);

    // Get list of files to search
    const files = await glob(fullPattern, {
      nodir: true,
      absolute: true,
      ignore: DEFAULT_EXCLUDE,
    });

    // Filter out binary files
    const textFiles = files.filter((f) => !shouldSkipFile(f));
    if (textFiles.length === 0) {
      throw new MCPError(
        MCPErrorCodes.NO_FILES_MATCHED,
        'No files matched the search pattern',
        { glob: params.glob || '**/*' }
      );
    }

    // Track results
    const allMatches: SearchMatch[] = [];
    let filesSearched = 0;
    let truncated = false;

    // Search files with timeout check
    for (const file of textFiles) {
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new SearchTimeoutError(timeoutMs);
      }

      // Check if we have enough results
      if (allMatches.length >= params.max_results) {
        truncated = true;
        break;
      }

      // Search file
      const fileMatches = await searchInFile(
        file,
        regex,
        params.context_lines,
        validator
      );

      if (fileMatches.length > 0) {
        // Add matches up to limit
        const remaining = params.max_results - allMatches.length;
        allMatches.push(...fileMatches.slice(0, remaining));
      }

      filesSearched++;
    }

    const duration = Date.now() - startTime;

    // Check if we hit max results
    if (allMatches.length >= maxResults) {
      truncated = true;
    }

    return {
      matches: allMatches.slice(0, maxResults),
      total_matches: allMatches.length,
      files_searched: filesSearched,
      truncated,
      duration_ms: duration,
    };
  } catch (error) {
    throw toMCPError(error);
  }
}

/**
 * Tool definition for MCP registration
 */
export const searchFilesDefinition = {
  name: 'search_files',
  description:
    'Search for text patterns across repository files. Returns matching lines with context.',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Search pattern (plain text or regex)',
      },
      is_regex: {
        type: 'boolean',
        description: 'Treat pattern as a regular expression. Default: false',
        default: false,
      },
      glob: {
        type: 'string',
        description: 'Glob pattern to filter files (e.g., "src/**/*.ts")',
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of matches to return. Default: 50',
        default: 50,
        minimum: 1,
        maximum: 1000,
      },
      context_lines: {
        type: 'number',
        description: 'Number of lines of context around each match. Default: 2',
        default: 2,
        minimum: 0,
        maximum: 10,
      },
      case_sensitive: {
        type: 'boolean',
        description: 'Case-sensitive search. Default: false',
        default: false,
      },
    },
    required: ['pattern'],
  },
};
