'use client';

import { useState, useCallback, useRef } from 'react';
import type { Message, ChatSettings, SSEEvent, ToolTraceEvent, Usage } from '@/types';

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: { code: string; message: string } | null;
  usage: Usage | null;
  latencyMs: number | null;
  toolDurationMs: number | null;
  sendMessage: (content: string, settings: ChatSettings) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  cancelStream: () => void;
  toolTraceEvents: ToolTraceEvent[];
}

/**
 * Generate a unique ID for messages
 */
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Hook for managing chat state and streaming
 * Handles SSE streaming from the chat API
 */
export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [toolTraceEvents, setToolTraceEvents] = useState<ToolTraceEvent[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [toolDurationMs, setToolDurationMs] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestStartRef = useRef<number | null>(null);
  const firstTokenSeenRef = useRef(false);
  const toolDurationRef = useRef(0);

  const addToolTraceEvent = useCallback((event: ToolTraceEvent) => {
    setToolTraceEvents((prev) => {
      // Update existing event if same ID, otherwise add new
      const existingIndex = prev.findIndex((e) => e.id === event.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...event };
        return updated;
      }
      return [...prev, event];
    });
  }, []);

  const sendMessage = useCallback(async (content: string, settings: ChatSettings) => {
    if (!content.trim() || !settings.repo_path) {
      setError({
        code: 'missing_parameter',
        message: settings.repo_path ? 'Message cannot be empty' : 'Please configure a repository path first',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setLatencyMs(null);
    setToolDurationMs(null);
    requestStartRef.current = Date.now();
    firstTokenSeenRef.current = false;
    toolDurationRef.current = 0;

    // Add user message immediately
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Create placeholder for assistant message
    const assistantMessageId = generateId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      toolCalls: [],
    };

    setMessages((prev) => [...prev, assistantMessage]);

    // Clear tool trace for new message
    setToolTraceEvents([]);

    // Setup abort controller
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: content.trim() }].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          // PRD-compatible request shape
          settings: {
            model: settings.model,
            repo_path: settings.repo_path,
            temperature: settings.temperature,
            max_tokens: settings.max_tokens,
            tool_mode: settings.tool_mode,
          },
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Request failed');
      }

      setIsStreaming(true);
      setIsLoading(false);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data) as SSEEvent | {
                object?: string;
                choices?: Array<{ delta?: { content?: string } }>;
              };

              // The server emits two shapes:
              // 1) OpenAI-compatible chunks: { object: "chat.completion.chunk", choices: [{ delta: { content } }] }
              // 2) Custom SSE events with a "type" field (tool_call, done, error).
              if (parsed && typeof parsed === 'object' && 'object' in parsed) {
                const contentDelta = parsed.choices?.[0]?.delta?.content;
                if (contentDelta) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: msg.content + contentDelta }
                        : msg
                    )
                  );
                }
                continue;
              }

              const event = parsed as SSEEvent;
              switch (event.type) {
                case 'content':
                  if (!firstTokenSeenRef.current && requestStartRef.current) {
                    firstTokenSeenRef.current = true;
                    setLatencyMs(Date.now() - requestStartRef.current);
                  }
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: msg.content + event.delta }
                        : msg
                    )
                  );
                  break;

                case 'tool_call':
                  const toolEvent: ToolTraceEvent = {
                    id: event.id,
                    timestamp: event.timestamp,
                    tool: event.name,
                    status: event.status,
                    arguments: event.arguments,
                    result: event.result,
                    error: event.error,
                    duration_ms: event.duration_ms,
                  };
                  addToolTraceEvent(toolEvent);
                  if (event.duration_ms) {
                    toolDurationRef.current += event.duration_ms;
                    setToolDurationMs(toolDurationRef.current);
                  }

                  // Also update the message's toolCalls
                  setMessages((prev) =>
                    prev.map((msg) => {
                      if (msg.id === assistantMessageId) {
                        const existingCalls = msg.toolCalls || [];
                        const existingIndex = existingCalls.findIndex((tc) => tc.id === event.id);

                        const toolCallInfo = {
                          id: event.id,
                          name: event.name,
                          arguments: event.arguments || {},
                          status: event.status,
                          result: event.result,
                          error: event.error,
                          duration_ms: event.duration_ms,
                          timestamp: event.timestamp,
                        };

                        if (existingIndex >= 0) {
                          const updatedCalls = [...existingCalls];
                          updatedCalls[existingIndex] = { ...updatedCalls[existingIndex], ...toolCallInfo };
                          return { ...msg, toolCalls: updatedCalls };
                        }
                        return { ...msg, toolCalls: [...existingCalls, toolCallInfo] };
                      }
                      return msg;
                    })
                  );
                  break;

                case 'done':
                  setUsage(event.usage);
                  break;

                case 'error':
                  setError(event.error);
                  break;
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Stream was cancelled by user
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError({ code: 'stream_error', message: errorMessage });

      // Remove the empty assistant message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [messages, addToolTraceEvent]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setToolTraceEvents([]);
    setError(null);
    setUsage(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    usage,
    latencyMs,
    toolDurationMs,
    sendMessage,
    clearMessages,
    clearError,
    cancelStream,
    toolTraceEvents,
  };
}
