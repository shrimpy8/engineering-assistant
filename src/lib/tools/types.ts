/**
 * Shared Tool Types
 *
 * Type definitions shared between MCP client and server.
 * Based on PRD v1.4 Section 7.2
 */

// =============================================================================
// Common Types
// =============================================================================

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
export interface LanguageStat {
  extension: string;
  count: number;
  bytes: number;
}

// =============================================================================
// Tool Parameters
// =============================================================================

/**
 * Parameters for list_files tool
 */
export interface ListFilesParams {
  directory?: string;
  pattern?: string;
  max_depth?: number;
  include_hidden?: boolean;
}

/**
 * Parameters for read_file tool
 */
export interface ReadFileParams {
  path: string;
  max_bytes?: number;
  encoding?: 'utf-8' | 'base64';
}

/**
 * Parameters for search_files tool
 */
export interface SearchFilesParams {
  pattern: string;
  is_regex?: boolean;
  glob?: string;
  max_results?: number;
  context_lines?: number;
  case_sensitive?: boolean;
}

/**
 * Parameters for get_repo_overview tool
 */
export interface RepoOverviewParams {
  max_depth?: number;
  include_stats?: boolean;
}

// =============================================================================
// Tool Results
// =============================================================================

/**
 * Result of list_files tool
 */
export interface ListFilesResult {
  files: FileEntry[];
  total_count: number;
  truncated: boolean;
}

/**
 * Result of read_file tool
 */
export interface ReadFileResult {
  path: string;
  content: string;
  size: number;
  modified_at: string;
  encoding: string;
  truncated: boolean;
}

/**
 * Result of search_files tool
 */
export interface SearchFilesResult {
  matches: SearchMatch[];
  total_matches: number;
  files_searched: number;
  truncated: boolean;
  duration_ms: number;
}

/**
 * Result of get_repo_overview tool
 */
export interface RepoOverviewResult {
  root: string;
  structure: DirectoryNode;
  stats?: {
    total_files: number;
    total_directories: number;
    total_size: number;
    languages: LanguageStat[];
  };
}

/**
 * Union of all tool results
 */
export type ToolResult =
  | ListFilesResult
  | ReadFileResult
  | SearchFilesResult
  | RepoOverviewResult;

/**
 * Tool names
 */
export type ToolName = 'list_files' | 'read_file' | 'search_files' | 'get_repo_overview';
