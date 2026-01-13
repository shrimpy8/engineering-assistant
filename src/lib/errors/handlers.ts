/**
 * Error Handlers
 *
 * Utilities for normalizing and handling errors in API routes.
 * Ensures consistent error responses across all endpoints.
 *
 * Based on PRD v1.4 Section 8.4
 */

import { NextResponse } from 'next/server';
import {
  AppError,
  isAppError,
  toAppError,
  ErrorCodes,
} from './index';
import { createModuleLogger } from '../logger';
import type { ResponseMeta, ApiErrorResponse } from '@/types/api';

const log = createModuleLogger('error-handler');

/**
 * Creates standard response metadata
 */
export function createResponseMeta(
  requestId: string,
  startTime?: number
): ResponseMeta {
  return {
    request_id: requestId,
    timestamp: new Date().toISOString(),
    ...(startTime && { duration_ms: Date.now() - startTime }),
  };
}

/**
 * Creates a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  requestId: string,
  startTime?: number
): { success: true; data: T; meta: ResponseMeta } {
  return {
    success: true,
    data,
    meta: createResponseMeta(requestId, startTime),
  };
}

/**
 * Handles an error and returns a NextResponse with appropriate status
 */
export function handleError(
  error: unknown,
  requestId: string,
  startTime?: number
): NextResponse<ApiErrorResponse> {
  const appError = toAppError(error);

  // Log the error
  log.error({
    msg: 'Error handled',
    request_id: requestId,
    error_code: appError.code,
    error_message: appError.message,
    ...(appError.param && { param: appError.param }),
    ...(startTime && { duration_ms: Date.now() - startTime }),
  });

  const response = appError.toApiResponse(requestId);

  return NextResponse.json(response, {
    status: appError.statusCode,
    headers: {
      'X-Request-ID': requestId,
    },
  });
}

/**
 * Error normalization for external service errors
 */
export function normalizeOllamaError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  const err = error as Error & { code?: string; cause?: { code?: string } };
  const message = err.message || 'Unknown Ollama error';

  // Connection errors
  if (
    err.code === 'ECONNREFUSED' ||
    err.cause?.code === 'ECONNREFUSED' ||
    message.includes('ECONNREFUSED')
  ) {
    return new AppError(
      ErrorCodes.OLLAMA_UNAVAILABLE,
      'Cannot connect to Ollama. Make sure Ollama is running.',
      { cause: err instanceof Error ? err : undefined }
    );
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return new AppError(
      ErrorCodes.OLLAMA_TIMEOUT,
      'Ollama request timed out. The model may be processing a complex request.',
      { cause: err instanceof Error ? err : undefined }
    );
  }

  // Model not found
  if (message.includes('model') && message.includes('not found')) {
    return new AppError(
      ErrorCodes.OLLAMA_MODEL_NOT_FOUND,
      'The requested model is not installed.',
      { cause: err instanceof Error ? err : undefined }
    );
  }

  return new AppError(ErrorCodes.INTERNAL_ERROR, message, {
    cause: err instanceof Error ? err : undefined,
  });
}

/**
 * Error normalization for MCP errors
 */
export function normalizeMCPError(error: unknown, tool?: string): AppError {
  if (isAppError(error)) {
    return error;
  }

  const err = error as Error & { code?: string };
  const message = err.message || 'Unknown MCP error';

  // Connection errors
  if (err.code === 'ECONNREFUSED' || message.includes('ECONNREFUSED')) {
    return new AppError(
      ErrorCodes.MCP_SERVER_UNAVAILABLE,
      'Cannot connect to MCP server. Make sure the server is running.',
      {
        cause: err instanceof Error ? err : undefined,
        context: { tool },
      }
    );
  }

  // File not found
  if (message.includes('ENOENT') || message.includes('not found')) {
    return new AppError(ErrorCodes.FILE_NOT_FOUND, 'File or directory not found.', {
      cause: err instanceof Error ? err : undefined,
      context: { tool },
    });
  }

  // Access denied
  if (message.includes('EACCES') || message.includes('access denied')) {
    return new AppError(
      ErrorCodes.ACCESS_DENIED,
      'Access denied. Path may be outside the allowed directory.',
      {
        cause: err instanceof Error ? err : undefined,
        context: { tool },
      }
    );
  }

  return new AppError(ErrorCodes.MCP_TOOL_FAILED, `Tool failed: ${message}`, {
    cause: err instanceof Error ? err : undefined,
    context: { tool },
  });
}

/**
 * Extracts error message for logging
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Type guard for fetch Response errors
 */
export function isFetchError(error: unknown): error is TypeError {
  return error instanceof TypeError && error.message.includes('fetch');
}
