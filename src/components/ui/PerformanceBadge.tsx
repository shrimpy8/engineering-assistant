'use client';

interface PerformanceBadgeProps {
  latencyMs?: number;
  toolDurationMs?: number;
  className?: string;
}

/**
 * Performance badge showing latency and tool execution time
 * Based on PRD v1.4 Section 5.9 Demo Polish Pack
 */
export function PerformanceBadge({ latencyMs, toolDurationMs, className = '' }: PerformanceBadgeProps) {
  if (!latencyMs && !toolDurationMs) return null;

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-2 py-1 rounded-[var(--radius-sm)]
        bg-[var(--color-bg-secondary)] text-xs
        ${className}
      `}
    >
      {latencyMs !== undefined && (
        <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span>{formatTime(latencyMs)}</span>
        </span>
      )}

      {latencyMs && toolDurationMs && (
        <span className="text-[var(--color-text-tertiary)]">|</span>
      )}

      {toolDurationMs !== undefined && (
        <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
          </svg>
          <span>Tools: {formatTime(toolDurationMs)}</span>
        </span>
      )}
    </div>
  );
}
