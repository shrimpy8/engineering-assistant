/**
 * Shared Tool Implementations
 *
 * Core tool logic shared between MCP client and server.
 * Based on PRD v1.4 Section 7.2
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  ListFilesParams,
  ReadFileParams,
  SearchFilesParams,
  RepoOverviewParams,
  ListFilesResult,
  ReadFileResult,
  SearchFilesResult,
  RepoOverviewResult,
  FileEntry,
  SearchMatch,
  DirectoryNode,
  LanguageStat,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * Directory names excluded from traversal.
 */
export const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '__pycache__',
  '.cache',
  'coverage',
]);

/**
 * File extensions excluded from traversal.
 */
export const EXCLUDED_EXTENSIONS = new Set(['.lock', '.log', '.map']);

/**
 * Hard cap for list_files results.
 */
export const MAX_FILES = 500;

/**
 * Hard cap for search_files results.
 */
export const MAX_SEARCH_RESULTS = 50;

/**
 * Default max_bytes for read_file.
 */
export const DEFAULT_MAX_BYTES = 100000;

/**
 * Default directory depth for list_files/get_repo_overview.
 */
export const DEFAULT_MAX_DEPTH = 3;

/**
 * Default context lines for search_files.
 */
export const DEFAULT_CONTEXT_LINES = 2;

// =============================================================================
// Path Validation
// =============================================================================

/**
 * Validate and resolve a path within the repo root
 * @throws {Error} If path escapes the sandbox
 */
