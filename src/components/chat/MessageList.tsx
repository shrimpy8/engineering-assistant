'use client';

import { useRef, useEffect } from 'react';
import type { Message } from '@/types';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

export interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  isStreaming?: boolean;
}

/**
 * Scrollable message list with auto-scroll
 */
export function MessageList({ messages, isLoading, isStreaming }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-lg">
          {/* Gradient icon background */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-purple-600 flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/20">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
            Explore Your Codebase
          </h3>
          <p className="text-base text-[var(--color-text-secondary)] mb-2">
            Your <span className="text-[var(--color-accent)] font-medium">private</span>, <span className="text-green-500 font-medium">local-first</span> AI assistant for understanding code.
          </p>
          <p className="text-sm text-[var(--color-text-tertiary)] mb-6">
            Ask questions about structure, dependencies, or how things work — all processed locally with Ollama.
          </p>
          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium">
              🔍 Search Files
            </span>
            <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 font-medium">
              📖 Read Code
            </span>
            <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 font-medium">
              🔒 100% Local
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Show typing indicator when loading but not streaming */}
      {isLoading && !isStreaming && <TypingIndicator />}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
