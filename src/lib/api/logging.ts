/**
 * API request logging helpers
 *
 * Keeps request logging consistent across API routes.
 */

import type { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import type { ResponseContext } from './response';

/**
 * Log the start of an API request with request_id for traceability.
 */
export function logRequestStart(ctx: ResponseContext, request: NextRequest): void {
  logger.info(
    {
      request_id: ctx.requestId,
      method: request.method,
      path: request.nextUrl.pathname,
    },
    'Request started'
  );
}

/**
 * Log a successful API request completion.
 */
export function logRequestEnd(ctx: ResponseContext, status: number): void {
  logger.info(
    {
      request_id: ctx.requestId,
      status,
      duration_ms: Date.now() - ctx.startTime,
    },
    'Request completed'
  );
}

/**
 * Log an API request failure.
 */
export function logRequestError(ctx: ResponseContext, error: unknown): void {
  logger.error(
    {
      request_id: ctx.requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    },
    'Request failed'
  );
}
