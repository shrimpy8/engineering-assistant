/**
 * Prompt Builder
 *
 * Constructs system prompts for the LLM with tool definitions and context.
 * Based on PRD v1.4 Section 5.4
 *
 * System prompt is externalized to /config/prompts/system-prompt.txt for easy iteration.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ToolDefinition, ToolName } from '@/lib/mcp/types';

// =============================================================================
// External Prompt Loading
// =============================================================================

/**
 * Load system prompt from external file for easy iteration.
 * Falls back to inline prompt if file doesn't exist.
 */
function loadExternalPrompt(): string | null {
  try {
    // Try multiple possible locations for the prompt file
    const possiblePaths = [
      path.join(process.cwd(), 'config', 'prompts', 'system-prompt.txt'),
      path.join(__dirname, '..', '..', '..', '..', 'config', 'prompts', 'system-prompt.txt'),
    ];

    for (const promptPath of possiblePaths) {
      if (fs.existsSync(promptPath)) {
        return fs.readFileSync(promptPath, 'utf-8');
      }
    }
    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// Tool Definitions for LLM
// =============================================================================

/**
 * Tool definitions in a format suitable for LLM function calling
 */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'list_files',
    description:
      'List files and directories in a repository path. Use this to explore the codebase structure.',
    inputSchema: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description: 'Directory path relative to repo root (default: ".")',
        },
        pattern: {
          type: 'string',
          description: 'Glob pattern to filter files (e.g., "*.ts")',
        },
        max_depth: {
          type: 'number',
          description: 'Maximum directory depth to traverse (default: 3)',
        },
        include_hidden: {
          type: 'boolean',
          description: 'Include hidden files and directories (default: false)',
        },
      },
    },
  },
  {
    name: 'read_file',
    description:
      'Read the contents of a file. Use this to examine code, configurations, or documentation.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to repo root',
        },
        max_bytes: {
          type: 'number',
          description: 'Maximum bytes to read (default: 100000)',
        },
        encoding: {
          type: 'string',
          enum: ['utf-8', 'base64'],
          description: 'File encoding (default: utf-8)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_files',
    description:
      'Search for text patterns across files in the repository. Use this to find specific code, functions, or references.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Text pattern to search for',
        },
        is_regex: {
          type: 'boolean',
          description: 'Treat pattern as regex (default: false)',
        },
        glob: {
          type: 'string',
          description: 'File glob pattern to limit search scope (e.g., "src/**/*.ts")',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results (default: 50)',
        },
        context_lines: {
          type: 'number',
          description: 'Lines of context around matches (default: 2)',
        },
        case_sensitive: {
          type: 'boolean',
          description: 'Case-sensitive search (default: false)',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'get_repo_overview',
    description:
      'Get an overview of the repository structure and statistics. Use this to understand the codebase at a high level.',
    inputSchema: {
      type: 'object',
      properties: {
        max_depth: {
          type: 'number',
          description: 'Maximum depth for directory tree (default: 3)',
        },
        include_stats: {
          type: 'boolean',
          description: 'Include file counts and language statistics (default: true)',
        },
      },
    },
  },
];

// =============================================================================
// System Prompt Templates
// =============================================================================

/**
 * Fallback system prompt if external file not found
 */
const FALLBACK_SYSTEM_PROMPT = `You are an expert software engineering assistant helping developers understand codebases.

You have tools available to explore and read code. Use them to answer questions.

## Tools
- list_files: List directory contents (supports depth parameter for subdirectories)
- read_file: Read a file's contents
- search_files: Search for text patterns across files
- get_repo_overview: Get repository structure overview

## Guidelines
- First understand the project type by checking for config files (package.json, requirements.txt, etc.)
- Use list_files with depth 2-3 to see beyond root level
- For "what is this project" questions, read README.md
- For structure questions, use get_repo_overview or list_files
- For entry point questions, read the config file first to identify the framework
- Always explore before assuming - verify files exist before reading them

When you get tool results, summarize them clearly for the user.`;

/**
 * Get the system prompt - loads from external file or uses fallback
 */
function getBaseSystemPrompt(): string {
  const externalPrompt = loadExternalPrompt();
  if (externalPrompt) {
    console.log('[PromptBuilder] Loaded system prompt from external file');
    return externalPrompt;
  }
  console.log('[PromptBuilder] Using fallback system prompt');
  return FALLBACK_SYSTEM_PROMPT;
}

/**
 * Tool description format for system prompt
 */
function formatToolsForPrompt(tools: ToolDefinition[]): string {
  const toolDescriptions = tools
    .map((tool) => {
      const params = Object.entries(tool.inputSchema.properties || {})
        .map(([name, schema]) => {
          const s = schema as { type: string; description?: string };
          return `  - ${name} (${s.type}): ${s.description || ''}`;
        })
        .join('\n');

      return `### ${tool.name}\n${tool.description}\n\nParameters:\n${params}`;
    })
    .join('\n\n');

  return `## Available Tools\n\n${toolDescriptions}`;
}

// =============================================================================
// Prompt Builder Class
// =============================================================================

export interface PromptBuilderOptions {
  repoPath?: string;
  toolMode?: 'auto' | 'manual';
  additionalContext?: string;
}

/**
 * Build system prompts for the engineering assistant
 */
export class PromptBuilder {
  private repoPath?: string;
  private toolMode: 'auto' | 'manual';
  private additionalContext?: string;

  constructor(options: PromptBuilderOptions = {}) {
    this.repoPath = options.repoPath;
    this.toolMode = options.toolMode || 'auto';
    this.additionalContext = options.additionalContext;
  }

  /**
   * Build the complete system prompt
   */
  buildSystemPrompt(): string {
    const parts: string[] = [getBaseSystemPrompt()];

    // Add tool definitions
    parts.push(formatToolsForPrompt(TOOL_DEFINITIONS));

    // Add repo context if available
    if (this.repoPath) {
      parts.push(`## Current Repository\n\nYou are analyzing: \`${this.repoPath}\``);
    }

    // Add tool mode instructions
    if (this.toolMode === 'auto') {
      parts.push(`## Tool Usage Mode: Automatic

You should proactively use tools to gather information needed to answer the user's questions.
Don't ask for permission to use tools - just use them when needed.`);
    } else {
      parts.push(`## Tool Usage Mode: Manual

Only use tools when the user explicitly asks you to.
If you need information, suggest which tool to use and let the user confirm.`);
    }

    // Add any additional context
    if (this.additionalContext) {
      parts.push(`## Additional Context\n\n${this.additionalContext}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Get tool definitions for function calling
   */
  getToolDefinitions(): ToolDefinition[] {
    return TOOL_DEFINITIONS;
  }

  /**
   * Format tools for Ollama's tools parameter
   */
  getOllamaTools(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return TOOL_DEFINITIONS.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  /**
   * Update repo path
   */
  setRepoPath(path: string): void {
    this.repoPath = path;
  }

  /**
   * Update tool mode
   */
  setToolMode(mode: 'auto' | 'manual'): void {
    this.toolMode = mode;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a prompt builder with default configuration
 */
export function createPromptBuilder(
  options?: PromptBuilderOptions
): PromptBuilder {
  return new PromptBuilder(options);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a tool name is valid
 */
export function isValidToolName(name: string): name is ToolName {
  return ['list_files', 'read_file', 'search_files', 'get_repo_overview'].includes(
    name
  );
}

/**
 * Get tool definition by name
 */
export function getToolDefinition(name: ToolName): ToolDefinition | undefined {
  return TOOL_DEFINITIONS.find((t) => t.name === name);
}
