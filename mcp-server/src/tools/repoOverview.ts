/**
 * get_repo_overview Tool
 *
 * Provides a high-level overview of the repository structure and statistics.
 * Based on PRD v1.4 Section 7.2.4
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { PathValidator } from '../validation/pathValidator.js';
import { validateRepoOverviewArgs } from '../validation/inputValidator.js';
import { toMCPError } from '../errors/index.js';

/**
 * Directory tree node
 */
export interface DirectoryNode {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  children?: DirectoryNode[];
}

/**
 * Language statistics
 */
export interface LanguageStats {
  extension: string;
  count: number;
  bytes: number;
}

/**
 * Repository statistics
 */
export interface RepoStats {
  total_files: number;
  total_directories: number;
  total_size: number;
  languages: LanguageStats[];
}

/**
 * get_repo_overview result
 */
export interface RepoOverviewResult {
  root: string;
  structure: DirectoryNode;
  stats?: RepoStats;
}

/**
 * Directories to skip
 */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '__pycache__',
  '.cache',
  'coverage',
  '.nyc_output',
]);


/**
 * Build directory tree recursively
 */
async function buildTree(
  dirPath: string,
  depth: number,
  maxDepth: number,
  stats: { files: number; dirs: number; size: number; languages: Map<string, LanguageStats> }
): Promise<DirectoryNode> {
  const name = path.basename(dirPath);
  const node: DirectoryNode = {
    name,
    type: 'directory',
    children: [],
  };

  if (depth >= maxDepth) {
    return node;
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip ignored directories
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) {
        continue;
      }

      // Skip hidden files/dirs at root level
      if (entry.name.startsWith('.') && depth === 0) {
        continue;
      }

      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        stats.dirs++;
        const childNode = await buildTree(
          entryPath,
          depth + 1,
          maxDepth,
          stats
        );
        node.children!.push(childNode);
      } else if (entry.isFile()) {
        try {
          const fileStat = await fs.stat(entryPath);
          stats.files++;
          stats.size += fileStat.size;

          // Track language stats
          const ext = path.extname(entry.name).toLowerCase();
          if (ext) {
            const existing = stats.languages.get(ext) || {
              extension: ext,
              count: 0,
              bytes: 0,
            };
            existing.count++;
            existing.bytes += fileStat.size;
            stats.languages.set(ext, existing);
          }

          node.children!.push({
            name: entry.name,
            type: 'file',
            size: fileStat.size,
          });
        } catch {
          // Skip files we can't stat
          node.children!.push({
            name: entry.name,
            type: 'file',
          });
        }
      }
    }

    // Sort children: directories first, then alphabetically
    node.children!.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch {
    // If we can't read the directory, return empty children
  }

  return node;
}

/**
 * Execute get_repo_overview tool
 */
export async function getRepoOverview(
  args: unknown,
  validator: PathValidator
): Promise<RepoOverviewResult> {
  // Validate arguments
  const params = validateRepoOverviewArgs(args);

  try {
    const repoRoot = validator.getAllowedRoot();
    const stats = {
      files: 0,
      dirs: 0,
      size: 0,
      languages: new Map<string, LanguageStats>(),
    };

    // Build directory tree
    const structure = await buildTree(repoRoot, 0, params.max_depth, stats);
    structure.name = path.basename(repoRoot);

    // Prepare result
    const result: RepoOverviewResult = {
      root: path.basename(repoRoot),
      structure,
    };

    // Add stats if requested
    if (params.include_stats) {
      // Convert language map to sorted array
      const languages = Array.from(stats.languages.values())
        .sort((a, b) => b.bytes - a.bytes) // Sort by bytes descending
        .slice(0, 15); // Top 15 languages

      result.stats = {
        total_files: stats.files,
        total_directories: stats.dirs,
        total_size: stats.size,
        languages,
      };
    }

    return result;
  } catch (error) {
    throw toMCPError(error);
  }
}

/**
 * Tool definition for MCP registration
 */
export const repoOverviewDefinition = {
  name: 'get_repo_overview',
  description:
    'Get a high-level overview of the repository structure and statistics including file counts and language breakdown.',
  inputSchema: {
    type: 'object',
    properties: {
      max_depth: {
        type: 'number',
        description: 'Maximum directory depth for the tree. Default: 3',
        default: 3,
        minimum: 1,
        maximum: 5,
      },
      include_stats: {
        type: 'boolean',
        description: 'Include file counts and language statistics. Default: true',
        default: true,
      },
    },
    required: [],
  },
};
