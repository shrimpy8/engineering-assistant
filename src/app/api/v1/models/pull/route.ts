/**
 * Model Pull API Endpoint
 *
 * POST /api/v1/models/pull
 *
 * Proxies Ollama model pull progress as SSE.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createResponseContext, errorResponse } from '@/lib/api';
import { logRequestStart, logRequestEnd, logRequestError } from '@/lib/api/logging';
import { ErrorCodes } from '@/lib/errors/codes';
import { ollamaClient } from '@/lib/ollama/client';

const PullRequestSchema = z.object({
  model: z.string().min(1),
});

/**
 * POST /api/v1/models/pull
 *
 * Stream Ollama pull progress for a model.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const ctx = createResponseContext(request.headers);
  logRequestStart(ctx, request);

  try {
    const body = await request.json();
    const parseResult = PullRequestSchema.safeParse(body);

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

    const { model } = parseResult.data;
    const encoder = new TextEncoder();

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const progress of ollamaClient.pullModel(model)) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
            );
          }

          controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: {
                  code: 'ollama_unavailable',
                  message: error instanceof Error ? error.message : 'Unknown error',
                },
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    const response = new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Request-ID': ctx.requestId,
      },
    });

    logRequestEnd(ctx, 200);
    return response;
  } catch (error) {
    logRequestError(ctx, error);
    return errorResponse(
      ErrorCodes.OLLAMA_UNAVAILABLE,
      error instanceof Error ? error.message : 'Failed to pull model',
      ctx
    );
  }
}
