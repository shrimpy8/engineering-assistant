/**
 * Error Handling Framework
 *
 * Provides consistent error classes and utilities for the application.
 * All errors are designed to be user-friendly with actionable messages.
 *
 * Based on PRD v1.4 Section 8
 */

import {
  type ErrorCode,
  ErrorCodes,
  type ErrorType,
  ErrorTypes,
  ErrorStatusCodes,
  ErrorCodeToType,
} from './codes';
import type { ErrorDetail, ApiErrorResponse } from '@/types/api';

export { ErrorCodes, ErrorTypes };
export type { ErrorCode, ErrorType, ErrorDetail, ApiErrorResponse };

/**
 * User-facing error action
 */
export interface ErrorAction {
  label: string;
  type: 'open_settings' | 'retry' | 'local_doc' | 'external_link';
  url?: string;
  doc_id?: string;
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly param?: string;
  public readonly details?: ErrorDetail[];
  public readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      param?: string;
      details?: ErrorDetail[];
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'AppError';
    this.code = code;
    this.type = ErrorCodeToType[code];
    this.statusCode = ErrorStatusCodes[code];
    this.param = options?.param;
    this.details = options?.details;
    this.context = options?.context;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * Convert to API error response format
   */
  toApiResponse(requestId: string): ApiErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        type: this.type,
        param: this.param,
        details: this.details,
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Validation error for invalid inputs
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    options?: {
      code?: ErrorCode;
      param?: string;
      details?: ErrorDetail[];
      context?: Record<string, unknown>;
    }
  ) {
    super(options?.code || ErrorCodes.INVALID_REQUEST, message, options);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      param?: string;
      context?: Record<string, unknown>;
    }
  ) {
    super(code, message, options);
    this.name = 'NotFoundError';
  }
}

/**
 * Service error for external service failures
 */
export class ServiceError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
    }
  ) {
    super(code, message, options);
    this.name = 'ServiceError';
  }
}

/**
 * Security error for access violations
 */
export class SecurityError extends AppError {
  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
    }
  ) {
    super(ErrorCodes.ACCESS_DENIED, message, options);
    this.name = 'SecurityError';
  }
}

/**
 * MCP-specific error for tool failures
 */
export class MCPError extends AppError {
  public readonly tool?: string;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      tool?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(code, message, options);
    this.name = 'MCPError';
    this.tool = options?.tool;
  }
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert any error to an AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(ErrorCodes.INTERNAL_ERROR, error.message, {
      cause: error,
    });
  }

  return new AppError(ErrorCodes.INTERNAL_ERROR, String(error));
}

/**
 * Create a standard API error response
 */
export function createErrorResponse(
  error: AppError | unknown,
  requestId: string
): ApiErrorResponse {
  const appError = toAppError(error);
  return appError.toApiResponse(requestId);
}
