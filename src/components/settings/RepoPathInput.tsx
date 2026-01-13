'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input, Button } from '@/components/ui';

export interface RepoPathInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidate?: (path: string) => Promise<{ valid: boolean; error?: string }>;
  externalError?: string | null;
}

/**
 * Repository path input with validation
 * Validates and saves with debouncing for better UX
 */
export function RepoPathInput({
  value,
  onChange,
  onValidate,
  externalError,
}: RepoPathInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | undefined>();
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
    if (value) setIsValid(true);
  }, [value]);

  // Sync any external validation error
  useEffect(() => {
    if (externalError) {
      setError(externalError);
      setIsValid(false);
    }
  }, [externalError]);

  // Clear selected folder name when a valid path is set
  useEffect(() => {
    if (isValid && localValue) {
      setSelectedFolderName(null);
    }
  }, [isValid, localValue]);

  const validateAndSave = useCallback(async (path: string) => {
    // Clear previous errors
    setError(undefined);

    // Basic validation
    if (!path.trim()) {
      setError('Repository path is required');
      setIsValid(false);
      return;
    }

    if (!path.startsWith('/')) {
      setError('Path must be absolute (start with /)');
      setIsValid(false);
      return;
    }

    // API validation
    if (onValidate) {
      setIsValidating(true);
      try {
        const result = await onValidate(path);
        if (!result.valid) {
          setError(result.error);
          setIsValid(false);
        } else {
          setError(undefined);
          setIsValid(true);
          onChange(path);
        }
      } finally {
        setIsValidating(false);
      }
    } else {
      setIsValid(true);
      onChange(path);
    }
  }, [onChange, onValidate]);

  // Debounced validation on input change
  const handleInputChange = useCallback((newValue: string) => {
    setLocalValue(newValue);
    setError(undefined);
    setSelectedFolderName(null);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce validation (500ms after user stops typing)
    debounceRef.current = setTimeout(() => {
      if (newValue.trim() && newValue.startsWith('/')) {
        validateAndSave(newValue);
      }
    }, 500);
  }, [validateAndSave]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleBlur = () => {
    // Cancel debounce and validate immediately
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (localValue !== value && localValue.trim()) {
      validateAndSave(localValue);
    }
  };

  const handleBrowse = async () => {
    // Use File System Access API if available (Chrome, Edge)
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as unknown as {
          showDirectoryPicker: () => Promise<{ name: string }>;
        }).showDirectoryPicker();

        // Show the folder name and prompt user to paste path
        setSelectedFolderName(handle.name);
        setShowHelp(true);

        // Focus the input for easy paste
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 100);
        return;
      } catch {
        // User cancelled or error
        return;
      }
    }

    // Fallback for Safari and other browsers
    const input = document.createElement('input') as HTMLInputElement & {
      webkitdirectory?: boolean;
      directory?: boolean;
    };
    input.type = 'file';
    input.webkitdirectory = true;
    input.directory = true;
    input.onchange = () => {
      const file = input.files?.[0] as File & { path?: string };
      if (file?.path) {
        // Electron exposes the path - use it directly
        setLocalValue(file.path);
        setError(undefined);
        setSelectedFolderName(null);
        onChange(file.path);
      } else if (file?.webkitRelativePath) {
        // Extract folder name from relative path
        const folderName = file.webkitRelativePath.split('/')[0];
        setSelectedFolderName(folderName);
        setShowHelp(true);

        // Focus the input for easy paste
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 100);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-[var(--color-accent)]"
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
        <label className="text-sm font-bold text-[var(--color-text-primary)]">
          Repository Path
        </label>
        {isValid && localValue && (
          <span className="ml-auto text-xs text-green-500 font-medium">✓ Valid</span>
        )}
      </div>

      {/* Selected folder indicator with clickable path suggestions */}
      {selectedFolderName && (
        <div className="p-3 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              Selected: <span className="text-[var(--color-accent)]">{selectedFolderName}</span>
            </span>
          </div>

          {/* Clickable path suggestions */}
          <p className="text-xs text-[var(--color-text-secondary)] mb-2">
            Click a likely path or paste the exact path below:
          </p>
          <div className="grid grid-cols-1 gap-1.5 mb-3">
            {(() => {
              // Try to detect username from any previously entered path
              const prevMatch = value.match(/^\/Users\/([^/]+)/);
              const username = prevMatch?.[1] || 'yourname';
              return [
                `/Users/${username}/Documents/GitHub/${selectedFolderName}`,
                `/Users/${username}/Documents/${selectedFolderName}`,
                `/Users/${username}/Desktop/${selectedFolderName}`,
                `/Users/${username}/Downloads/${selectedFolderName}`,
              ];
            })().map((suggestedPath) => (
              <button
                key={suggestedPath}
                type="button"
                onClick={() => {
                  setLocalValue(suggestedPath);
                  setSelectedFolderName(null);
                  validateAndSave(suggestedPath);
                }}
                className="text-left px-2 py-1.5 text-xs font-mono rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-secondary)] transition-colors truncate"
              >
                {suggestedPath}
              </button>
            ))}
          </div>

          {/* Manual copy instructions (collapsed) */}
          <details className="text-xs">
            <summary className="cursor-pointer text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">
              Path not listed? Copy from Finder...
            </summary>
            <div className="mt-2 p-2 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
              <p className="text-[var(--color-text-secondary)] mb-1">
                In Finder, select the folder and press:
              </p>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-bg-tertiary)] rounded border border-[var(--color-border)]">
                  ⌥⌘C
                </kbd>
                <span className="text-[var(--color-text-tertiary)]">
                  then paste here with ⌘V
                </span>
              </div>
            </div>
          </details>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <Input
            ref={inputRef}
            data-testid="repo-path-input"
            value={localValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (debounceRef.current) clearTimeout(debounceRef.current);
                validateAndSave(localValue);
              }
            }}
            placeholder={selectedFolderName ? `Paste path to ${selectedFolderName} here...` : "/path/to/your/repository"}
            error={error}
            disabled={isValidating}
            className="w-full font-mono text-sm"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleBrowse}
          disabled={isValidating}
          className="h-12 px-3"
          title="Browse for folder"
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
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </Button>
      </div>

      {isValidating && (
        <p className="text-xs text-[var(--color-accent)] flex items-center gap-1">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Validating path...
        </p>
      )}

      {/* Help toggle */}
      {!selectedFolderName && (
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1"
        >
          <svg className={`w-3 h-3 transition-transform ${showHelp ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          How to get folder path on macOS
        </button>
      )}

      {/* Help content */}
      {showHelp && !selectedFolderName && (
        <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-xs space-y-2">
          <p className="font-medium text-[var(--color-text-primary)]">Option 1: Keyboard shortcut</p>
          <ol className="list-decimal list-inside text-[var(--color-text-secondary)] space-y-1 ml-2">
            <li>Open Finder and navigate to your project folder</li>
            <li>Select the folder (single click)</li>
            <li>Press <kbd className="px-1 py-0.5 bg-[var(--color-bg-tertiary)] rounded text-[10px]">⌥⌘C</kbd> (Option+Cmd+C)</li>
            <li>Paste here with <kbd className="px-1 py-0.5 bg-[var(--color-bg-tertiary)] rounded text-[10px]">⌘V</kbd></li>
          </ol>
          <p className="font-medium text-[var(--color-text-primary)] mt-3">Option 2: Drag from Terminal</p>
          <ol className="list-decimal list-inside text-[var(--color-text-secondary)] space-y-1 ml-2">
            <li>Open Terminal</li>
            <li>Drag folder from Finder into Terminal</li>
            <li>Copy the path that appears</li>
          </ol>
        </div>
      )}

      {!showHelp && !selectedFolderName && (
        <p className="text-xs text-[var(--color-text-tertiary)]">
          Enter the absolute path to the repository you want to analyze
        </p>
      )}
    </div>
  );
}
