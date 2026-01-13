'use client';

import { memo, useState } from 'react';
import type { Message } from '@/types';
import { CopyButton } from '@/components/ui';

export interface MessageBubbleProps {
  message: Message;
}

/**
 * Message bubble component
 * User messages: right-aligned with background
 * Assistant messages: left-aligned with border
 * Based on PRD v1.4 Section 4.2.4
 */
export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [showActions, setShowActions] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  // Format timestamp
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Build copy text for "Copy answer + sources" feature
  const buildCopyText = () => {
    let text = message.content;
    if (message.toolCalls && message.toolCalls.length > 0) {
      text += '\n\n---\nSources:\n';
      message.toolCalls.forEach((tc) => {
        if (tc.name === 'read_file' && tc.arguments?.path) {
          text += `- ${tc.arguments.path}\n`;
        } else if (tc.name === 'search_files' && tc.arguments?.pattern) {
          text += `- Search: "${tc.arguments.pattern}"\n`;
        } else if (tc.name === 'list_files' && tc.arguments?.directory) {
          text += `- Directory: ${tc.arguments.directory}\n`;
        } else {
          text += `- ${tc.name}\n`;
        }
      });
    }
    return text;
  };

  return (
    <div
      data-testid={`message-${message.role}`}
      className={`
        flex flex-col gap-1 animate-slide-in-up
        ${isUser ? 'items-end' : 'items-start'}
      `.trim()}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={`
          relative group
          ${isUser
            ? 'bg-[var(--color-bg-tertiary)] rounded-[16px_16px_4px_16px] px-4 py-3 max-w-[80%]'
            : 'border-l-2 border-[var(--color-border)] pl-4 max-w-full'
          }
        `.trim()}
      >
        {/* Message content */}
        <div className="text-[var(--color-text-primary)] whitespace-pre-wrap break-words">
          {message.content || (
            <span className="text-[var(--color-text-tertiary)] italic">
              {message.toolCalls && message.toolCalls.length > 0
                ? 'Analyzing...'
                : ''}
            </span>
          )}
        </div>

        {/* Tool calls summary (if any) */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text-tertiary)]">
                Used {message.toolCalls.length} tool
                {message.toolCalls.length !== 1 ? 's' : ''}: {' '}
                {message.toolCalls.map((tc) => tc.name).join(', ')}
              </span>
              {!isUser && (
                <button
                  onClick={() => setShowWhy((prev) => !prev)}
                  className="text-xs text-[var(--color-accent)] hover:underline"
                >
                  {showWhy ? 'Hide' : 'Why this result?'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Why this result panel */}
        {showWhy && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">
              This answer used:
            </p>
            <ul className="text-xs font-medium text-[var(--color-text-secondary)] space-y-1">
              {message.toolCalls.map((tc) => (
                <li key={tc.id}>
                  <span className="font-mono">{tc.name}</span>
                  {tc.arguments && (
                    <span className="text-[var(--color-text-tertiary)]">
                      {' '}— {JSON.stringify(tc.arguments)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Copy button for assistant messages */}
        {!isUser && message.content && (
          <div
            className={`
              absolute -top-1 -right-1 transition-opacity duration-200
              ${showActions ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <CopyButton
              text={buildCopyText()}
              label={message.toolCalls && message.toolCalls.length > 0 ? 'Copy + Sources' : 'Copy'}
            />
          </div>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-xs font-medium text-[var(--color-text-tertiary)] px-1">
        {time}
      </span>
    </div>
  );
});
