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

import { listFilesDefinition } from './listFiles.js';
import { readFileDefinition } from './readFile.js';
import { searchFilesDefinition } from './searchFiles.js';
import { repoOverviewDefinition } from './repoOverview.js';

/**
 * All tool definitions for MCP registration — use per-file definitions as the single source of truth.
 */
export const toolDefinitions = [
  listFilesDefinition,
  readFileDefinition,
  searchFilesDefinition,
  repoOverviewDefinition,
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
