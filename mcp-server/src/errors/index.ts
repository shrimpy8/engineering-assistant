/**
 * MCP Server Error Classes
 *
 * Provides structured error handling for MCP tool operations.
 * Based on PRD v1.4 Section 8
 */

/**
 * Error codes for MCP operations
 */
export const MCPErrorCodes = {
  // File System Errors
  FILE_NOT_FOUND: 'file_not_found',
  DIRECTORY_NOT_FOUND: 'directory_not_found',
  ACCESS_DENIED: 'access_denied',
  FILE_TOO_LARGE: 'file_too_large',
  BINARY_FILE: 'binary_file',

  // Search Errors
  INVALID_PATTERN: 'invalid_pattern',
  SEARCH_TIMEOUT: 'search_timeout',
  NO_FILES_MATCHED: 'no_files_matched',

  // General Errors
  INVALID_ARGUMENTS: 'invalid_arguments',
  INTERNAL_ERROR: 'internal_error',
} as const;

export type MCPErrorCode = (typeof MCPErrorCodes)[keyof typeof MCPErrorCodes];

/**
 * Base MCP Error class
 */
export class MCPError extends Error {
  public readonly code: MCPErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: MCPErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.details = details;

    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * Convert to JSON-RPC error format
   */
  toRPCError(): { code: number; message: string; data?: Record<string, unknown> } {
    // Map error codes to JSON-RPC error codes
    const rpcCodeMap: Record<MCPErrorCode, number> = {
      [MCPErrorCodes.FILE_NOT_FOUND]: -32001,
      [MCPErrorCodes.DIRECTORY_NOT_FOUND]: -32001,
      [MCPErrorCodes.ACCESS_DENIED]: -32002,
      [MCPErrorCodes.FILE_TOO_LARGE]: -32003,
      [MCPErrorCodes.BINARY_FILE]: -32004,
      [MCPErrorCodes.INVALID_PATTERN]: -32005,
      [MCPErrorCodes.SEARCH_TIMEOUT]: -32006,
      [MCPErrorCodes.NO_FILES_MATCHED]: -32007,
      [MCPErrorCodes.INVALID_ARGUMENTS]: -32602, // Invalid params
      [MCPErrorCodes.INTERNAL_ERROR]: -32603, // Internal error
    };

    return {
      code: rpcCodeMap[this.code] || -32603,
      message: this.message,
      data: {
        error_code: this.code,
        ...this.details,
      },
    };
  }
}

/**
 * File not found error
 */
export class FileNotFoundError extends MCPError {
  constructor(path: string) {
    super(MCPErrorCodes.FILE_NOT_FOUND, `File not found: ${path}`, { path });
    this.name = 'FileNotFoundError';
  }
}

/**
 * Directory not found error
 */
export class DirectoryNotFoundError extends MCPError {
  constructor(path: string) {
    super(MCPErrorCodes.DIRECTORY_NOT_FOUND, `Directory not found: ${path}`, {
      path,
    });
    this.name = 'DirectoryNotFoundError';
  }
}

/**
 * Access denied error (path outside allowed root)
 */
export class AccessDeniedError extends MCPError {
  constructor(path: string, allowedRoot?: string) {
    super(
      MCPErrorCodes.ACCESS_DENIED,
      `Access denied: path "${path}" is outside the allowed directory`,
      { attempted_path: path, allowed_root: allowedRoot }
    );
    this.name = 'AccessDeniedError';
  }
}

/**
 * File too large error
 */
export class FileTooLargeError extends MCPError {
  constructor(path: string, size: number, maxSize: number) {
    super(
      MCPErrorCodes.FILE_TOO_LARGE,
      `File too large: ${path} (${size} bytes, max: ${maxSize} bytes)`,
      { path, size, max_size: maxSize }
    );
    this.name = 'FileTooLargeError';
  }
}

/**
 * Binary file error
 */
export class BinaryFileError extends MCPError {
  constructor(path: string) {
    super(MCPErrorCodes.BINARY_FILE, `Cannot read binary file as text: ${path}`, {
      path,
    });
    this.name = 'BinaryFileError';
  }
}

/**
 * Invalid pattern error
 */
export class InvalidPatternError extends MCPError {
  constructor(pattern: string, reason?: string) {
    super(
      MCPErrorCodes.INVALID_PATTERN,
      `Invalid pattern: ${pattern}${reason ? ` (${reason})` : ''}`,
      { pattern, reason }
    );
    this.name = 'InvalidPatternError';
  }
}

/**
 * Search timeout error
 */
export class SearchTimeoutError extends MCPError {
  constructor(timeoutMs: number) {
    super(
      MCPErrorCodes.SEARCH_TIMEOUT,
      `Search timed out after ${timeoutMs}ms`,
      { timeout_ms: timeoutMs }
    );
    this.name = 'SearchTimeoutError';
  }
}

/**
 * Check if an error is an MCPError
 */
export function isMCPError(error: unknown): error is MCPError {
  return error instanceof MCPError;
}

/**
 * Convert any error to MCPError
 */
export function toMCPError(error: unknown): MCPError {
  if (isMCPError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Handle Node.js file system errors
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === 'ENOENT') {
      return new MCPError(MCPErrorCodes.FILE_NOT_FOUND, nodeError.message, {
        path: nodeError.path,
      });
    }

    if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM') {
      return new MCPError(MCPErrorCodes.ACCESS_DENIED, nodeError.message, {
        path: nodeError.path,
      });
    }

    return new MCPError(MCPErrorCodes.INTERNAL_ERROR, error.message);
  }

  return new MCPError(MCPErrorCodes.INTERNAL_ERROR, String(error));
}
