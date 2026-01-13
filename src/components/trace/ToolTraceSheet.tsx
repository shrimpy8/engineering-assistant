'use client';

import { useEffect, useRef } from 'react';
import type { ToolTraceEvent } from '@/types';
import { ToolTraceItem } from './ToolTraceItem';

export interface ToolTraceSheetProps {
  events: ToolTraceEvent[];
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Mobile bottom sheet for tool trace
 * Used on screens < 768px
 * Based on PRD v1.4 Section 4.5 Responsive Behavior
 */
export function ToolTraceSheet({ events, isOpen, onClose }: ToolTraceSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`
          fixed bottom-0 left-0 right-0
          bg-[var(--color-bg-primary)]
          border-t border-[var(--color-border)]
          rounded-t-[var(--radius-lg)]
          shadow-lg z-50 lg:hidden
          max-h-[70vh] flex flex-col
          animate-slide-in-up
        `.trim()}
        role="dialog"
        aria-label="Tool Activity"
      >
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Tool Activity
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--color-bg-secondary)] transition-colors"
            aria-label="Close"
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

        {/* Events */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--color-text-tertiary)]">
                No tool activity yet
              </p>
            </div>
          ) : (
            events.map((event) => (
              <ToolTraceItem key={event.id} event={event} />
            ))
          )}
        </div>

        {/* Footer */}
        {events.length > 0 && (
          <div className="px-4 py-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-tertiary)]">
            {events.length} tool call{events.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </>
  );
}
