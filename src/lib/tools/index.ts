/**
 * Shared Tools Module
 *
 * Exports tool implementations and types for use by MCP client and server.
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
} from './types';

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
} from './core';
