/**
 * File Read API Endpoint
 *
 * POST /api/v1/files/read
 *
 * Read file contents from the repository.
 * Based on PRD v1.4 Section 6.4.4
 */

import { NextRequest } from 'next/server';
import * as path from 'path';
import { z } from 'zod';
import { createResponseContext, successResponse, errorResponse } from '@/lib/api';
import { logRequestStart, logRequestEnd, logRequestError } from '@/lib/api/logging';
import { AppError } from '@/lib/errors';
import { ErrorCodes } from '@/lib/errors/codes';
import { validateRepoPath } from '@/lib/api/validation';
import { getMCPClient } from '@/lib/mcp/client';

// =============================================================================
// Request Validation
// =============================================================================

const FileReadRequestSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  repo_path: z.string().min(1, 'Repository path is required'),
  max_bytes: z.number().int().positive().max(10485760).optional().default(100000),
  encoding: z.enum(['utf-8', 'base64']).optional().default('utf-8'),
});

// =============================================================================
// Response Types
// =============================================================================

interface FileReadData {
  path: string;
  content: string;
  size: number;
  modified_at: string;
  encoding: string;
  truncated: boolean;
}

// =============================================================================
// Request Handler
// =============================================================================

/**
 * POST /api/v1/files/read
 *
 * Read file contents from the repository with size limits and encoding options.
 *
 * @param request - Next.js request with FileReadRequest body
 * @returns Stripe-style response with file content
 *
 * PRD Reference: Section 6.4.4
 *
 * @example
 * // Request:
 * POST /api/v1/files/read
 * {
 *   "path": "src/index.ts",
 *   "repo_path": "/Users/dev/project",
 *   "max_bytes": 100000,
 *   "encoding": "utf-8"
 * }
 *
 * // Response:
 * {
 *   "success": true,
 *   "data": {
 *     "path": "src/index.ts",
 *     "content": "export function main() { ... }",
 *     "size": 1234,
 *     "modified_at": "2026-01-11T10:00:00.000Z",
 *     "encoding": "utf-8",
 *     "truncated": false
 *   },
 *   "meta": { "request_id": "req_...", "timestamp": "..." }
 * }
 */
export async function POST(request: NextRequest) {
  const ctx = createResponseContext(request.headers);
  logRequestStart(ctx, request);

  try {
    // Parse and validate request body
    const body = await request.json();
    const parseResult = FileReadRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(
        ErrorCodes.INVALID_REQUEST,
        'Invalid request body',
        ctx,
        {
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            code: issue.code,
            message: issue.message,
          })),
        }
      );
    }

    const { path: filePath, repo_path: repoPath, max_bytes, encoding } = parseResult.data;
    const repoRoot = await validateRepoPath(repoPath);

    // Security: Validate path is within repo (avoid prefix bypasses like /repo vs /repo2)
    const fullPath = path.resolve(repoRoot, filePath);
    const relative = path.relative(repoRoot, fullPath);

    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      return errorResponse(
        ErrorCodes.ACCESS_DENIED,
        'Path traversal not allowed',
        ctx,
        { param: 'path' }
      );
    }

    const mcpClient = await getMCPClient(repoRoot);
    const result = await mcpClient.readFile({
      path: filePath,
      max_bytes,
      encoding,
    });

    const data: FileReadData = {
      path: result.path,
      content: result.content,
      size: result.size,
      modified_at: result.modified_at,
      encoding: result.encoding,
      truncated: result.truncated,
    };

    const response = successResponse(data, ctx);
    logRequestEnd(ctx, response.status);
    return response;
  } catch (error) {
    logRequestError(ctx, error);
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, ctx, {
        param: error.param,
        details: error.details,
      });
    }

    console.error('File read error:', error);

    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Internal server error',
      ctx
    );
  }
}
