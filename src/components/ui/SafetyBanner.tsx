'use client';

import { useState, useEffect } from 'react';

/**
 * One-time safety banner explaining read-only access
 * Based on PRD v1.4 Section 5.9 Demo Polish Pack
 */
export function SafetyBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if banner has been dismissed before
    const dismissed = localStorage.getItem('safety_banner_dismissed');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('safety_banner_dismissed', 'true');
    setIsDismissed(true);
    // Fade out animation
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
        mx-4 mt-3 p-4 rounded-[var(--radius-md)]
        bg-[var(--color-success)]/10 border border-[var(--color-success)]/20
        transition-opacity duration-300
        ${isDismissed ? 'opacity-0' : 'opacity-100'}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Shield icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-[var(--color-success)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Read-Only Access
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            This assistant can only <strong>read</strong> files in your approved repository.
            It cannot modify, create, or delete any files. All file access is shown in the
            Tool Trace panel for full transparency.
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-[var(--color-success)]/20 transition-colors"
          aria-label="Dismiss"
        >
          <svg
            className="w-5 h-5 text-[var(--color-text-secondary)]"
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
      </div>
    </div>
  );
}
