'use client';

import { forwardRef, InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

/**
 * Input component following PRD v1.4 Section 4.2.4
 * Height: 48px, Padding: 12px 16px, Border-radius: 8px
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full h-12 px-4 py-3
            bg-[var(--color-bg-primary)]
            border border-[var(--color-border)]
            rounded-[var(--radius-md)]
            text-[var(--color-text-primary)]
            placeholder:text-[var(--color-text-tertiary)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-shadow duration-[var(--duration-fast)]
            ${error ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]' : ''}
            ${className}
          `.replace(/\s+/g, ' ').trim()}
          {...props}
        />
        {error && (
          <span className="text-sm text-[var(--color-error)]">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
