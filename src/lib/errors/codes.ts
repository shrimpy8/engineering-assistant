/**
 * Error Code Taxonomy
 *
 * Centralized error codes for consistent error handling.
 * All error codes follow lowercase_snake_case convention.
 *
 * Based on PRD v1.4 Section 8.1
 */

/**
 * Canonical error codes used across the API surface.
 */
export const ErrorCodes = {
  // Validation Errors (4xx)
  INVALID_REQUEST: 'invalid_request',
  MISSING_PARAMETER: 'missing_parameter',
  INVALID_PARAMETER: 'invalid_parameter',
  REPO_PATH_INVALID: 'repo_path_invalid',
  REPO_PATH_NOT_FOUND: 'repo_path_not_found',

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

  // Service Errors (5xx)
  OLLAMA_UNAVAILABLE: 'ollama_unavailable',
  OLLAMA_MODEL_NOT_FOUND: 'ollama_model_not_found',
  OLLAMA_TIMEOUT: 'ollama_timeout',
  MCP_SERVER_UNAVAILABLE: 'mcp_server_unavailable',
  MCP_TOOL_FAILED: 'mcp_tool_failed',
  INTERNAL_ERROR: 'internal_error',

  // Stream Errors
  STREAM_INTERRUPTED: 'stream_interrupted',
  STREAM_TIMEOUT: 'stream_timeout',
} as const;

/**
 * Error code type derived from ErrorCodes object
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Error type categories for API responses
 */
/**
 * Error type categories for API responses.
 */
export const ErrorTypes = {
  VALIDATION_ERROR: 'validation_error',
  NOT_FOUND_ERROR: 'not_found_error',
  SERVICE_ERROR: 'service_error',
  AUTHENTICATION_ERROR: 'authentication_error', // Reserved for future
  RATE_LIMIT_ERROR: 'rate_limit_error', // Reserved for future
} as const;

export type ErrorType = (typeof ErrorTypes)[keyof typeof ErrorTypes];

/**
 * Maps error codes to their HTTP status codes
 */
/**
 * Maps error codes to HTTP status codes.
 */
export const ErrorStatusCodes: Record<ErrorCode, number> = {
  // Validation errors -> 400
  [ErrorCodes.INVALID_REQUEST]: 400,
  [ErrorCodes.MISSING_PARAMETER]: 400,
  [ErrorCodes.INVALID_PARAMETER]: 400,
  [ErrorCodes.REPO_PATH_INVALID]: 400,

  // Not found errors -> 404
  [ErrorCodes.REPO_PATH_NOT_FOUND]: 404,
  [ErrorCodes.FILE_NOT_FOUND]: 404,
  [ErrorCodes.DIRECTORY_NOT_FOUND]: 404,
  [ErrorCodes.OLLAMA_MODEL_NOT_FOUND]: 404,

  // Access errors -> 403
  [ErrorCodes.ACCESS_DENIED]: 403,

  // Validation/Semantic errors -> 422
  [ErrorCodes.FILE_TOO_LARGE]: 422,
  [ErrorCodes.BINARY_FILE]: 422,
  [ErrorCodes.INVALID_PATTERN]: 422,
  [ErrorCodes.NO_FILES_MATCHED]: 422,

  // Timeout errors -> 408
  [ErrorCodes.SEARCH_TIMEOUT]: 408,
  [ErrorCodes.OLLAMA_TIMEOUT]: 408,
  [ErrorCodes.STREAM_TIMEOUT]: 408,

  // Service errors -> 502/503
  [ErrorCodes.OLLAMA_UNAVAILABLE]: 502,
  [ErrorCodes.MCP_SERVER_UNAVAILABLE]: 502,
  [ErrorCodes.MCP_TOOL_FAILED]: 502,

  // Internal errors -> 500
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.STREAM_INTERRUPTED]: 500,
};

/**
 * Maps error codes to their error types
 */
/**
 * Maps error codes to error types.
 */
export const ErrorCodeToType: Record<ErrorCode, ErrorType> = {
  // Validation errors
  [ErrorCodes.INVALID_REQUEST]: ErrorTypes.VALIDATION_ERROR,
  [ErrorCodes.MISSING_PARAMETER]: ErrorTypes.VALIDATION_ERROR,
  [ErrorCodes.INVALID_PARAMETER]: ErrorTypes.VALIDATION_ERROR,
  [ErrorCodes.REPO_PATH_INVALID]: ErrorTypes.VALIDATION_ERROR,
  [ErrorCodes.FILE_TOO_LARGE]: ErrorTypes.VALIDATION_ERROR,
  [ErrorCodes.BINARY_FILE]: ErrorTypes.VALIDATION_ERROR,
  [ErrorCodes.INVALID_PATTERN]: ErrorTypes.VALIDATION_ERROR,
  [ErrorCodes.NO_FILES_MATCHED]: ErrorTypes.VALIDATION_ERROR,

  // Not found errors
  [ErrorCodes.REPO_PATH_NOT_FOUND]: ErrorTypes.NOT_FOUND_ERROR,
  [ErrorCodes.FILE_NOT_FOUND]: ErrorTypes.NOT_FOUND_ERROR,
  [ErrorCodes.DIRECTORY_NOT_FOUND]: ErrorTypes.NOT_FOUND_ERROR,
  [ErrorCodes.OLLAMA_MODEL_NOT_FOUND]: ErrorTypes.NOT_FOUND_ERROR,
  [ErrorCodes.ACCESS_DENIED]: ErrorTypes.NOT_FOUND_ERROR, // Treated as not found for security

  // Service errors
  [ErrorCodes.OLLAMA_UNAVAILABLE]: ErrorTypes.SERVICE_ERROR,
  [ErrorCodes.OLLAMA_TIMEOUT]: ErrorTypes.SERVICE_ERROR,
  [ErrorCodes.MCP_SERVER_UNAVAILABLE]: ErrorTypes.SERVICE_ERROR,
  [ErrorCodes.MCP_TOOL_FAILED]: ErrorTypes.SERVICE_ERROR,
  [ErrorCodes.INTERNAL_ERROR]: ErrorTypes.SERVICE_ERROR,
  [ErrorCodes.SEARCH_TIMEOUT]: ErrorTypes.SERVICE_ERROR,
  [ErrorCodes.STREAM_INTERRUPTED]: ErrorTypes.SERVICE_ERROR,
  [ErrorCodes.STREAM_TIMEOUT]: ErrorTypes.SERVICE_ERROR,
};
