/**
 * Input Validation
 *
 * Validates and sanitizes input arguments for MCP tools.
 * Based on PRD v1.4 Section 10.3
 */

import { z } from 'zod';
import { MCPError, MCPErrorCodes, InvalidPatternError } from '../errors/index.js';

/**
 * Sanitize a file path
 * - Remove null bytes
 * - Normalize slashes
 */
export function sanitizePath(input: string): string {
  return input
    .replace(/\0/g, '') // Remove null bytes
    .replace(/\\/g, '/'); // Normalize slashes
}

/**
 * Sanitize a glob pattern
 * - Only allow safe glob characters
 */
export function sanitizeGlobPattern(input: string): string {
  // Allow: alphanumeric, underscore, hyphen, dot, star, question, slash, brackets
  const sanitized = input.replace(/[^a-zA-Z0-9_\-.*?/[\]{}]/g, '');
  if (sanitized !== input) {
    throw new InvalidPatternError(input, 'contains unsupported glob characters');
  }
  return sanitized;
}

/**
 * Escape regex special characters for literal search
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate a regex pattern
 */
export function validateRegex(pattern: string): RegExp {
  try {
    return new RegExp(pattern);
  } catch (error) {
    throw new InvalidPatternError(
      pattern,
      error instanceof Error ? error.message : 'Invalid regex'
    );
  }
}

// ============================================
// Tool Argument Schemas
// ============================================

/**
 * list_files arguments schema
 */
export const ListFilesArgsSchema = z.object({
  directory: z.string().min(1).default('.'),
  pattern: z.string().optional(),
  max_depth: z.number().int().min(1).max(10).default(3),
  include_hidden: z.boolean().default(false),
});

export type ListFilesArgs = z.output<typeof ListFilesArgsSchema>;

/**
 * read_file arguments schema
 */
export const ReadFileArgsSchema = z.object({
  path: z.string().min(1),
  max_bytes: z.number().int().min(1).default(100000),
  encoding: z.enum(['utf-8', 'base64']).default('utf-8'),
});

export type ReadFileArgs = z.output<typeof ReadFileArgsSchema>;

/**
 * search_files arguments schema
 */
export const SearchFilesArgsSchema = z.object({
  pattern: z.string().min(1),
  is_regex: z.boolean().default(false),
  glob: z.string().optional(),
  max_results: z.number().int().min(1).max(1000).default(50),
  context_lines: z.number().int().min(0).max(10).default(2),
  case_sensitive: z.boolean().default(false),
});

export type SearchFilesArgs = z.output<typeof SearchFilesArgsSchema>;

/**
 * get_repo_overview arguments schema
 */
export const RepoOverviewArgsSchema = z.object({
  max_depth: z.number().int().min(1).max(5).default(3),
  include_stats: z.boolean().default(true),
});

export type RepoOverviewArgs = z.output<typeof RepoOverviewArgsSchema>;

// ============================================
// Validation Functions
// ============================================

/**
 * Validate and parse tool arguments
 */
export function validateArgs<T extends z.ZodTypeAny>(
  schema: T,
  args: unknown,
  toolName: string
): z.output<T> {
  const result = schema.safeParse(args);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new MCPError(
      MCPErrorCodes.INVALID_ARGUMENTS,
      `Invalid arguments for ${toolName}: ${errors}`,
      { issues: result.error.issues }
    );
  }

  return result.data;
}

/**
 * Validate list_files arguments
 */
export function validateListFilesArgs(args: unknown): ListFilesArgs {
  const validated = validateArgs(ListFilesArgsSchema, args, 'list_files');
  return {
    ...validated,
    directory: sanitizePath(validated.directory),
    pattern: validated.pattern ? sanitizeGlobPattern(validated.pattern) : undefined,
  };
}

/**
 * Validate read_file arguments
 */
export function validateReadFileArgs(args: unknown): ReadFileArgs {
  const validated = validateArgs(ReadFileArgsSchema, args, 'read_file');
  return {
    ...validated,
    path: sanitizePath(validated.path),
  };
}

/**
 * Validate search_files arguments
 */
export function validateSearchFilesArgs(args: unknown): SearchFilesArgs {
  const validated = validateArgs(SearchFilesArgsSchema, args, 'search_files');

  // Validate regex if is_regex is true
  if (validated.is_regex) {
    validateRegex(validated.pattern);
  }

  return {
    ...validated,
    glob: validated.glob ? sanitizeGlobPattern(validated.glob) : undefined,
  };
}

/**
 * Validate get_repo_overview arguments
 */
export function validateRepoOverviewArgs(args: unknown): RepoOverviewArgs {
  return validateArgs(RepoOverviewArgsSchema, args, 'get_repo_overview');
}
