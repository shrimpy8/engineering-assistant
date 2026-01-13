'use client';

import { useState, useRef, useEffect, KeyboardEvent, FormEvent } from 'react';
import { Button } from '@/components/ui';

export interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

/**
 * Chat input component with auto-expand and keyboard handling
 * Height: 48px (single line), auto-expand to max 200px
 * Based on PRD v1.4 Section 4.2.4
 */
export function ChatInput({
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = 'Ask about your codebase...',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '48px';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (value.trim() && !disabled && !isLoading) {
      onSend(value.trim());
      setValue('');
      // Reset height after clearing
      if (textareaRef.current) {
        textareaRef.current.style.height = '48px';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, newline on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          data-testid="chat-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          placeholder={placeholder}
          rows={1}
          className={`
            w-full min-h-[48px] max-h-[200px] px-4 py-3
            bg-[var(--color-bg-primary)]
            border border-[var(--color-border)]
            rounded-[var(--radius-md)]
            text-[var(--color-text-primary)]
            placeholder:text-[var(--color-text-tertiary)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-shadow duration-[var(--duration-fast)]
            resize-none overflow-y-auto
          `.replace(/\s+/g, ' ').trim()}
        />
      </div>
      <Button
        type="submit"
        data-testid="send-button"
        disabled={!value.trim() || disabled}
        loading={isLoading}
        className="h-12 px-6"
      >
        {isLoading ? (
          'Sending...'
        ) : (
          <span className="flex items-center gap-2">
            Send
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </span>
        )}
      </Button>
    </form>
  );
}
