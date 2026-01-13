/**
 * Prompt Transparency API Endpoint
 *
 * GET /api/v1/prompt
 *
 * Returns the system prompt for the current settings.
 */

import { NextRequest } from 'next/server';
import { createResponseContext, successResponse, errorResponse } from '@/lib/api';
import { logRequestStart, logRequestEnd, logRequestError } from '@/lib/api/logging';
import { validateRepoPath } from '@/lib/api/validation';
import { createPromptBuilder } from '@/lib/orchestrator';
import { ErrorCodes } from '@/lib/errors/codes';
import { AppError } from '@/lib/errors';

/**
 * GET /api/v1/prompt
 *
 * Return the current system prompt for transparency.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const ctx = createResponseContext(request.headers);
  logRequestStart(ctx, request);

  try {
    const searchParams = request.nextUrl.searchParams;
    const repoPath = searchParams.get('repo_path') || undefined;
    const toolMode = (searchParams.get('tool_mode') as 'auto' | 'manual') || 'auto';

    const normalizedRepoPath = repoPath ? await validateRepoPath(repoPath) : undefined;
    const promptBuilder = createPromptBuilder({
      repoPath: normalizedRepoPath,
      toolMode,
    });

    const data = { prompt: promptBuilder.buildSystemPrompt() };
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

    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to build prompt',
      ctx
    );
  }
}
