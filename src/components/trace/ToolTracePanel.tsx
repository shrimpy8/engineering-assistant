'use client';

import type { ToolTraceEvent } from '@/types';
import { ToolTraceItem } from './ToolTraceItem';

export interface ToolTracePanelProps {
  events: ToolTraceEvent[];
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Tool Trace Panel
 * Right sidebar showing all MCP tool calls
 * Position: 280px width, border-left
 * Based on PRD v1.4 Section 4.2.4
 */
export function ToolTracePanel({ events, isOpen = true, onClose }: ToolTracePanelProps) {
  if (!isOpen) return null;

  return (
    <aside
      className={`
        w-[280px] flex-shrink-0
        bg-[var(--color-bg-secondary)]
        border-l border-[var(--color-border)]
        flex flex-col
        animate-slide-in-right
      `.trim()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Tool Activity
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] transition-colors"
            aria-label="Close panel"
          >
            <svg
              className="w-4 h-4 text-[var(--color-text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {events.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
              <svg
                className="w-6 h-6 text-[var(--color-text-tertiary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-sm text-[var(--color-text-tertiary)]">
              No tool activity yet
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              Tool calls will appear here
            </p>
          </div>
        ) : (
          events.map((event) => (
            <ToolTraceItem key={event.id} event={event} />
          ))
        )}
      </div>

      {/* Footer with count */}
      {events.length > 0 && (
        <div className="p-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-tertiary)]">
          {events.length} tool call{events.length !== 1 ? 's' : ''}
        </div>
      )}
    </aside>
  );
}
