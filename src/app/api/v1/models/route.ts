/**
 * Models API Endpoint
 *
 * GET /api/v1/models
 *
 * Returns available Ollama models in Stripe-style format.
 * Based on PRD v1.4 Section 6.4.3
 */

import { NextRequest } from 'next/server';
import { OllamaClient } from '@/lib/ollama/client';
import { config } from '@/lib/config';
import { createResponseContext, successResponse, errorResponse } from '@/lib/api';
import { logRequestStart, logRequestEnd, logRequestError } from '@/lib/api/logging';
import { ErrorCodes } from '@/lib/errors/codes';
import type { Model, ModelsData } from '@/types/api';

/**
 * GET /api/v1/models
 *
 * Lists all available Ollama models with their metadata.
 *
 * @param request - Next.js request object
 * @returns Stripe-style response with models array
 *
 * @example
 * // Response:
 * {
 *   "success": true,
 *   "data": {
 *     "models": [{ "name": "llama3.1:8b", "size": 4661224448, ... }]
 *   },
 *   "meta": { "request_id": "req_...", "timestamp": "..." }
 * }
 */
export async function GET(request: NextRequest) {
  const ctx = createResponseContext(request.headers);
  logRequestStart(ctx, request);

  try {
    const ollama = new OllamaClient({ baseUrl: config.ollamaBaseUrl });
    const ollamaModels = await ollama.listModels();

    const models: Model[] = ollamaModels.map((model) => ({
      name: model.name,
      size: model.size || 0,
      modified_at: model.modified_at,
      digest: model.digest || '',
    }));

    const data: ModelsData = { models };
    const response = successResponse(data, ctx);
    logRequestEnd(ctx, response.status);
    return response;
  } catch (error) {
    logRequestError(ctx, error);
    return errorResponse(
      ErrorCodes.OLLAMA_UNAVAILABLE,
      error instanceof Error ? error.message : 'Failed to fetch models',
      ctx
    );
  }
}
