'use client';

/**
 * Typing indicator with three animated dots
 * Shown while waiting for first token
 */
export function TypingIndicator() {
  return (
    <div
      data-testid="typing-indicator"
      className="flex items-center gap-1 p-3"
      aria-label="Assistant is typing"
    >
      <span className="text-sm text-[var(--color-text-secondary)] mr-2">
        Thinking
      </span>
      <div className="flex gap-1">
        <span
          className="w-2 h-2 bg-[var(--color-text-tertiary)] rounded-full animate-bounce"
          style={{ animationDelay: '0ms', animationDuration: '600ms' }}
        />
        <span
          className="w-2 h-2 bg-[var(--color-text-tertiary)] rounded-full animate-bounce"
          style={{ animationDelay: '150ms', animationDuration: '600ms' }}
        />
        <span
          className="w-2 h-2 bg-[var(--color-text-tertiary)] rounded-full animate-bounce"
          style={{ animationDelay: '300ms', animationDuration: '600ms' }}
        />
      </div>
    </div>
  );
}
