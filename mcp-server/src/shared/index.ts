/**
 * Shared Tools Module
 *
 * ⚠️ TECH DEBT: This module is a copy of src/lib/tools/
 * TODO: Extract to a shared npm package when setting up monorepo structure
 *
 * Exports tool implementations and types for use by MCP server.
 */

// Types
export type {
  FileEntry,
  SearchMatch,
  DirectoryNode,
  LanguageStat,
  ListFilesParams,
  ReadFileParams,
  SearchFilesParams,
  RepoOverviewParams,
  ListFilesResult,
  ReadFileResult,
  SearchFilesResult,
  RepoOverviewResult,
  ToolResult,
  ToolName,
} from './types.js';

// Core implementations
export {
  listFiles,
  readFile,
  searchFiles,
  getRepoOverview,
  validatePath,
  EXCLUDED_DIRS,
  EXCLUDED_EXTENSIONS,
  MAX_FILES,
  MAX_SEARCH_RESULTS,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_DEPTH,
  DEFAULT_CONTEXT_LINES,
} from './core.js';
