/**
 * MCP Protocol Types
 * Types for MCP tool calls and results
 * Based on PRD v1.4 Section 7
 */

/**
 * Tool trace event for UI display
 */
export interface ToolTraceEvent {
  id: string;
  timestamp: string;
  tool: string;
  status: 'started' | 'completed' | 'error';
  arguments?: Record<string, unknown>;
  result?: unknown;
  error?: { code: string; message: string };
  duration_ms?: number;
}

/**
 * List files tool parameters
 */
export interface ListFilesParams {
  directory: string;
  pattern?: string;
  max_depth?: number;
  include_hidden?: boolean;
}

/**
 * List files tool result
 */
export interface ListFilesResult {
  files: {
    path: string;
    type: 'file' | 'directory';
    size?: number;
    modified_at?: string;
  }[];
  total_count: number;
  truncated: boolean;
}

/**
 * Read file tool parameters
 */
export interface ReadFileParams {
  path: string;
  max_bytes?: number;
  encoding?: 'utf-8' | 'base64';
}

/**
 * Read file tool result
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
 * Search files tool parameters
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
 * Search match with context
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
 * Search files tool result
 */
export interface SearchFilesResult {
  matches: SearchMatch[];
  total_matches: number;
  files_searched: number;
  truncated: boolean;
  duration_ms: number;
}

/**
 * Repository overview tool parameters
 */
export interface RepoOverviewParams {
  max_depth?: number;
  include_stats?: boolean;
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
export interface LanguageStats {
  extension: string;
  count: number;
  bytes: number;
}

/**
 * Repository overview tool result
 */
export interface RepoOverviewResult {
  root: string;
  structure: DirectoryNode;
  stats?: {
    total_files: number;
    total_directories: number;
    total_size: number;
    languages: LanguageStats[];
  };
}

/**
 * All tool names
 */
export type ToolName = 'list_files' | 'read_file' | 'search_files' | 'get_repo_overview';

/**
 * Tool parameters union
 */
export type ToolParams = ListFilesParams | ReadFileParams | SearchFilesParams | RepoOverviewParams;

/**
 * Tool results union
 */
export type ToolResult = ListFilesResult | ReadFileResult | SearchFilesResult | RepoOverviewResult;