export function validatePath(targetPath: string, repoRoot: string): string {
  const root = path.resolve(repoRoot);
  const resolved = path.resolve(root, targetPath);
  const relative = path.relative(root, resolved);

  // Use path.relative to avoid prefix bypasses like /repo vs /repo2.
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Path traversal detected: ${targetPath}`);
  }

  return resolved;
}

// =============================================================================
// list_files Implementation
// =============================================================================

/**
 * List files and directories in a repository path
 */
export async function listFiles(
  params: ListFilesParams,
  repoRoot: string
): Promise<ListFilesResult> {
  const directory = params.directory || '.';
  const maxDepth = params.max_depth ?? DEFAULT_MAX_DEPTH;
  const includeHidden = params.include_hidden ?? false;

  const fullPath = validatePath(directory, repoRoot);
  const files: FileEntry[] = [];
  let truncated = false;

  async function walkDir(dirPath: string, depth: number): Promise<void> {
    if (depth > maxDepth || files.length >= MAX_FILES) {
      truncated = files.length >= MAX_FILES;
      return;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (files.length >= MAX_FILES) {
          truncated = true;
          return;
        }

        // Skip hidden files unless requested
        if (!includeHidden && entry.name.startsWith('.')) continue;

        // Skip excluded directories
        if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;

        // Skip excluded extensions
        const ext = path.extname(entry.name);
        if (EXCLUDED_EXTENSIONS.has(ext)) continue;

        // Apply pattern filter if provided
        if (params.pattern) {
          const regex = new RegExp(
            params.pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
          );
          if (!regex.test(entry.name)) continue;
        }

        const entryPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(repoRoot, entryPath);

        try {
          const stat = await fs.stat(entryPath);
          files.push({
            path: relativePath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: entry.isFile() ? stat.size : undefined,
            modified_at: stat.mtime.toISOString(),
          });

          // Recurse into directories
          if (entry.isDirectory()) {
            await walkDir(entryPath, depth + 1);
          }
        } catch {
          // Skip files we can't stat
        }
      }
    } catch (error) {
      if (depth === 0) throw error;
      // Skip directories we can't read at deeper levels
    }
  }

  await walkDir(fullPath, 0);

  return {
    files,
    total_count: files.length,
    truncated,
  };
}

// =============================================================================
// read_file Implementation
// =============================================================================

/**
 * Read file contents from the repository
 */
export async function readFile(
  params: ReadFileParams,
  repoRoot: string
): Promise<ReadFileResult> {
  const fullPath = validatePath(params.path, repoRoot);
  const maxBytes = params.max_bytes ?? DEFAULT_MAX_BYTES;
  const encoding = params.encoding ?? 'utf-8';

  const stat = await fs.stat(fullPath);

  if (!stat.isFile()) {
    throw new Error('Path is not a file');
  }

  const truncated = stat.size > maxBytes;
  const bytesToRead = Math.min(stat.size, maxBytes);

  let content: string;
  const handle = await fs.open(fullPath, 'r');

  try {
    const buffer = Buffer.alloc(bytesToRead);
    await handle.read(buffer, 0, bytesToRead, 0);
    content =
      encoding === 'base64' ? buffer.toString('base64') : buffer.toString('utf-8');
  } finally {
    await handle.close();
  }

  return {
    path: params.path,
    content,
    size: stat.size,
    modified_at: stat.mtime.toISOString(),
    encoding,
    truncated,
  };
}

// =============================================================================
// search_files Implementation
// =============================================================================

/**
 * Search for text patterns across files
 */
export async function searchFiles(
  params: SearchFilesParams,
  repoRoot: string
): Promise<SearchFilesResult> {
  const startTime = Date.now();
  const maxResults = params.max_results ?? MAX_SEARCH_RESULTS;
  const contextLines = params.context_lines ?? DEFAULT_CONTEXT_LINES;
  const caseSensitive = params.case_sensitive ?? false;

  const flags = caseSensitive ? '' : 'i';
  const pattern = params.is_regex
    ? new RegExp(params.pattern, flags)
    : new RegExp(params.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

  const matches: SearchMatch[] = [];
  let filesSearched = 0;
  let truncated = false;

  async function searchDir(dirPath: string): Promise<void> {
    if (matches.length >= maxResults) {
      truncated = true;
      return;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (matches.length >= maxResults) {
          truncated = true;
          return;
        }

        if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name)) continue;

        const entryPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await searchDir(entryPath);
        } else if (entry.isFile()) {
          // Apply glob filter if provided
          if (params.glob) {
            const relativePath = path.relative(repoRoot, entryPath);
            const globRegex = new RegExp(
              params.glob
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*')
                .replace(/\?/g, '.')
            );
            if (!globRegex.test(relativePath)) continue;
          }

          filesSearched++;

          try {
            const content = await fs.readFile(entryPath, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
              if (matches.length >= maxResults) {
                truncated = true;
                return;
              }

              if (pattern.test(lines[i])) {
                matches.push({
                  path: path.relative(repoRoot, entryPath),
                  line_number: i + 1,
                  line_content: lines[i],
                  context: {
                    before: lines.slice(Math.max(0, i - contextLines), i),
                    after: lines.slice(i + 1, i + 1 + contextLines),
                  },
                });
              }
            }
          } catch {
            // Skip files we can't read
          }
        }
      }
    } catch {
      // Skip directories we can't access
    }
  }

  await searchDir(repoRoot);

  return {
    matches,
    total_matches: matches.length,
    files_searched: filesSearched,
    truncated,
    duration_ms: Date.now() - startTime,
  };
}

// =============================================================================
// get_repo_overview Implementation
// =============================================================================

/**
 * Get repository structure and statistics
 */
export async function getRepoOverview(
  params: RepoOverviewParams,
  repoRoot: string
): Promise<RepoOverviewResult> {
  const maxDepth = params.max_depth ?? DEFAULT_MAX_DEPTH;
  const includeStats = params.include_stats ?? true;

  const stats = {
    total_files: 0,
    total_directories: 0,
    total_size: 0,
    languages: new Map<string, { count: number; bytes: number }>(),
  };

  async function buildTree(dirPath: string, depth: number): Promise<DirectoryNode> {
    const name = path.basename(dirPath) || path.basename(repoRoot);
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
        if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name)) continue;

        const entryPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          stats.total_directories++;
          const childNode = await buildTree(entryPath, depth + 1);
          node.children?.push(childNode);
        } else if (entry.isFile()) {
          stats.total_files++;

          try {
            const stat = await fs.stat(entryPath);
            stats.total_size += stat.size;

            const ext = path.extname(entry.name) || 'no-extension';
            const langStat = stats.languages.get(ext) || { count: 0, bytes: 0 };
            langStat.count++;
            langStat.bytes += stat.size;
            stats.languages.set(ext, langStat);

            node.children?.push({
              name: entry.name,
              type: 'file',
              size: stat.size,
            });
          } catch {
            // Skip files we can't stat
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }

    return node;
  }

  const structure = await buildTree(repoRoot, 0);

  const result: RepoOverviewResult = {
    root: repoRoot,
    structure,
  };

  if (includeStats) {
    const languages: LanguageStat[] = Array.from(stats.languages.entries())
      .map(([ext, data]) => ({ extension: ext, count: data.count, bytes: data.bytes }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 10);

    result.stats = {
      total_files: stats.total_files,
      total_directories: stats.total_directories,
      total_size: stats.total_size,
      languages,
    };
  }

  return result;
}
