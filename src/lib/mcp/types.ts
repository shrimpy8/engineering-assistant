/**
 * MCP-Specific Types
 *
 * Types for MCP protocol, configuration, and events.
 * Tool parameter/result types are in @/lib/tools/types.ts
 *
 * Based on PRD v1.4 Section 5.2
 */

// Re-export tool types for backward compatibility
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
} from '@/lib/tools/types';

// =============================================================================
// MCP Client Configuration
// =============================================================================

/**
 * MCP client configuration
 */
export interface MCPClientConfig {
  transport: 'stdio' | 'tcp';
  tcpHost?: string;
  tcpPort?: number;
  repoRoot: string;
  timeout?: number;
}

// =============================================================================
// Tool Definitions
// =============================================================================

/**
 * Tool definition for MCP registration
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// =============================================================================
// JSON-RPC Protocol Types
// =============================================================================

/**
 * JSON-RPC request structure
 */
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * JSON-RPC success response
 */
export interface MCPSuccessResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result: T;
}

/**
 * JSON-RPC error response
 */
export interface MCPErrorResponse {
  jsonrpc: '2.0';
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type MCPResponse<T = unknown> = MCPSuccessResponse<T> | MCPErrorResponse;

// =============================================================================
// Tool Events (SSE)
// =============================================================================

/**
 * Tool call status for SSE events
 * PRD Reference: Section 6.4.1.1
 */
export type ToolCallStatus = 'started' | 'completed' | 'error';

/**
 * Tool call event for SSE streaming
 * PRD Reference: Section 6.4.1
 */
export interface ToolCallEvent {
  type: 'tool_call';
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: ToolCallStatus;
  timestamp: string;
  result?: unknown;
  error?: {
    code: string;
    message: string;
  };
  duration_ms?: number;
}
