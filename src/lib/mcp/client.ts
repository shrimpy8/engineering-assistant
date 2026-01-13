/**
 * MCP Client Implementation
 *
 * Connects to MCP tools for execution.
 * Uses shared tool implementations for local-first architecture.
 *
 * Based on PRD v1.4 Section 5.2
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import { logger } from '@/lib/logger';
import {
  listFiles,
  readFile,
  searchFiles,
  getRepoOverview,
} from '@/lib/tools';
import type {
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
} from '@/lib/tools';
import type { MCPClientConfig, ToolDefinition } from './types';

// Re-export types for convenience
export type {
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
};

// =============================================================================
// MCP Client Class
// =============================================================================

/**
 * MCP Client for tool execution
 *
 * Uses shared tool implementations from @/lib/tools for local-first architecture.
 * All tools execute in the same process for efficiency.
 */
export class MCPClient extends EventEmitter {
  private repoRoot: string;
  private initialized: boolean = false;

  constructor(config: MCPClientConfig) {
    super();
    this.repoRoot = config.repoRoot;
  }

  /**
   * Initialize the client (validates repo path)
   */
  async connect(): Promise<void> {
    try {
      const stat = await fs.stat(this.repoRoot);
      if (!stat.isDirectory()) {
        throw new Error('Repo root is not a directory');
      }
      this.initialized = true;
      logger.info({ repoRoot: this.repoRoot }, 'MCP client initialized');
      this.emit('connected');
    } catch (error) {
      throw new Error(
        `Failed to initialize MCP client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if client is connected and initialized
   */
  isConnected(): boolean {
    return this.initialized;
  }

  /**
   * Call a tool by name
   */
  async callTool<T extends ToolResult>(
    toolName: ToolName,
    args: Record<string, unknown>
  ): Promise<T> {
    if (!this.initialized) {
      throw new Error('MCP client not initialized');
    }

    const startTime = Date.now();

    try {
      let result: ToolResult;

      switch (toolName) {
        case 'list_files':
          result = await listFiles(args as unknown as ListFilesParams, this.repoRoot);
          break;
        case 'read_file':
          result = await readFile(args as unknown as ReadFileParams, this.repoRoot);
          break;
        case 'search_files':
          result = await searchFiles(args as unknown as SearchFilesParams, this.repoRoot);
          break;
        case 'get_repo_overview':
          result = await getRepoOverview(args as unknown as RepoOverviewParams, this.repoRoot);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      const duration = Date.now() - startTime;
      logger.info({ tool: toolName, duration_ms: duration }, 'Tool call completed');

      return result as T;
    } catch (error) {
      logger.error(
        { tool: toolName, error: error instanceof Error ? error.message : 'Unknown' },
        'Tool call failed'
      );
      throw error;
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<ToolDefinition[]> {
    return [
      {
        name: 'list_files',
        description: 'List files and directories in a repository path',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string' },
            pattern: { type: 'string' },
            max_depth: { type: 'number' },
            include_hidden: { type: 'boolean' },
          },
        },
      },
      {
        name: 'read_file',
        description: 'Read file contents from the repository',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            max_bytes: { type: 'number' },
            encoding: { type: 'string' },
          },
          required: ['path'],
        },
      },
      {
        name: 'search_files',
        description: 'Search for text patterns across files',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string' },
            is_regex: { type: 'boolean' },
            glob: { type: 'string' },
            max_results: { type: 'number' },
            context_lines: { type: 'number' },
            case_sensitive: { type: 'boolean' },
          },
          required: ['pattern'],
        },
      },
      {
        name: 'get_repo_overview',
        description: 'Get repository structure and statistics',
        inputSchema: {
          type: 'object',
          properties: {
            max_depth: { type: 'number' },
            include_stats: { type: 'boolean' },
          },
        },
      },
    ];
  }

  // Convenience methods
  async listFiles(params: ListFilesParams): Promise<ListFilesResult> {
    return this.callTool<ListFilesResult>('list_files', params as unknown as Record<string, unknown>);
  }

  async readFile(params: ReadFileParams): Promise<ReadFileResult> {
    return this.callTool<ReadFileResult>('read_file', params as unknown as Record<string, unknown>);
  }

  async searchFiles(params: SearchFilesParams): Promise<SearchFilesResult> {
    return this.callTool<SearchFilesResult>('search_files', params as unknown as Record<string, unknown>);
  }

  async getRepoOverview(params: RepoOverviewParams): Promise<RepoOverviewResult> {
    return this.callTool<RepoOverviewResult>('get_repo_overview', params as unknown as Record<string, unknown>);
  }

  /**
   * Disconnect (no-op for direct calls, kept for interface compatibility)
   */
  async disconnect(): Promise<void> {
    this.initialized = false;
    this.emit('disconnected');
  }
}

// =============================================================================
// Client Factory
// =============================================================================

/**
 * Create a new MCP client for a repository
 */
export async function createMCPClient(
  repoRoot: string,
  options?: Partial<MCPClientConfig>
): Promise<MCPClient> {
  const client = new MCPClient({
    transport: 'stdio',
    repoRoot,
    ...options,
  });

  await client.connect();
  return client;
}

// =============================================================================
// Singleton Client Pool
// =============================================================================

const clientPool = new Map<string, MCPClient>();

/**
 * Get or create an MCP client for a repository
 */
export async function getMCPClient(repoRoot: string): Promise<MCPClient> {
  const existing = clientPool.get(repoRoot);

  if (existing?.isConnected()) {
    return existing;
  }

  if (existing) {
    clientPool.delete(repoRoot);
  }

  const client = await createMCPClient(repoRoot);

  client.on('disconnected', () => {
    clientPool.delete(repoRoot);
  });

  clientPool.set(repoRoot, client);
  return client;
}

/**
 * Disconnect all pooled clients
 */
export async function disconnectAllClients(): Promise<void> {
  const disconnectPromises = Array.from(clientPool.values()).map((client) =>
    client.disconnect()
  );
  await Promise.all(disconnectPromises);
  clientPool.clear();
}
