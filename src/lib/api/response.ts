/**
 * API Response Helpers
 *
 * Provides consistent Stripe-style response formatting.
 * Based on PRD v1.4 Section 6.3
 */

import { NextResponse } from 'next/server';
import { generateRequestId, extractRequestId } from './requestId';
import { ErrorCode, ErrorCodeToType, ErrorStatusCodes } from '@/lib/errors/codes';
import type {
  ResponseMeta,
  ApiResponse,
  ApiError,
  ApiErrorResponse,
} from '@/types/api';

// Re-export types for convenience
export type { ResponseMeta, ApiResponse, ApiError, ApiErrorResponse };

/**
 * Context for building responses (tracks timing)
 */
export interface ResponseContext {
  requestId: string;
  startTime: number;
}

/**
 * Create a response context (call at start of request handler)
 */
export function createResponseContext(headers?: Headers): ResponseContext {
  return {
    requestId: headers ? extractRequestId(headers) : generateRequestId(),
    startTime: Date.now(),
  };
}

/**
 * Build successful API response
 */
export function successResponse<T>(
  data: T,
  ctx: ResponseContext,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      request_id: ctx.requestId,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - ctx.startTime,
    },
  };

  return NextResponse.json(response, {
    status,
    headers: {
      'X-Request-ID': ctx.requestId,
    },
  });
}

/**
 * Build error API response
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  ctx: ResponseContext,
  options?: {
    param?: string;
    details?: ApiError['details'];
    doc_url?: ApiError['doc_url'];
    statusOverride?: number;
  }
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      type: ErrorCodeToType[code],
      param: options?.param,
      details: options?.details,
      doc_url: options?.doc_url ?? 'docs/API.md#error-handling',
    },
    meta: {
      request_id: ctx.requestId,
      timestamp: new Date().toISOString(),
    },
  };

  const status = options?.statusOverride ?? ErrorStatusCodes[code] ?? 500;

  return NextResponse.json(response, {
    status,
    headers: {
      'X-Request-ID': ctx.requestId,
    },
  });
}
