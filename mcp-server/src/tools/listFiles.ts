/**
 * list_files Tool
 *
 * Lists files and directories within the repository.
 * Based on PRD v1.4 Section 7.2.1
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { PathValidator } from '../validation/pathValidator.js';
import { validateListFilesArgs } from '../validation/inputValidator.js';
import { DirectoryNotFoundError, toMCPError } from '../errors/index.js';

/**
 * File entry in list results
 */
export interface FileEntry {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified_at?: string;
}

/**
 * list_files result
 */
export interface ListFilesResult {
  files: FileEntry[];
  total_count: number;
  truncated: boolean;
}

/**
 * Maximum files to return
 */
const MAX_FILES = 500;

/**
 * Execute list_files tool
 */
export async function listFiles(
  args: unknown,
  validator: PathValidator
): Promise<ListFilesResult> {
  // Validate arguments
  const params = validateListFilesArgs(args);

  try {
    // Validate and resolve directory path
    const dirPath = await validator.validate(params.directory);

    // Check if directory exists
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      throw new DirectoryNotFoundError(params.directory);
    }

    // Build glob pattern
    let globPattern: string;
    if (params.pattern) {
      // User provided a pattern
      globPattern = path.join(dirPath, '**', params.pattern);
    } else {
      // List all files up to max_depth
      const depthPattern = '**/'.repeat(params.max_depth) + '*';
      globPattern = path.join(dirPath, depthPattern);
    }

    // Configure glob options
    const globOptions = {
      dot: params.include_hidden,
      nodir: false,
      absolute: true,
      maxDepth: params.max_depth,
      ignore: params.include_hidden
        ? []
        : ['**/node_modules/**', '**/.git/**', '**/.*'],
    };

    // Execute glob
    const matches = await glob(globPattern, globOptions);

    // Limit results
    const truncated = matches.length > MAX_FILES;
    const limitedMatches = matches.slice(0, MAX_FILES);

    // Get file info for each match
    const files: FileEntry[] = await Promise.all(
      limitedMatches.map(async (filePath) => {
        try {
          const fileStat = await fs.stat(filePath);
          return {
            path: validator.toRelative(filePath),
            type: fileStat.isDirectory() ? 'directory' : 'file',
            size: fileStat.isFile() ? fileStat.size : undefined,
            modified_at: fileStat.mtime.toISOString(),
          } as FileEntry;
        } catch {
          // If we can't stat a file, include it with minimal info
          return {
            path: validator.toRelative(filePath),
            type: 'file',
          } as FileEntry;
        }
      })
    );

    // Sort: directories first, then by path
    files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.path.localeCompare(b.path);
    });

    return {
      files,
      total_count: matches.length,
      truncated,
    };
  } catch (error) {
    throw toMCPError(error);
  }
}

/**
 * Tool definition for MCP registration
 */
export const listFilesDefinition = {
  name: 'list_files',
  description:
    'List files and directories within the repository. Returns file paths, types, sizes, and modification dates.',
  inputSchema: {
    type: 'object',
    properties: {
      directory: {
        type: 'string',
        description: 'Directory path relative to repository root. Defaults to root.',
        default: '.',
      },
      pattern: {
        type: 'string',
        description: 'Glob pattern to filter files (e.g., "*.ts", "**/*.json")',
      },
      max_depth: {
        type: 'number',
        description: 'Maximum directory depth to traverse. Default: 3',
        default: 3,
        minimum: 1,
        maximum: 10,
      },
      include_hidden: {
        type: 'boolean',
        description: 'Include hidden files and directories. Default: false',
        default: false,
      },
    },
    required: [],
  },
};
