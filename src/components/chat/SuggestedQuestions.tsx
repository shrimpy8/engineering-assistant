'use client';

/**
 * Suggested Questions Component
 *
 * Shows clickable question buttons to help users get started
 * and test MCP tool calling functionality.
 */

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

const SUGGESTED_QUESTIONS = [
  {
    label: 'Tech stack',
    question: 'What is the technology stack used in this project?',
    icon: '🛠️',
  },
  {
    label: 'What is this project?',
    question: 'What is this project about?',
    icon: '📋',
  },
  {
    label: 'Show structure',
    question: 'Show me the project structure',
    icon: '📁',
  },
  {
    label: 'Find main entry',
    question: 'Where is the main entry point?',
    icon: '🔍',
  },
  {
    label: 'List dependencies',
    question: 'What dependencies does this project use?',
    icon: '📦',
  },
  {
    label: 'Explain codebase',
    question: 'Explain the codebase',
    icon: '⚙️',
  },
];

export function SuggestedQuestions({
  onSelectQuestion,
  disabled = false,
  compact = false,
}: SuggestedQuestionsProps) {
  if (compact) {
    // Compact horizontal layout for showing above input
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {SUGGESTED_QUESTIONS.map((item) => (
          <button
            key={item.label}
            onClick={() => onSelectQuestion(item.question)}
            disabled={disabled}
            title={item.question}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full
              border border-[var(--color-border)]
              bg-[var(--color-bg-secondary)]
              hover:bg-[var(--color-bg-tertiary)]
              hover:border-[var(--color-accent)]/50
              transition-all duration-150
              text-xs
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span>{item.icon}</span>
            <span className="font-medium text-[var(--color-text-secondary)]">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    );
  }

  // Full layout for empty state
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
          Get started with a question
        </h3>
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          Click a suggestion below or type your own question
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl w-full">
        {SUGGESTED_QUESTIONS.map((item, index) => (
          <button
            key={item.label}
            onClick={() => onSelectQuestion(item.question)}
            disabled={disabled}
            className={`
              flex items-center gap-3 p-4 rounded-xl
              border border-[var(--color-border)]
              bg-[var(--color-bg-secondary)]
              hover:bg-[var(--color-bg-tertiary)]
              hover:border-[var(--color-accent)]
              hover:shadow-md hover:shadow-[var(--color-accent)]/10
              transition-all duration-200
              text-left group
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-xl flex-shrink-0 group-hover:scale-110 transition-transform">{item.icon}</span>
            <span className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-2">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
