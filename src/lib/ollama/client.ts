/**
 * Ollama HTTP Client
 *
 * Handles communication with the local Ollama server.
 * Supports both streaming and non-streaming chat completions.
 *
 * Based on PRD v1.4 Section 5.1
 */

import { createModuleLogger } from '../logger';
import { AppError, ErrorCodes } from '../errors';
import { normalizeOllamaError } from '../errors/handlers';
import type {
  OllamaModel,
  OllamaListModelsResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaStreamChunk,
  OllamaHealthStatus,
  OllamaPullProgress,
} from './types';

const log = createModuleLogger('ollama-client');

/**
 * Ollama client configuration
 */
interface OllamaClientConfig {
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

/**
 * Default configuration loaded from environment
 */
function getDefaultConfig(): OllamaClientConfig {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS || '60000', 10),
    maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES || '3', 10),
  };
}

/**
 * Ollama API client
 */
export class OllamaClient {
  private readonly config: OllamaClientConfig;

  constructor(config?: Partial<OllamaClientConfig>) {
    this.config = { ...getDefaultConfig(), ...config };
  }

  /**
   * Make a request to the Ollama API
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs
    );

    try {
      log.debug({ url, method: options?.method || 'GET' }, 'Ollama request');

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error (${response.status}): ${errorText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AppError(
          ErrorCodes.OLLAMA_TIMEOUT,
          'Ollama request timed out'
        );
      }

      throw normalizeOllamaError(error);
    }
  }

  /**
   * Check if Ollama is running and healthy
   */
  async health(): Promise<OllamaHealthStatus> {
    try {
      // Ollama doesn't have a dedicated health endpoint, so we use /api/tags
      await this.request<OllamaListModelsResponse>('/api/tags');
      return { status: 'ok' };
    } catch (error) {
      const appError = normalizeOllamaError(error);
      return {
        status: 'error',
        error: appError.message,
      };
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    const response = await this.request<OllamaListModelsResponse>('/api/tags');
    return response.models || [];
  }

  /**
   * Check if a specific model is available
   */
  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some(
      (m) => m.name === modelName || m.name === `${modelName}:latest`
    );
  }

  /**
   * Send a chat completion request (non-streaming)
   * Supports function calling via the tools parameter
   */
  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    log.info({ model: request.model, hasTools: !!request.tools }, 'Sending chat request');

    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      stream: false,
      options: request.options,
    };

    // Add tools if provided (for function calling)
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
    }

    const response = await this.request<OllamaChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    log.info(
      {
        model: request.model,
        prompt_tokens: response.prompt_eval_count,
        completion_tokens: response.eval_count,
        hasToolCalls: !!response.message?.tool_calls?.length,
      },
      'Chat completed'
    );

    return response;
  }

  /**
   * Send a streaming chat completion request
   * Returns an async iterator of chunks
   */
  async *chatStream(
    request: OllamaChatRequest
  ): AsyncGenerator<OllamaStreamChunk> {
    const url = `${this.config.baseUrl}/api/chat`;
    const controller = new AbortController();

    log.info({ model: request.model }, 'Starting streaming chat');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error (${response.status}): ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line) as OllamaStreamChunk;
              yield chunk;

              if (chunk.done) {
                log.info(
                  {
                    model: request.model,
                    prompt_tokens: chunk.prompt_eval_count,
                    completion_tokens: chunk.eval_count,
                  },
                  'Streaming chat completed'
                );
              }
            } catch (parseError) {
              log.warn({ line }, 'Failed to parse chunk');
            }
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        try {
          const chunk = JSON.parse(buffer) as OllamaStreamChunk;
          yield chunk;
        } catch {
          // Ignore parse errors for incomplete data
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AppError(
          ErrorCodes.STREAM_INTERRUPTED,
          'Stream was interrupted'
        );
      }
      throw normalizeOllamaError(error);
    }
  }

  /**
   * Pull a model from Ollama registry
   * Returns an async iterator of progress updates
   */
  async *pullModel(modelName: string): AsyncGenerator<OllamaPullProgress> {
    const url = `${this.config.baseUrl}/api/pull`;

    log.info({ model: modelName }, 'Pulling model');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to pull model: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const progress = JSON.parse(line) as OllamaPullProgress;
              yield progress;
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      log.info({ model: modelName }, 'Model pull completed');
    } catch (error) {
      throw normalizeOllamaError(error);
    }
  }
}

/**
 * Singleton client instance
 */
export const ollamaClient = new OllamaClient();

/**
 * Default singleton client export for convenience.
 */
export default ollamaClient;
