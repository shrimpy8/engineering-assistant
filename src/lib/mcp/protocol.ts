/**
 * MCP Protocol Helpers
 *
 * JSON-RPC utilities for MCP communication.
 * Based on PRD v1.4 Section 5.2
 */

import { randomUUID } from 'crypto';
import type {
  MCPRequest,
  MCPResponse,
  MCPSuccessResponse,
  MCPErrorResponse,
} from './types';

// =============================================================================
// JSON-RPC Request Building
// =============================================================================

/**
 * Generate a unique request ID for JSON-RPC
 */
export function generateRequestId(): string {
  return `mcp_${randomUUID().replace(/-/g, '')}`;
}

/**
 * Create a JSON-RPC request object
 *
 * @param method - The RPC method name
 * @param params - Optional parameters
 * @returns Formatted JSON-RPC request
 */
export function createRequest(
  method: string,
  params?: Record<string, unknown>
): MCPRequest {
  return {
    jsonrpc: '2.0',
    id: generateRequestId(),
    method,
    ...(params && { params }),
  };
}

/**
 * Create a tool call request
 *
 * @param toolName - Name of the tool to call
 * @param args - Tool arguments
 * @returns Formatted JSON-RPC request for tool call
 */
export function createToolCallRequest(
  toolName: string,
  args: Record<string, unknown>
): MCPRequest {
  return createRequest('tools/call', {
    name: toolName,
    arguments: args,
  });
}

/**
 * Create a list tools request
 */
export function createListToolsRequest(): MCPRequest {
  return createRequest('tools/list');
}

/**
 * Create an initialize request
 */
export function createInitializeRequest(
  clientInfo: { name: string; version: string }
): MCPRequest {
  return createRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {},
    },
    clientInfo,
  });
}

// =============================================================================
// JSON-RPC Response Parsing
// =============================================================================

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(
  response: MCPResponse<T>
): response is MCPSuccessResponse<T> {
  return 'result' in response;
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(
  response: MCPResponse
): response is MCPErrorResponse {
  return 'error' in response;
}

/**
 * Parse a JSON-RPC response string
 *
 * @param data - Raw response string
 * @returns Parsed response object
 * @throws Error if parsing fails
 */
export function parseResponse<T = unknown>(data: string): MCPResponse<T> {
  try {
    const parsed = JSON.parse(data);

    // Validate JSON-RPC structure
    if (parsed.jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC version');
    }

    if (!('id' in parsed)) {
      throw new Error('Missing response ID');
    }

    if (!('result' in parsed) && !('error' in parsed)) {
      throw new Error('Response must have result or error');
    }

    return parsed as MCPResponse<T>;
  } catch (error) {
    throw new Error(
      `Failed to parse MCP response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract result from a successful response
 *
 * @param response - The MCP response
 * @returns The result data
 * @throws Error if response is an error
 */
export function extractResult<T>(response: MCPResponse<T>): T {
  if (isErrorResponse(response)) {
    throw new MCPProtocolError(
      response.error.code,
      response.error.message,
      response.error.data
    );
  }
  return response.result;
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * MCP Protocol error codes
 */
export const MCPErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Custom error codes
  TOOL_NOT_FOUND: -32000,
  TOOL_EXECUTION_FAILED: -32001,
  ACCESS_DENIED: -32002,
  TIMEOUT: -32003,
} as const;

/**
 * Custom error class for MCP protocol errors
 */
export class MCPProtocolError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'MCPProtocolError';
  }

  /**
   * Check if this is a specific error type
   */
  is(code: number): boolean {
    return this.code === code;
  }

  /**
   * Convert to API error format
   */
  toApiError(): { code: string; message: string } {
    const codeMap: Record<number, string> = {
      [MCPErrorCodes.PARSE_ERROR]: 'mcp_parse_error',
      [MCPErrorCodes.INVALID_REQUEST]: 'mcp_invalid_request',
      [MCPErrorCodes.METHOD_NOT_FOUND]: 'mcp_method_not_found',
      [MCPErrorCodes.INVALID_PARAMS]: 'mcp_invalid_params',
      [MCPErrorCodes.INTERNAL_ERROR]: 'mcp_internal_error',
      [MCPErrorCodes.TOOL_NOT_FOUND]: 'mcp_tool_not_found',
      [MCPErrorCodes.TOOL_EXECUTION_FAILED]: 'mcp_tool_failed',
      [MCPErrorCodes.ACCESS_DENIED]: 'access_denied',
      [MCPErrorCodes.TIMEOUT]: 'mcp_timeout',
    };

    return {
      code: codeMap[this.code] || 'mcp_error',
      message: this.message,
    };
  }
}

// =============================================================================
// Message Framing
// =============================================================================

/**
 * Encode a request for transport
 *
 * @param request - The request object
 * @returns Encoded string with newline terminator
 */
export function encodeMessage(request: MCPRequest): string {
  return JSON.stringify(request) + '\n';
}

/**
 * Decode a response from transport
 *
 * @param data - Raw data buffer
 * @returns Array of parsed responses
 */
export function decodeMessages(data: string): MCPResponse[] {
  const responses: MCPResponse[] = [];
  const lines = data.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    try {
      responses.push(parseResponse(line));
    } catch {
      // Skip malformed messages
    }
  }

  return responses;
}
