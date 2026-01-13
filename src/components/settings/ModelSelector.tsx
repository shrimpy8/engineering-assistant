'use client';

import type { Model } from '@/types';
import { Spinner } from '@/components/ui';

export interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  models: Model[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onPullModel?: () => void;
  isPulling?: boolean;
  pullStatus?: string | null;
}

/**
 * Model selection dropdown
 * Shows available Ollama models with sizes
 */
export function ModelSelector({
  value,
  onChange,
  models,
  isLoading,
  error,
  onRefresh,
  onPullModel,
  isPulling,
  pullStatus,
}: ModelSelectorProps) {
  const formatSize = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--color-text-secondary)]">
          Model
        </label>
        <div className="flex items-center gap-2">
          {onPullModel && (
            <button
              onClick={onPullModel}
              disabled={isPulling}
              className="text-xs text-[var(--color-accent)] hover:underline disabled:opacity-50"
            >
              {isPulling ? 'Pulling...' : 'Pull model'}
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="text-xs text-[var(--color-accent)] hover:underline disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
          <p className="text-sm text-[var(--color-error)]">{error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-xs text-[var(--color-accent)] hover:underline mt-1"
            >
              Try again
            </button>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 p-3">
          <Spinner size="sm" />
          <span className="text-sm text-[var(--color-text-secondary)]">
            Loading models...
          </span>
        </div>
      ) : models.length === 0 ? (
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
          <p className="text-sm text-[var(--color-text-primary)]">No tool-compatible models found</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Pull a compatible model: <code className="font-mono">ollama pull llama3.1:8b</code>
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            Supported: llama3.1, llama3.2, mistral
          </p>
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`
            w-full h-12 px-4
            bg-[var(--color-bg-primary)]
            border border-[var(--color-border)]
            rounded-[var(--radius-md)]
            text-[var(--color-text-primary)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]
            cursor-pointer
          `.trim()}
        >
          {models.map((model) => (
            <option key={model.name} value={model.name}>
              {model.name} ({formatSize(model.size)})
            </option>
          ))}
        </select>
      )}

      {pullStatus && (
        <p className="text-xs text-[var(--color-text-tertiary)]">
          {pullStatus}
        </p>
      )}

      <p className="text-xs text-[var(--color-text-tertiary)]">
        Only showing models that support tool calling (llama3.1, llama3.2, mistral)
      </p>
    </div>
  );
}
