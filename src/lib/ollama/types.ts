/**
 * Ollama API Types
 *
 * Type definitions for Ollama API requests and responses.
 * Based on Ollama API documentation.
 */

/**
 * Available Ollama model
 */
export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

/**
 * List models response
 */
export interface OllamaListModelsResponse {
  models: OllamaModel[];
}

/**
 * Chat message
 */
export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Chat request options
 */
export interface OllamaChatOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  stop?: string[];
}

/**
 * Tool definition for function calling
 */
export interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Tool call in response
 */
export interface OllamaToolCall {
  function: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
}

/**
 * Chat request
 */
export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: OllamaChatOptions;
  tools?: OllamaTool[];
}

/**
 * Chat response (non-streaming)
 */
export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: 'assistant';
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Streaming chat response chunk
 */
export interface OllamaStreamChunk {
  model: string;
  created_at: string;
  message: {
    role: 'assistant';
    content: string;
  };
  done: boolean;
  // Present only when done is true
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Pull model request
 */
export interface OllamaPullRequest {
  name: string;
  stream?: boolean;
}

/**
 * Pull model progress
 */
export interface OllamaPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

/**
 * Health check status
 */
export interface OllamaHealthStatus {
  status: 'ok' | 'error';
  version?: string;
  error?: string;
}

/**
 * Token usage statistics
 */
export interface OllamaUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Calculate usage from Ollama response
 */
export function calculateUsage(response: OllamaChatResponse): OllamaUsage {
  const promptTokens = response.prompt_eval_count || 0;
  const completionTokens = response.eval_count || 0;

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
  };
}
