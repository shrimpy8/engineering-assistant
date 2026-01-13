/**
 * User-Friendly Error Messages
 *
 * Maps error codes to human-readable messages with actionable suggestions.
 * Each error includes title, message, suggestion, and optional recovery actions.
 *
 * Based on PRD v1.4 Section 8.2
 */

import { ErrorCode, ErrorCodes } from './codes';

/**
 * User-facing error information
 */
export interface UserFacingError {
  title: string;
  message: string;
  suggestion: string;
  action?: {
    label: string;
    type: 'open_settings' | 'retry' | 'local_doc' | 'external_link';
    url?: string;
    doc_id?: string;
  };
  steps?: string[];
}

/**
 * Error messages mapped by error code
 */
export const ErrorMessages: Record<ErrorCode, UserFacingError> = {
  // Validation Errors
  [ErrorCodes.INVALID_REQUEST]: {
    title: 'Invalid Request',
    message: 'The request could not be processed. Please check your input and try again.',
    suggestion: 'Review the request parameters for any formatting issues.',
  },

  [ErrorCodes.MISSING_PARAMETER]: {
    title: 'Missing Information',
    message: 'Some required information is missing from your request.',
    suggestion: 'Please provide all required fields and try again.',
  },

  [ErrorCodes.INVALID_PARAMETER]: {
    title: 'Invalid Value',
    message: 'One of the provided values is not valid.',
    suggestion: 'Check the field mentioned in the error and correct the value.',
  },

  [ErrorCodes.REPO_PATH_INVALID]: {
    title: 'Invalid Repository Path',
    message: 'The repository path format is invalid.',
    suggestion: 'Make sure the path is an absolute path to a valid directory.',
    action: {
      label: 'Open Settings',
      type: 'open_settings',
    },
  },

  [ErrorCodes.REPO_PATH_NOT_FOUND]: {
    title: 'Repository Not Found',
    message: 'The specified repository path does not exist on your system.',
    suggestion: 'Click the settings icon to update your repository path.',
    action: {
      label: 'Open Settings',
      type: 'open_settings',
    },
  },

  // File System Errors
  [ErrorCodes.FILE_NOT_FOUND]: {
    title: 'File Not Found',
    message: 'The requested file could not be found in the repository.',
    suggestion: 'The file may have been moved or deleted. Try searching for a similar filename.',
  },

  [ErrorCodes.DIRECTORY_NOT_FOUND]: {
    title: 'Directory Not Found',
    message: 'The specified directory does not exist.',
    suggestion: 'Check the path and make sure the directory exists.',
  },

  [ErrorCodes.ACCESS_DENIED]: {
    title: 'Access Denied',
    message: 'This file is outside the configured repository.',
    suggestion: 'For security, only files within your repository can be accessed.',
  },

  [ErrorCodes.FILE_TOO_LARGE]: {
    title: 'File Too Large',
    message: 'This file exceeds the maximum readable size.',
    suggestion: 'Try asking about a specific function or section instead of the entire file.',
  },

  [ErrorCodes.BINARY_FILE]: {
    title: 'Binary File',
    message: 'This file appears to be binary and cannot be read as text.',
    suggestion: 'Only text-based source files can be analyzed.',
  },

  // Search Errors
  [ErrorCodes.INVALID_PATTERN]: {
    title: 'Invalid Search Pattern',
    message: 'The search pattern contains invalid syntax.',
    suggestion: 'Check for any special characters that may need escaping.',
  },

  [ErrorCodes.SEARCH_TIMEOUT]: {
    title: 'Search Timed Out',
    message: 'The search took too long to complete.',
    suggestion: 'Try narrowing your search with a more specific pattern or file type.',
    action: {
      label: 'Try Again',
      type: 'retry',
    },
  },

  [ErrorCodes.NO_FILES_MATCHED]: {
    title: 'No Files Found',
    message: 'No files matched the specified pattern.',
    suggestion: 'Try broadening your search or checking the file pattern.',
  },

  // Ollama Errors
  [ErrorCodes.OLLAMA_UNAVAILABLE]: {
    title: 'Ollama Not Running',
    message: 'Cannot connect to the Ollama service.',
    suggestion: 'Make sure Ollama is installed and running.',
    action: {
      label: 'View Setup Guide',
      type: 'local_doc',
      doc_id: 'setup/ollama',
    },
    steps: [
      'Open Terminal',
      'Run: ollama serve',
      'Wait for "Listening on..." message',
      'Refresh this page',
    ],
  },

  [ErrorCodes.OLLAMA_MODEL_NOT_FOUND]: {
    title: 'Model Not Found',
    message: 'The selected model is not installed on your system.',
    suggestion: 'Pull the model or select a different one from the settings.',
    action: {
      label: 'Open Settings',
      type: 'open_settings',
    },
    steps: [
      'Open Terminal',
      'Run: ollama pull <model-name>',
      'Wait for download to complete',
      'Refresh this page',
    ],
  },

  [ErrorCodes.OLLAMA_TIMEOUT]: {
    title: 'Response Timeout',
    message: 'The model took too long to respond.',
    suggestion: 'The model may be processing a complex request. Try again or use a smaller model.',
    action: {
      label: 'Try Again',
      type: 'retry',
    },
  },

  // MCP Server Errors
  [ErrorCodes.MCP_SERVER_UNAVAILABLE]: {
    title: 'MCP Server Disconnected',
    message: 'The code analysis service is not responding.',
    suggestion: 'The MCP server may need to be restarted.',
    steps: [
      'Open Terminal in the project directory',
      'Run: npm run mcp:start',
      'Wait for "MCP server ready" message',
    ],
  },

  [ErrorCodes.MCP_TOOL_FAILED]: {
    title: 'Tool Failed',
    message: 'A code analysis tool encountered an error.',
    suggestion: 'Try your request again. If the problem persists, check the tool trace for details.',
    action: {
      label: 'Try Again',
      type: 'retry',
    },
  },

  // General Errors
  [ErrorCodes.INTERNAL_ERROR]: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred.',
    suggestion: 'Please try again. If the problem persists, check the console for details.',
    action: {
      label: 'Try Again',
      type: 'retry',
    },
  },

  // Stream Errors
  [ErrorCodes.STREAM_INTERRUPTED]: {
    title: 'Connection Lost',
    message: 'The response stream was interrupted.',
    suggestion: 'Your connection may have been temporarily lost. Try again.',
    action: {
      label: 'Try Again',
      type: 'retry',
    },
  },

  [ErrorCodes.STREAM_TIMEOUT]: {
    title: 'Stream Timeout',
    message: 'The response took too long to complete.',
    suggestion: 'The server may be under heavy load. Try again in a moment.',
    action: {
      label: 'Try Again',
      type: 'retry',
    },
  },
};

/**
 * Get user-facing error details for an error code
 */
export function getUserFacingError(code: ErrorCode): UserFacingError {
  return (
    ErrorMessages[code] || {
      title: 'Error',
      message: 'An error occurred.',
      suggestion: 'Please try again.',
    }
  );
}

/**
 * Get a user-friendly error message
 */
export function getErrorMessage(code: ErrorCode): string {
  const error = getUserFacingError(code);
  return error.message;
}

/**
 * Get recovery steps for an error
 */
export function getErrorSteps(code: ErrorCode): string[] | undefined {
  return ErrorMessages[code]?.steps;
}
