/**
 * Chat Types - Domain types for chat functionality
 * Based on PRD v1.4 Section 6.4.1
 */

/**
 * Chat message role
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Chat message structure
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  toolCalls?: ToolCallInfo[];
}

/**
 * Tool call information attached to messages
 */
export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: 'started' | 'completed' | 'error';
  result?: unknown;
  error?: { code: string; message: string };
  duration_ms?: number;
  timestamp: string;
}

/**
 * Chat settings for API requests
 */
export interface ChatSettings {
  model: string;
  repo_path: string;
  temperature?: number;
  max_tokens?: number;
  tool_mode?: 'auto' | 'manual';
}

/**
 * Chat completion request body
 */
export interface ChatCompletionRequest {
  messages: { role: MessageRole; content: string }[];
  settings: ChatSettings;
  stream?: boolean;
}

/**
 * Usage statistics
 */
export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * SSE event types from the streaming API
 */
export type SSEEventType = 'content' | 'tool_call' | 'done' | 'error';

/**
 * SSE content event
 */
export interface SSEContentEvent {
  type: 'content';
  delta: string;
}

/**
 * SSE tool call event
 */
export interface SSEToolCallEvent {
  type: 'tool_call';
  id: string;
  name: string;
  arguments?: Record<string, unknown>;
  status: 'started' | 'completed' | 'error';
  result?: unknown;
  error?: { code: string; message: string };
  timestamp: string;
  duration_ms?: number;
}

/**
 * SSE done event
 */
export interface SSEDoneEvent {
  type: 'done';
  usage: Usage;
}

/**
 * SSE error event
 */
export interface SSEErrorEvent {
  type: 'error';
  error: { code: string; message: string };
}

/**
 * Union type for all SSE events
 */
export type SSEEvent = SSEContentEvent | SSEToolCallEvent | SSEDoneEvent | SSEErrorEvent;

/**
 * Chat state for the useChat hook
 */
export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: { code: string; message: string } | null;
  usage: Usage | null;
}

/**
 * Default chat settings
 */
export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  model: 'llama3.1:8b',
  repo_path: '',
  temperature: 0.3,
  max_tokens: 2048,
  tool_mode: 'auto',
};
