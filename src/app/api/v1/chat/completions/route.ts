/**
 * Chat Completions API Endpoint
 *
 * POST /api/v1/chat/completions
 *
 * OpenAI-compatible chat completions with MCP tool support.
 * Implements SSE streaming with tool lifecycle events.
 *
 * Based on PRD v1.4 Section 6.4.1
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createResponseContext, successResponse, errorResponse } from '@/lib/api';
import { logRequestStart, logRequestEnd, logRequestError } from '@/lib/api/logging';
import { ErrorCodes } from '@/lib/errors/codes';
import { config } from '@/lib/config';
import {
  Orchestrator,
  createOrchestrator,
  type SSEEvent,
  type ChatMessage,
} from '@/lib/orchestrator';
import { AppError } from '@/lib/errors';
import { validateRepoPath } from '@/lib/api/validation';

// =============================================================================
// Request Validation
// =============================================================================

const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  name: z.string().optional(),
  tool_call_id: z.string().optional(),
});

const SettingsSchema = z.object({
  model: z.string().optional(),
  repo_path: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  tool_mode: z.enum(['auto', 'manual']).default('auto'),
});

const ChatRequestSchema = z
  .object({
    messages: z.array(MessageSchema).min(1),
    stream: z.boolean().default(true),
    settings: SettingsSchema.optional(),
    // Backward-compatible flat fields
    model: z.string().optional(),
    repo_path: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    tool_mode: z.enum(['auto', 'manual']).default('auto'),
  })
  .transform((data) => {
    const settings = data.settings ?? {
      model: data.model,
      repo_path: data.repo_path,
      temperature: data.temperature,
      max_tokens: data.max_tokens,
      tool_mode: data.tool_mode,
    };

    return {
      messages: data.messages,
      stream: data.stream,
      settings,
    };
  });

type ChatRequest = z.infer<typeof ChatRequestSchema>;

// =============================================================================
// SSE Event Formatting
// =============================================================================

/**
 * Format an SSE event for streaming
 * PRD Reference: Section 6.4.1.1
 */
function formatSSEEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Format a content chunk in OpenAI-compatible format.
 * We keep this shape so external clients can consume the stream directly.
 * The UI also listens for this and for custom tool events in the same stream.
 */
function formatContentChunk(
  chatId: string,
  model: string,
  created: number,
  content: string,
  finishReason: string | null = null
): string {
  const chunk = {
    id: chatId,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [
      {
        index: 0,
        delta: finishReason ? {} : { content },
        finish_reason: finishReason,
      },
    ],
  };
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

// =============================================================================
// Request Handler
// =============================================================================

function generateId(): string {
  return `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * POST /api/v1/chat/completions
 *
 * Send a chat message and receive a response with tool support.
 *
 * @param request - Next.js request with ChatRequest body
 * @returns SSE stream or JSON response based on stream parameter
 *
 * PRD Reference: Section 6.4.1
 */
export async function POST(request: NextRequest): Promise<Response> {
  const ctx = createResponseContext(request.headers);
  logRequestStart(ctx, request);

  try {
    // Parse and validate request body
    const body = await request.json();
    const parseResult = ChatRequestSchema.safeParse(body);

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

    const { messages, stream, settings } = parseResult.data;
    const {
      model,
      repo_path,
      temperature,
      max_tokens,
      tool_mode,
    } = settings;

    const modelName = model || config.ollamaDefaultModel;
    const normalizedRepoPath = repo_path ? await validateRepoPath(repo_path) : undefined;
    const chatId = generateId();
    const created = Math.floor(Date.now() / 1000);

    // Create orchestrator with configuration
    const orchestrator = createOrchestrator({
      model: modelName,
      repoPath: normalizedRepoPath,
      toolMode: tool_mode,
      temperature,
      maxTokens: max_tokens,
    });

    // Convert messages to orchestrator format
    const chatMessages: ChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
      name: m.name,
      tool_call_id: m.tool_call_id,
    }));

    if (stream) {
      // Streaming response via SSE
      const encoder = new TextEncoder();

      const responseStream = new ReadableStream({
        async start(controller) {
          try {
            await orchestrator.streamChat(chatMessages, (event: SSEEvent) => {
              if (event.type === 'content') {
                // Stream OpenAI-compatible chunk only (not both formats to avoid duplication)
                const chunk = formatContentChunk(
                  chatId,
                  modelName,
                  created,
                  event.delta
                );
                controller.enqueue(encoder.encode(chunk));
              } else if (event.type === 'tool_call') {
                // Emit tool call event in PRD format (custom event with type field).
                const sseData = formatSSEEvent(event);
                controller.enqueue(encoder.encode(sseData));
              } else if (event.type === 'done') {
                // Send final chunk with finish_reason for OpenAI compatibility.
                const finalChunk = formatContentChunk(
                  chatId,
                  modelName,
                  created,
                  '',
                  'stop'
                );
                controller.enqueue(encoder.encode(finalChunk));

                // Send usage stats
                const usageEvent = formatSSEEvent({
                  type: 'done',
                  usage: event.usage,
                });
                controller.enqueue(encoder.encode(usageEvent));

                // Send [DONE] marker
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
              } else if (event.type === 'error') {
                // Send error event
                const errorEvent = formatSSEEvent(event);
                controller.enqueue(encoder.encode(errorEvent));
                controller.close();
              }
            });
          } catch (error) {
            const errorEvent = formatSSEEvent({
              type: 'error',
              error: {
                code: 'stream_error',
                message:
                  error instanceof Error ? error.message : 'Unknown error',
              },
            });
            controller.enqueue(encoder.encode(errorEvent));
            controller.close();
          } finally {
            await orchestrator.cleanup();
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
    } else {
      // Non-streaming response
      try {
        const result = await orchestrator.chat(chatMessages);

        const response = {
          id: chatId,
          object: 'chat.completion',
          created,
          model: modelName,
          content: result.content,
          tool_calls: result.toolCalls.map((tc) => ({
            id: tc.id,
            name: tc.name,
            arguments: tc.arguments,
            result: tc.result,
            duration_ms: tc.duration_ms,
          })),
          usage: result.usage,
        };

        const apiResponse = successResponse(response, ctx);
        logRequestEnd(ctx, apiResponse.status);
        return apiResponse;
      } finally {
        await orchestrator.cleanup();
      }
    }
  } catch (error) {
    logRequestError(ctx, error);
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, ctx, {
        param: error.param,
        details: error.details,
      });
    }

    console.error('Chat completions error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    const isOllamaError =
      errorMessage.toLowerCase().includes('ollama') ||
      errorMessage.toLowerCase().includes('connection');

    return errorResponse(
      isOllamaError ? ErrorCodes.OLLAMA_UNAVAILABLE : ErrorCodes.INTERNAL_ERROR,
      errorMessage,
      ctx
    );
  }
}
