'use client';

interface SampleRepoSuggestionsProps {
  onSelectPath: (path: string) => void;
}

/**
 * Preset repository suggestions for quick demo setup
 * Based on PRD v1.4 Section 5.9 Demo Polish Pack
 */
export function SampleRepoSuggestions({ onSelectPath }: SampleRepoSuggestionsProps) {
  const suggestions = [
    {
      label: 'Example project path',
      description: 'Replace with your local repository path',
      path: '/path/to/your/repo',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      ),
    },
    {
      label: 'Projects folder',
      description: 'Typical projects directory',
      path: '/Users/yourname/projects',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      label: 'Temp folder',
      description: 'System temporary directory (for testing)',
      path: '/tmp',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Quick start with a sample path:
      </p>
      <div className="grid gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.path}
            onClick={() => onSelectPath(suggestion.path)}
            className="
              flex items-center gap-3 p-3 rounded-[var(--radius-md)]
              bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]
              border border-[var(--color-border)] hover:border-[var(--color-accent)]/30
              transition-colors text-left
            "
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] flex items-center justify-center text-[var(--color-text-secondary)]">
              {suggestion.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {suggestion.label}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate">
                {suggestion.description}
              </p>
            </div>
            <svg
              className="w-4 h-4 text-[var(--color-text-tertiary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
