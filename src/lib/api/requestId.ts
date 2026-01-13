/**
 * Request ID Generation
 *
 * Generates unique request IDs for API tracing.
 * Based on PRD v1.4 Section 6.2.2
 */

import { randomUUID } from 'crypto';

/**
 * Generate a unique request ID
 * Format: req_<32-char-uuid>
 */
export function generateRequestId(): string {
  return `req_${randomUUID().replace(/-/g, '')}`;
}

/**
 * Extract request ID from headers or generate a new one
 */
export function extractRequestId(headers: Headers): string {
  return headers.get('X-Request-ID') || generateRequestId();
}
