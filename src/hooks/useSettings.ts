'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ChatSettings, Model } from '@/types';

const STORAGE_KEY = 'engineering-assistant-settings';

interface UseSettingsReturn {
  settings: ChatSettings;
  updateSettings: (updates: Partial<ChatSettings>) => void;
  resetSettings: () => void;
  models: Model[];
  isLoadingModels: boolean;
  modelsError: string | null;
  refreshModels: () => Promise<void>;
  validateRepoPath: (path: string) => Promise<{ valid: boolean; error?: string }>;
  repoPathError: string | null;
  isPullingModel: boolean;
  modelPullStatus: string | null;
  pullModel: (modelName?: string) => Promise<void>;
}

const DEFAULT_SETTINGS: ChatSettings = {
  model: '', // Will be auto-selected from preferred list
  repo_path: '',
  temperature: 0.3,
  max_tokens: 2048,
  tool_mode: 'auto',
};

/**
 * Models verified to support Ollama's native tool calling API.
 * Order matters - first match wins.
 *
 * IMPORTANT: Many models output tool calls as JSON text instead of using
 * Ollama's tool_calls field. Only models listed here are VERIFIED to work.
 *
 * Models that do NOT work (output JSON text instead):
 * - qwen2.5-coder, deepseek-coder, codellama, etc.
 */
const TOOL_COMPATIBLE_MODELS = [
  'llama3.1',      // Best: solid tool support, good for code
  'llama3.2',      // Good but smaller
  'mistral',       // Also works with tools
];

/**
 * Filter models to only include tool-compatible ones.
 */
function filterToolCompatibleModels(models: Model[]): Model[] {
  return models.filter((model) => {
    const lowerName = model.name.toLowerCase();
    return TOOL_COMPATIBLE_MODELS.some((pattern) => lowerName.includes(pattern));
  });
}

/**
 * Choose a best default model for code analysis with tool support.
 * Only selects models known to support Ollama's tool calling API.
 */
function selectPreferredModel(models: Model[], current: string): string {
  const compatibleModels = filterToolCompatibleModels(models);
  if (compatibleModels.length === 0) {
    console.warn('No tool-compatible model found. Tools may not work correctly.');
    return models.length > 0 ? models[0].name : current;
  }

  const names = compatibleModels.map((m) => m.name);
  const lowerNames = names.map((name) => name.toLowerCase());

  // Find first tool-compatible model by preference order
  for (const pattern of TOOL_COMPATIBLE_MODELS) {
    const match = lowerNames.find((name) => name.includes(pattern));
    if (match) {
      return names[lowerNames.indexOf(match)];
    }
  }

  return names[0];
}

/**
 * Hook for managing application settings
 * Persists settings to localStorage
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [repoPathError, setRepoPathError] = useState<string | null>(null);
  const [isPullingModel, setIsPullingModel] = useState(false);
  const [modelPullStatus, setModelPullStatus] = useState<string | null>(null);

  const validateRepoPath = useCallback(
    async (path: string): Promise<{ valid: boolean; error?: string }> => {
      if (!path.trim()) {
        return { valid: false, error: 'Repository path is required' };
      }

      if (!path.startsWith('/')) {
        return { valid: false, error: 'Path must be absolute (start with /)' };
      }

      try {
        const response = await fetch(
          `/api/v1/files?repo=${encodeURIComponent(path)}&path=.`
        );
        const data = await response.json();

        if (data.success) {
          return { valid: true };
        }

        return { valid: false, error: data.error?.message || 'Invalid repository path' };
      } catch (error) {
        return { valid: false, error: 'Failed to validate path' };
      }
    },
    []
  );

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        setSettings(merged);

        if (merged.repo_path) {
          // Validate cached repo path once on load and clear if invalid.
          validateRepoPath(merged.repo_path).then((result) => {
            if (!result.valid) {
              setRepoPathError(result.error || 'Invalid repository path');
              setSettings((prev) => ({ ...prev, repo_path: '' }));
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, [validateRepoPath]);

  // Save settings to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<ChatSettings>) => {
    if (updates.repo_path !== undefined) {
      setRepoPathError(null);
    }
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const refreshModels = useCallback(async () => {
    setIsLoadingModels(true);
    setModelsError(null);

    try {
      const response = await fetch('/api/v1/models');
      const data = await response.json();

      if (data.success) {
        setModels(data.data.models);

        // Select preferred model if current is empty or not in available list
        if (data.data.models.length > 0) {
          const modelNames = data.data.models.map((m: Model) => m.name);
          if (!settings.model || !modelNames.includes(settings.model)) {
            updateSettings({
              model: selectPreferredModel(data.data.models, settings.model),
            });
          }
        }
      } else {
        setModelsError(data.error?.message || 'Failed to load models');
      }
    } catch (error) {
      setModelsError('Failed to connect to server');
      console.error('Failed to fetch models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  }, [settings.model, updateSettings]);

  const pullModel = useCallback(
    async (modelName?: string) => {
      const targetModel = modelName || settings.model;
      if (!targetModel) {
        setModelsError('No model specified');
        return;
      }

      setIsPullingModel(true);
      setModelPullStatus('Starting download...');

      try {
        const response = await fetch('/api/v1/models/pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: targetModel }),
        });

        if (!response.ok || !response.body) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error?.message || 'Failed to pull model');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const payload = JSON.parse(data) as {
                status?: string;
                completed?: number;
                total?: number;
                type?: string;
                error?: { message?: string };
              };

              if (payload.type === 'error') {
                throw new Error(payload.error?.message || 'Model pull failed');
              }

              if (payload.status) {
                setModelPullStatus(payload.status);
              }
            } catch (err) {
              throw err;
            }
          }
        }

        setModelPullStatus('Model download complete');
        await refreshModels();
      } catch (error) {
        setModelsError(error instanceof Error ? error.message : 'Failed to pull model');
      } finally {
        setIsPullingModel(false);
      }
    },
    [refreshModels, settings.model]
  );

  // Load models on mount
  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  // Only expose tool-compatible models in the UI
  const compatibleModels = filterToolCompatibleModels(models);

  return {
    settings,
    updateSettings,
    resetSettings,
    models: compatibleModels,
    isLoadingModels,
    modelsError: compatibleModels.length === 0 && models.length > 0
      ? 'No tool-compatible models found. Please pull llama3.1:8b or llama3.2:3b'
      : modelsError,
    refreshModels,
    validateRepoPath,
    repoPathError,
    isPullingModel,
    modelPullStatus,
    pullModel,
  };
}
