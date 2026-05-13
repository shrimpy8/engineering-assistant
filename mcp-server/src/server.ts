/**
 * MCP Server Implementation
 *
 * Implements the Model Context Protocol server for file system tools.
 * Based on PRD v1.4 Section 7
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { config } from './config/index.js';
import { logger } from './logger.js';
import { createPathValidator } from './validation/pathValidator.js';
import {
  listFiles,
  readFile,
  searchFiles,
  getRepoOverview,
  toolDefinitions,
  TOOL_NAMES,
} from './tools/index.js';
import { MCPError, MCPErrorCodes, toMCPError } from './errors/index.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version: serverVersion } = require('../package.json') as { version: string };

/**
 * Create and configure the MCP server
 */
export function createServer(repoPath: string): Server {
  // Create path validator for the repository
  const validator = createPathValidator(repoPath, config.allowedRoot);

  // Create MCP server
  const server = new Server(
    {
      name: 'engineering-assistant-mcp',
      version: serverVersion,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: toolDefinitions,
    };
  });

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case TOOL_NAMES.LIST_FILES:
          result = await listFiles(args, validator);
          break;

        case TOOL_NAMES.READ_FILE:
          result = await readFile(args, validator, config.maxFileSize);
          break;

        case TOOL_NAMES.SEARCH_FILES:
          result = await searchFiles(
            args,
            validator,
            config.maxSearchResults,
            config.searchTimeout
          );
          break;

        case TOOL_NAMES.GET_REPO_OVERVIEW:
          result = await getRepoOverview(args, validator);
          break;

        default:
          throw new MCPError(
            MCPErrorCodes.INVALID_ARGUMENTS,
            `Unknown tool: ${name}`
          );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const mcpError = toMCPError(error);

      // Return error as tool result (not throwing, which would be protocol error)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                code: mcpError.code,
                message: mcpError.message,
                details: mcpError.details,
              },
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(repoPath: string): Promise<void> {
  const server = createServer(repoPath);
  const transport = new StdioServerTransport();

  logger.info({ repoPath, allowedRoot: config.allowedRoot ?? '(any)', maxFileSize: config.maxFileSize, maxSearchResults: config.maxSearchResults }, 'MCP Server starting');

  await server.connect(transport);

  logger.info('MCP Server ready');
}

export default createServer;
