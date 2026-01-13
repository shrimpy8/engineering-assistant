/**
 * Tool Registry
 *
 * Exports all MCP tools and their definitions.
 * Based on PRD v1.4 Section 7.2
 */

export { listFiles, listFilesDefinition, type ListFilesResult } from './listFiles.js';
export { readFile, readFileDefinition, type ReadFileResult } from './readFile.js';
export { searchFiles, searchFilesDefinition, type SearchFilesResult } from './searchFiles.js';
export { getRepoOverview, repoOverviewDefinition, type RepoOverviewResult } from './repoOverview.js';

/**
 * All tool definitions for MCP registration
 */
export const toolDefinitions = [
  { name: 'list_files', description: 'List files and directories within the repository', inputSchema: { type: 'object', properties: { directory: { type: 'string', default: '.' }, pattern: { type: 'string' }, max_depth: { type: 'number', default: 3 }, include_hidden: { type: 'boolean', default: false } } } },
  { name: 'read_file', description: 'Read file contents from the repository', inputSchema: { type: 'object', properties: { path: { type: 'string' }, max_bytes: { type: 'number', default: 100000 }, encoding: { type: 'string', enum: ['utf-8', 'base64'], default: 'utf-8' } }, required: ['path'] } },
  { name: 'search_files', description: 'Search for text patterns across repository files', inputSchema: { type: 'object', properties: { pattern: { type: 'string' }, is_regex: { type: 'boolean', default: false }, glob: { type: 'string' }, max_results: { type: 'number', default: 50 }, context_lines: { type: 'number', default: 2 }, case_sensitive: { type: 'boolean', default: false } }, required: ['pattern'] } },
  { name: 'get_repo_overview', description: 'Get repository structure and statistics', inputSchema: { type: 'object', properties: { max_depth: { type: 'number', default: 3 }, include_stats: { type: 'boolean', default: true } } } },
];

/**
 * Tool names
 */
export const TOOL_NAMES = {
  LIST_FILES: 'list_files',
  READ_FILE: 'read_file',
  SEARCH_FILES: 'search_files',
  GET_REPO_OVERVIEW: 'get_repo_overview',
} as const;
