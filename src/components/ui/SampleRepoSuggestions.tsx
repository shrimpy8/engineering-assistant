'use client';

interface SampleRepoSuggestionsProps {
  onSelectPath: (path: string) => void;
  compact?: boolean;
}

/**
 * Quick start paths for common repository locations
 * Helps users quickly set up without manually typing paths
 */
export function SampleRepoSuggestions({ onSelectPath, compact = false }: SampleRepoSuggestionsProps) {
  const suggestions = [
    {
      label: 'Documents',
      path: '/Users/yourname/Documents',
      icon: '📄',
    },
    {
      label: 'GitHub',
      path: '/Users/yourname/Documents/GitHub',
      icon: '🐙',
    },
    {
      label: 'Desktop',
      path: '/Users/yourname/Desktop',
      icon: '🖥️',
    },
    {
      label: 'Downloads',
      path: '/Users/yourname/Downloads',
      icon: '📥',
    },
  ];

  if (compact) {
    // Compact version for Settings panel
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">
            Quick Switch
          </span>
          <span className="text-[10px] text-[var(--color-text-tertiary)]">
            (click to change path)
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.path}
              onClick={() => onSelectPath(suggestion.path)}
              className="
                flex flex-col items-center gap-0.5 p-2 rounded-lg
                bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]
                border border-[var(--color-border)] hover:border-[var(--color-accent)]
                transition-all text-center group
              "
              title={`Set path to: ${suggestion.path}`}
            >
              <span className="text-lg group-hover:scale-110 transition-transform">
                {suggestion.icon}
              </span>
              <span className="text-[10px] text-[var(--color-text-secondary)]">
                {suggestion.label}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[var(--color-text-tertiary)]">
          Replace &quot;yourname&quot; in path with your macOS username
        </p>
      </div>
    );
  }

  // Full version for main page
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--color-accent)]/5 to-purple-500/5 border border-[var(--color-accent)]/20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Quick Start
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Click a folder to set it as your repository path
          </p>
        </div>
      </div>

      {/* Path buttons - horizontal on larger screens */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.path}
            onClick={() => onSelectPath(suggestion.path)}
            className="
              flex flex-col items-center gap-1 p-3 rounded-lg
              bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)]
              border border-[var(--color-border)] hover:border-[var(--color-accent)]
              transition-all hover:shadow-md hover:shadow-[var(--color-accent)]/10
              text-center group
            "
            title={`Set path to: ${suggestion.path}`}
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">
              {suggestion.icon}
            </span>
            <span className="text-xs font-medium text-[var(--color-text-primary)]">
              {suggestion.label}
            </span>
          </button>
        ))}
      </div>

      {/* Help text */}
      <p className="mt-3 text-[10px] text-[var(--color-text-tertiary)] text-center">
        Replace &quot;yourname&quot; with your macOS username, or use Settings to browse for any folder
      </p>
    </div>
  );
}
