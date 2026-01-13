'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

/**
 * Button component with variants and sizes
 * Follows PRD v1.4 Section 4.2.4 design specifications
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-medium transition-colors
      focus-ring rounded-[var(--radius-md)]
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variants = {
      primary: `
        bg-gradient-to-r from-[var(--color-accent)] to-blue-600 text-white font-semibold
        hover:from-[var(--color-accent-hover)] hover:to-blue-500
        shadow-md shadow-[var(--color-accent)]/30 hover:shadow-lg hover:shadow-[var(--color-accent)]/40
      `,
      secondary: `
        bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]
        hover:bg-[var(--color-border)] border border-[var(--color-border)]
      `,
      ghost: `
        bg-transparent text-[var(--color-text-secondary)]
        hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]
      `,
      danger: `
        bg-gradient-to-r from-[var(--color-error)] to-red-600 text-white font-semibold
        hover:opacity-90 shadow-md shadow-[var(--color-error)]/30
      `,
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`.replace(/\s+/g, ' ').trim()}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
