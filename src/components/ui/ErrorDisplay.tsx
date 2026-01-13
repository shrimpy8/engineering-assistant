'use client';

import { ErrorCode, ErrorCodes } from '@/lib/errors/codes';
import { getUserFacingError } from '@/lib/errors/messages';
import { Button } from './Button';

export interface ErrorDisplayProps {
  error: { code: string; message: string };
  onRetry?: () => void;
  onDismiss?: () => void;
  onOpenSettings?: () => void;
}

/**
 * Error display component with user-friendly messages
 * Based on PRD v1.4 Section 8.3
 */
export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  onOpenSettings,
}: ErrorDisplayProps) {
  // Get user-facing error details
  const details = getUserFacingError(error.code as ErrorCode);

  const handleAction = () => {
    if (details.action?.type === 'open_settings' && onOpenSettings) {
      onOpenSettings();
    } else if (details.action?.type === 'retry' && onRetry) {
      onRetry();
    }
  };

  return (
    <div
      className="rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-4"
      role="alert"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="w-5 h-5 text-[var(--color-error)]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-error)]">
            {details.title}
          </h3>
          <p className="text-sm text-[var(--color-text-primary)] mt-1">
            {details.message}
          </p>

          {/* Suggestion */}
          {details.suggestion && (
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
              {details.suggestion}
            </p>
          )}

          {/* Steps */}
          {details.steps && details.steps.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
                How to fix:
              </p>
              <ol className="text-xs text-[var(--color-text-secondary)] space-y-1 list-decimal list-inside">
                {details.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            {details.action && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAction}
              >
                {details.action.label}
              </Button>
            )}
            {onRetry && (!details.action || details.action.type !== 'retry') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onRetry}
              >
                Try Again
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            )}
          </div>

          {/* Technical details (collapsible) */}
          <details className="mt-3">
            <summary className="text-xs text-[var(--color-text-tertiary)] cursor-pointer hover:text-[var(--color-text-secondary)]">
              Technical Details
            </summary>
            <div className="mt-2 p-2 bg-[var(--color-bg-secondary)] rounded text-xs font-mono">
              <div>Code: {error.code}</div>
              <div className="mt-1 break-words">Message: {error.message}</div>
            </div>
          </details>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-[var(--color-bg-tertiary)] transition-colors"
            aria-label="Dismiss error"
          >
            <svg
              className="w-4 h-4 text-[var(--color-text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
