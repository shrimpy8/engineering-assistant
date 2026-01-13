/**
 * Tool Router
 *
 * Detects tool call requests from LLM responses and routes them to the MCP server.
 * Based on PRD v1.4 Section 5.4
 */

import { randomUUID } from 'crypto';
import type { MCPClient } from '@/lib/mcp/client';
import type {
  ToolName,
  ToolResult,
  ToolCallEvent,
  ToolCallStatus,
  ListFilesParams,
  ReadFileParams,
  SearchFilesParams,
  RepoOverviewParams,
} from '@/lib/mcp/types';
import { logger } from '@/lib/logger';
import { isValidToolName } from './promptBuilder';

// =============================================================================
// Types
// =============================================================================

/**
 * Parsed tool call from LLM response
 */
export interface ParsedToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Result of executing a tool call
 */
export interface ToolCallResult {
  id: string;
  name: ToolName;
  arguments: Record<string, unknown>;
  status: ToolCallStatus;
  result?: ToolResult;
  error?: {
    code: string;
    message: string;
  };
  duration_ms: number;
}

/**
 * Event emitter for tool lifecycle events
 */
export type ToolEventEmitter = (event: ToolCallEvent) => void;

// =============================================================================
// Tool Call Detection
// =============================================================================

/**
 * Parse tool calls from Ollama response
 *
 * Ollama returns tool calls in the message.tool_calls array when using function calling.
 */
export function parseToolCalls(
  response: {
    message?: {
      tool_calls?: Array<{
        function?: {
          name: string;
          arguments: string | Record<string, unknown>;
        };
      }>;
    };
  }
): ParsedToolCall[] {
  const toolCalls: ParsedToolCall[] = [];

  if (!response.message?.tool_calls) {
    return toolCalls;
  }

  for (const call of response.message.tool_calls) {
    if (!call.function?.name) continue;

    let args: Record<string, unknown>;
    if (typeof call.function.arguments === 'string') {
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        logger.warn(
          { tool: call.function.name, arguments: call.function.arguments },
          'Failed to parse tool arguments'
        );
        continue;
      }
    } else {
      args = call.function.arguments;
    }

    toolCalls.push({
      id: `tc_${randomUUID().replace(/-/g, '').substring(0, 12)}`,
      name: call.function.name,
      arguments: args,
    });
  }

  return toolCalls;
}

/**
 * Check if a response contains tool calls
 */
export function hasToolCalls(response: {
  message?: { tool_calls?: unknown[] };
}): boolean {
  return (
    Array.isArray(response.message?.tool_calls) &&
    response.message.tool_calls.length > 0
  );
}

// =============================================================================
// Tool Router Class
// =============================================================================

/**
 * Routes tool calls to the MCP server and manages lifecycle events
 */
export class ToolRouter {
  private mcpClient: MCPClient;
  private eventEmitter?: ToolEventEmitter;

