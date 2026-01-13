'use client';

import { useState, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { useSettings } from '@/hooks/useSettings';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';
import { ToolTracePanel, ToolTraceSheet } from '@/components/trace';
import { SettingsPanel } from '@/components/settings';
import { ErrorDisplay, SafetyBanner, PerformanceBadge, SampleRepoSuggestions } from '@/components/ui';

/**
 * Main chat container with header, messages, input, and sidebars
 * Based on PRD v1.4 Section 4.4 Layout Structure
 */
export function ChatContainer() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isToolTraceOpen, setIsToolTraceOpen] = useState(true);
  const [isMobileTraceOpen, setIsMobileTraceOpen] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState<string | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);

  const {
    settings,
    updateSettings,
    models,
    isLoadingModels,
    modelsError,
    refreshModels,
    validateRepoPath,
    repoPathError,
    pullModel,
    isPullingModel,
    modelPullStatus,
  } = useSettings();

  const {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    clearMessages,
    clearError,
    toolTraceEvents,
    latencyMs,
    toolDurationMs,
  } = useChat();

  const handleSendMessage = (content: string) => {
    if (!settings.repo_path) {
      setIsSettingsOpen(true);
      return;
    }
    sendMessage(content, settings);
  };

  useEffect(() => {
    if (repoPathError) {
      setIsSettingsOpen(true);
    }
  }, [repoPathError]);

  useEffect(() => {
    if (!isPromptOpen) return;
    if (!settings.repo_path) {
      setPromptError('Set a repository path to view the system prompt.');
      return;
    }

    const loadPrompt = async () => {
      setPromptError(null);
      try {
        const response = await fetch(
          `/api/v1/prompt?repo_path=${encodeURIComponent(settings.repo_path)}&tool_mode=${settings.tool_mode || 'auto'}`
        );
        const data = await response.json();
        if (data.success) {
          setPromptText(data.data.prompt);
        } else {
          setPromptError(data.error?.message || 'Failed to load prompt');
        }
      } catch (error) {
        setPromptError('Failed to load prompt');
      }
    };

    loadPrompt();
  }, [isPromptOpen, settings.repo_path, settings.tool_mode]);

  // Get project name from path for display
  const projectName = settings.repo_path
    ? settings.repo_path.split('/').filter(Boolean).pop() || 'Repository'
    : null;

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-accent)] to-purple-600 flex items-center justify-center shadow-md shadow-[var(--color-accent)]/30">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-[var(--color-text-primary)] leading-tight">
                Engineering Assistant
              </span>
              <span className="text-[10px] text-[var(--color-text-tertiary)] leading-tight">
                Local AI Code Explorer
              </span>
            </div>
          </div>

          {/* Repo path display - Enhanced */}
          {projectName && (
            <div
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--color-accent)]/10 to-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 cursor-pointer hover:border-[var(--color-accent)]/40 transition-colors"
              title={settings.repo_path}
              onClick={() => setIsSettingsOpen(true)}
            >
              <svg
                className="w-4 h-4 text-[var(--color-accent)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <span className="text-sm text-[var(--color-text-primary)] font-semibold">
                {projectName}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <PerformanceBadge latencyMs={latencyMs ?? undefined} toolDurationMs={toolDurationMs ?? undefined} />
          {/* Tool Trace toggle (desktop) */}
          <button
            onClick={() => setIsToolTraceOpen(!isToolTraceOpen)}
            className={`
              hidden lg:flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)]
              transition-colors
              ${isToolTraceOpen
                ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                : 'hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
              }
            `}
            title={isToolTraceOpen ? 'Hide Tool Trace' : 'Show Tool Trace'}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span className="text-sm hidden xl:inline">Tool Trace</span>
          </button>

          {/* Prompt transparency toggle */}
          <button
            onClick={() => setIsPromptOpen((prev) => !prev)}
            className={`
              hidden lg:flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)]
              transition-colors
              ${isPromptOpen
                ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                : 'hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
              }
            `}
            title={isPromptOpen ? 'Hide System Prompt' : 'Show System Prompt'}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 8h10M7 12h10M7 16h6"
              />
            </svg>
            <span className="text-sm hidden xl:inline">Prompt</span>
          </button>

          {/* Tool Trace toggle (mobile) */}
          <button
            onClick={() => setIsMobileTraceOpen(true)}
            className={`
              lg:hidden flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)]
              transition-colors
              ${toolTraceEvents.length > 0
                ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                : 'hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
              }
            `}
            title="View Tool Activity"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            {toolTraceEvents.length > 0 && (
              <span className="text-xs bg-[var(--color-accent)] text-white rounded-full px-1.5 py-0.5">
                {toolTraceEvents.length}
              </span>
            )}
          </button>

          {/* Clear chat */}
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-secondary)] transition-colors"
              title="Clear chat"
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
                  strokeWidth={1.5}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}

          {/* Settings button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-secondary)] transition-colors"
            title="Settings"
            data-testid="settings-button"
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
                strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Safety Banner (one-time) */}
          <SafetyBanner />

          {/* Error display */}
          {error && (
            <div className="p-4 border-b border-[var(--color-border)]">
              <ErrorDisplay
                error={error}
                onRetry={() => clearError()}
                onDismiss={() => clearError()}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </div>
          )}

          {repoPathError && (
            <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-warning)]/10">
              <p className="text-sm text-[var(--color-text-primary)]">
                Saved repository path is invalid. Please update it in settings.
              </p>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-sm text-[var(--color-accent)] hover:underline mt-1"
              >
                Open Settings
              </button>
            </div>
          )}

          {/* Messages */}
          {isPromptOpen && (
            <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  System Prompt (Read‑only)
                </h3>
                <button
                  onClick={() => setIsPromptOpen(false)}
                  className="text-xs text-[var(--color-text-secondary)] hover:underline"
                >
                  Close
                </button>
              </div>
              {promptError ? (
                <p className="text-sm text-[var(--color-error)]">{promptError}</p>
              ) : (
                <pre className="text-xs whitespace-pre-wrap font-mono text-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] p-3 rounded border border-[var(--color-border)] max-h-60 overflow-y-auto">
                  {promptText || 'Loading...'}
                </pre>
              )}
            </div>
          )}
          <MessageList
            messages={messages}
            isLoading={isLoading}
            isStreaming={isStreaming}
          />

          {/* Suggested Questions (shown when no messages) */}
          {messages.length === 0 && settings.repo_path && (
            <SuggestedQuestions
              onSelectQuestion={handleSendMessage}
              disabled={isLoading || isStreaming}
            />
          )}

          {/* Input area */}
          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]">
            {!settings.repo_path && (
              <div className="mb-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
                <p className="text-sm text-[var(--color-text-primary)]">
                  Please configure a repository path to start analyzing code.
                </p>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-sm text-[var(--color-accent)] hover:underline mt-1"
                >
                  Open Settings
                </button>
              </div>
            )}
            {!settings.repo_path && (
              <div className="mb-3">
                <SampleRepoSuggestions
                  onSelectPath={(path) => updateSettings({ repo_path: path })}
                />
              </div>
            )}
            {/* Compact suggested questions above input (when messages exist) */}
            {messages.length > 0 && settings.repo_path && (
              <div className="mb-3">
                <SuggestedQuestions
                  onSelectQuestion={handleSendMessage}
                  disabled={isLoading || isStreaming}
                  compact
                />
              </div>
            )}
            <ChatInput
              onSend={handleSendMessage}
              disabled={!settings.repo_path}
              isLoading={isLoading}
            />
          </div>
        </main>

        {/* Tool Trace sidebar (desktop only) */}
        <div className="hidden lg:block">
          <ToolTracePanel
            events={toolTraceEvents}
            isOpen={isToolTraceOpen}
            onClose={() => setIsToolTraceOpen(false)}
          />
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        models={models}
        isLoadingModels={isLoadingModels}
        modelsError={modelsError}
        onRefreshModels={refreshModels}
        onValidateRepoPath={validateRepoPath}
        repoPathError={repoPathError}
        onPullModel={() => pullModel()}
        isPullingModel={isPullingModel}
        modelPullStatus={modelPullStatus}
      />

      {/* Mobile Tool Trace Sheet */}
      <ToolTraceSheet
        events={toolTraceEvents}
        isOpen={isMobileTraceOpen}
        onClose={() => setIsMobileTraceOpen(false)}
      />
    </div>
  );
}
