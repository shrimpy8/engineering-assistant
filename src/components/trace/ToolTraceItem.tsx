'use client';

import { useState } from 'react';
import type { ToolTraceEvent } from '@/types';
import { Spinner } from '@/components/ui';

export interface ToolTraceItemProps {
  event: ToolTraceEvent;
}

/**
 * Tool icon based on tool name
 */
function ToolIcon({ tool }: { tool: string }) {
  const iconClass = 'w-4 h-4 text-[var(--color-text-secondary)]';

  switch (tool) {
    case 'list_files':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    case 'read_file':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'search_files':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case 'get_repo_overview':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
  }
}

/**
 * Status indicator
 */
function StatusIndicator({ status }: { status: ToolTraceEvent['status'] }) {
  if (status === 'started') {
    return <Spinner size="sm" />;
  }

  if (status === 'completed') {
    return (
      <div className="w-4 h-4 rounded-full bg-[var(--color-success)] flex items-center justify-center">
        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }

  // Error status
  return (
    <div className="w-4 h-4 rounded-full bg-[var(--color-error)] flex items-center justify-center">
      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

/**
 * Single tool trace item component
 * Expandable to show arguments and results
 */
export function ToolTraceItem({ event }: ToolTraceItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const time = new Date(event.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formatValue = (value: unknown): string => {
    if (typeof value === 'string') {
      // Truncate long strings
      return value.length > 100 ? value.slice(0, 100) + '...' : value;
    }
    return JSON.stringify(value, null, 2);
  };

  return (
    <div
      data-testid="tool-trace-item"
      className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-[var(--color-bg-tertiary)] transition-colors text-left"
      >
        <ToolIcon tool={event.tool} />

        <div className="flex-1 min-w-0">
          <span className="font-mono text-sm text-[var(--color-text-primary)]">
            {event.tool}
          </span>
          {event.duration_ms && (
            <span className="ml-2 text-xs text-[var(--color-text-tertiary)]">
              {event.duration_ms}ms
            </span>
          )}
        </div>

        <StatusIndicator status={event.status} />

        <svg
          className={`w-4 h-4 text-[var(--color-text-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-[var(--color-border)] p-3 space-y-3 bg-[var(--color-bg-secondary)]">
          {/* Timestamp */}
          <div className="text-xs text-[var(--color-text-tertiary)]">
            {time}
          </div>

          {/* Arguments */}
          {event.arguments && Object.keys(event.arguments).length > 0 && (
            <div>
              <span className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">
                Arguments
              </span>
              <pre className="text-xs font-mono bg-[var(--color-bg-primary)] p-2 rounded overflow-x-auto">
                {JSON.stringify(event.arguments, null, 2)}
              </pre>
            </div>
          )}

          {/* Result */}
          {event.status === 'completed' && event.result !== undefined && (
            <div>
              <span className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">
                Result
              </span>
              <pre className="text-xs font-mono bg-[var(--color-bg-primary)] p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                {formatValue(event.result)}
              </pre>
            </div>
          )}

          {/* Error */}
          {event.status === 'error' && event.error && (
            <div>
              <span className="text-xs font-medium text-[var(--color-error)] block mb-1">
                Error: {event.error.code}
              </span>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {event.error.message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