  constructor(mcpClient: MCPClient, eventEmitter?: ToolEventEmitter) {
    this.mcpClient = mcpClient;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Set event emitter for tool lifecycle events
   */
  setEventEmitter(emitter: ToolEventEmitter): void {
    this.eventEmitter = emitter;
  }

  /**
   * Emit a tool lifecycle event
   * PRD Reference: Section 6.4.1.1
   */
  private emitEvent(event: ToolCallEvent): void {
    if (this.eventEmitter) {
      this.eventEmitter(event);
    }
  }

  /**
   * Execute a single tool call
   */
  async executeToolCall(call: ParsedToolCall): Promise<ToolCallResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Validate tool name
    if (!isValidToolName(call.name)) {
      const error = {
        code: 'invalid_tool',
        message: `Unknown tool: ${call.name}`,
      };

      this.emitEvent({
        type: 'tool_call',
        id: call.id,
        name: call.name as ToolName,
        arguments: call.arguments,
        status: 'error',
        timestamp,
        error,
        duration_ms: Date.now() - startTime,
      });

      return {
        id: call.id,
        name: call.name as ToolName,
        arguments: call.arguments,
        status: 'error',
        error,
        duration_ms: Date.now() - startTime,
      };
    }

    const toolName = call.name as ToolName;

    // Emit started event
    this.emitEvent({
      type: 'tool_call',
      id: call.id,
      name: toolName,
      arguments: call.arguments,
      status: 'started',
      timestamp,
    });

    logger.info(
      { id: call.id, tool: toolName, arguments: call.arguments },
      'Executing tool call'
    );

    try {
      // Route to appropriate MCP client method
      const result = await this.routeToolCall(toolName, call.arguments);
      const duration = Date.now() - startTime;

      // Emit completed event
      this.emitEvent({
        type: 'tool_call',
        id: call.id,
        name: toolName,
        arguments: call.arguments,
        status: 'completed',
        timestamp,
        result,
        duration_ms: duration,
      });

      logger.info(
        { id: call.id, tool: toolName, duration_ms: duration },
        'Tool call completed'
      );

      return {
        id: call.id,
        name: toolName,
        arguments: call.arguments,
        status: 'completed',
        result,
        duration_ms: duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorInfo = {
        code: 'tool_execution_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };

      // Emit error event
      this.emitEvent({
        type: 'tool_call',
        id: call.id,
        name: toolName,
        arguments: call.arguments,
        status: 'error',
        timestamp,
        error: errorInfo,
        duration_ms: duration,
      });

      logger.error(
        { id: call.id, tool: toolName, error: errorInfo.message, duration_ms: duration },
        'Tool call failed'
      );

      return {
        id: call.id,
        name: toolName,
        arguments: call.arguments,
        status: 'error',
        error: errorInfo,
        duration_ms: duration,
      };
    }
  }

  /**
   * Route a tool call to the appropriate MCP client method
   */
  private async routeToolCall(
    name: ToolName,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    switch (name) {
      case 'list_files':
        return this.mcpClient.listFiles(args as unknown as ListFilesParams);

      case 'read_file':
        return this.mcpClient.readFile(args as unknown as ReadFileParams);

      case 'search_files':
        return this.mcpClient.searchFiles(args as unknown as SearchFilesParams);

      case 'get_repo_overview':
        return this.mcpClient.getRepoOverview(args as unknown as RepoOverviewParams);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Execute multiple tool calls in parallel
   */
  async executeToolCalls(calls: ParsedToolCall[]): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];
    // Preserve tool call order as required by the PRD.
    for (const call of calls) {
      results.push(await this.executeToolCall(call));
    }
    return results;
  }

  /**
   * Format tool results for injection into conversation
   * Uses a human-readable format to discourage JSON mimicry
   */
  formatToolResultsForLLM(results: ToolCallResult[]): string {
    return results
      .map((result) => {
        if (result.status === 'error') {
          return `[Tool Error] ${result.name}: ${result.error?.message}`;
        }

        // Format results in a readable way based on tool type
        return this.formatToolResultReadable(result.name, result.result);
      })
      .join('\n\n---\n\n');
  }

  /**
   * Format a tool result in human-readable form
   */
  private formatToolResultReadable(toolName: string, result: unknown): string {
    if (!result || typeof result !== 'object') {
      return `[${toolName}] No results`;
    }

    const data = result as Record<string, unknown>;

    switch (toolName) {
      case 'list_files': {
        const files = data.files as Array<{ path: string; type: string; size?: number }> || [];
        const dirs = files.filter(f => f.type === 'directory').map(f => f.path);
        const regularFiles = files.filter(f => f.type === 'file').map(f => f.path);

        let output = `[list_files] Found ${files.length} items:\n`;
        if (dirs.length > 0) {
          output += `\nDirectories:\n${dirs.map(d => `  - ${d}/`).join('\n')}`;
        }
        if (regularFiles.length > 0) {
          output += `\nFiles:\n${regularFiles.slice(0, 30).map(f => `  - ${f}`).join('\n')}`;
          if (regularFiles.length > 30) {
            output += `\n  ... and ${regularFiles.length - 30} more files`;
          }
        }
        return output;
      }

      case 'read_file': {
        const content = data.content as string || '';
        const path = data.path as string || 'unknown';
        const truncated = content.length > 2000;
        const preview = truncated ? content.slice(0, 2000) + '\n... (truncated)' : content;
        return `[read_file] Contents of ${path}:\n\n${preview}`;
      }

      case 'search_files': {
        const matches = data.matches as Array<{ path: string; line: number; content: string }> || [];
        if (matches.length === 0) {
          return `[search_files] No matches found`;
        }
        let output = `[search_files] Found ${matches.length} matches:\n`;
        output += matches.slice(0, 20).map(m => `  - ${m.path}:${m.line}: ${m.content.trim()}`).join('\n');
        if (matches.length > 20) {
          output += `\n  ... and ${matches.length - 20} more matches`;
        }
        return output;
      }

      case 'get_repo_overview': {
        // Structure is a DirectoryNode with nested children
        const structure = data.structure as {
          name: string;
          type: string;
          children?: Array<{ name: string; type: string; size?: number }>
        } | undefined;
        // Stats has languages as array of {extension, count, bytes}
        const stats = data.stats as {
          total_files?: number;
          total_directories?: number;
          total_size?: number;
          languages?: Array<{ extension: string; count: number; bytes: number }>
        } | undefined;
        const root = data.root as string | undefined;

        let output = `[get_repo_overview] Repository overview:\n`;
        if (root) output += `\nRepository: ${root}`;
        if (stats?.total_files) output += `\nTotal files: ${stats.total_files}`;
        if (stats?.total_directories) output += `\nTotal directories: ${stats.total_directories}`;
        if (stats?.total_size) output += `\nTotal size: ${Math.round(stats.total_size / 1024)} KB`;
        if (stats?.languages && stats.languages.length > 0) {
          output += `\n\nLanguages by file count:`;
          output += stats.languages.slice(0, 10).map(l => `\n  - ${l.extension}: ${l.count} files`).join('');
        }
        if (structure?.children && structure.children.length > 0) {
          const dirs = structure.children.filter(c => c.type === 'directory').map(c => c.name);
          const files = structure.children.filter(c => c.type === 'file').map(c => c.name);
          if (dirs.length > 0) {
            output += `\n\nTop-level directories:\n${dirs.slice(0, 15).map(d => `  - ${d}/`).join('\n')}`;
          }
          if (files.length > 0) {
            output += `\n\nTop-level files:\n${files.slice(0, 10).map(f => `  - ${f}`).join('\n')}`;
          }
        }
        return output;
      }

      default:
        // Fallback to compact JSON for unknown tools
        return `[${toolName}] Result: ${JSON.stringify(data)}`;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a tool router instance
 */
export function createToolRouter(
  mcpClient: MCPClient,
  eventEmitter?: ToolEventEmitter
): ToolRouter {
  return new ToolRouter(mcpClient, eventEmitter);
}
