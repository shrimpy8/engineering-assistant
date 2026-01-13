'use client';

import { useEffect, useRef } from 'react';
import type { ChatSettings, Model } from '@/types';
import { Button, SampleRepoSuggestions } from '@/components/ui';
import { RepoPathInput } from './RepoPathInput';
import { ModelSelector } from './ModelSelector';

export interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onUpdateSettings: (updates: Partial<ChatSettings>) => void;
  models: Model[];
  isLoadingModels: boolean;
  modelsError: string | null;
  onRefreshModels: () => void;
  onValidateRepoPath?: (path: string) => Promise<{ valid: boolean; error?: string }>;
  repoPathError?: string | null;
  onPullModel?: () => void;
  isPullingModel?: boolean;
  modelPullStatus?: string | null;
}

/**
 * Settings Panel
 * Slide-in from right, 360px width
 * Based on PRD v1.4 Section 4.2.4
 */
export function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  models,
  isLoadingModels,
  modelsError,
  onRefreshModels,
  onValidateRepoPath,
  repoPathError,
  onPullModel,
  isPullingModel,
  modelPullStatus,
}: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && isOpen) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" aria-hidden="true" />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          fixed top-0 right-0 bottom-0 w-[360px]
          bg-[var(--color-bg-primary)]
          border-l border-[var(--color-border)]
          shadow-lg z-50
          flex flex-col
          animate-slide-in-right
        `.trim()}
        role="dialog"
        aria-label="Settings"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-secondary)] transition-colors"
            aria-label="Close settings"
          >
            <svg
              className="w-5 h-5 text-[var(--color-text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Repository Path - Highlighted Section */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--color-accent)]/10 to-[var(--color-accent)]/5 border border-[var(--color-accent)]/20">
            <RepoPathInput
              value={settings.repo_path}
              onChange={(value) => onUpdateSettings({ repo_path: value })}
              onValidate={onValidateRepoPath}
              externalError={repoPathError}
            />
          </div>

          {/* Quick Start Shortcuts - Always visible */}
          <SampleRepoSuggestions
            onSelectPath={(path) => onUpdateSettings({ repo_path: path })}
            compact
          />

          {/* Model Selection */}
          <ModelSelector
            value={settings.model}
            onChange={(value) => onUpdateSettings({ model: value })}
            models={models}
            isLoading={isLoadingModels}
            error={modelsError}
            onRefresh={onRefreshModels}
            onPullModel={onPullModel}
            isPulling={isPullingModel}
            pullStatus={modelPullStatus}
          />

          {/* Temperature */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Temperature: {settings.temperature?.toFixed(1) ?? 0.7}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.temperature ?? 0.7}
              onChange={(e) => onUpdateSettings({ temperature: parseFloat(e.target.value) })}
              className="w-full accent-[var(--color-accent)]"
            />
            <p className="text-xs font-medium text-[var(--color-text-tertiary)]">
              Lower = more focused, Higher = more creative
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Max Response Length
            </label>
            <select
              value={settings.max_tokens ?? 2048}
              onChange={(e) => onUpdateSettings({ max_tokens: parseInt(e.target.value) })}
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
              <option value={256}>Short (256 tokens)</option>
              <option value={512}>Medium (512 tokens)</option>
              <option value={1024}>Long (1024 tokens)</option>
              <option value={2048}>Very Long (2048 tokens)</option>
              <option value={4096}>Maximum (4096 tokens)</option>
            </select>
            <p className="text-xs font-medium text-[var(--color-text-tertiary)]">
              Maximum length of each response
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)]">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </>
  );
}
