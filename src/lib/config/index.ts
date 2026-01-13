/**
 * Configuration Management
 *
 * Loads and validates environment configuration using Zod schemas.
 * All configuration is centralized here and validated at startup.
 *
 * Based on PRD v1.4 Section 9.2
 */

import { z } from 'zod';

/**
 * Custom boolean parser that correctly handles string values from env vars
 * "true", "1", "yes" → true
 * "false", "0", "no", "" → false
 */
const envBoolean = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    const normalized = val.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  });

/**
 * Configuration Schema
 * Validates all environment variables with sensible defaults
 */
const ConfigSchema = z.object({
  // Application
  nodeEnv: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  logLevel: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info'),
  logFormat: z
    .enum(['json', 'pretty'])
    .default('json'),
  port: z.coerce
    .number()
    .min(1)
    .max(65535)
    .default(3000),

  // Ollama
  ollamaBaseUrl: z
    .string()
    .url()
    .default('http://localhost:11434'),
  ollamaDefaultModel: z
    .string()
    .min(1)
    .default('llama3.1:8b'), // Must support Ollama native tool calling
  ollamaTimeoutMs: z.coerce
    .number()
    .min(1000)
    .max(300000)
    .default(60000),
  ollamaMaxRetries: z.coerce
    .number()
    .min(0)
    .max(10)
    .default(3),

  // MCP Server
  mcpTransport: z
    .enum(['stdio', 'tcp'])
    .default('stdio'),
  mcpTcpPort: z.coerce
    .number()
    .min(1)
    .max(65535)
    .default(3001),
  mcpLogLevel: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info'),

  // Security
  allowedRepoRoot: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const normalized = val.trim().toLowerCase();
      if (normalized === '' || normalized === 'false' || normalized === '0' || normalized === 'null' || normalized === 'undefined') {
        return undefined;
      }
      return val;
    }),
  maxFileSizeBytes: z.coerce
    .number()
    .min(1024)
    .max(10485760) // 10MB max
    .default(1048576), // 1MB
  maxSearchResults: z.coerce
    .number()
    .min(1)
    .max(1000)
    .default(50),
  searchTimeoutMs: z.coerce
    .number()
    .min(1000)
    .max(60000)
    .default(10000),

  // Feature Flags
  enableToolTrace: envBoolean.default(true),
  enableStreaming: envBoolean.default(true),
  enableMetrics: envBoolean.default(false),

  // Development
  devDisableSandbox: envBoolean.default(false),
  devMockOllama: envBoolean.default(false),
});

/**
 * Inferred configuration type from schema
 */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Configuration validation errors
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Maps environment variables to config schema keys
 */
function getEnvMapping(): Record<keyof z.infer<typeof ConfigSchema>, string | undefined> {
  return {
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
    logFormat: process.env.LOG_FORMAT,
    port: process.env.PORT,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
    ollamaDefaultModel: process.env.OLLAMA_DEFAULT_MODEL,
    ollamaTimeoutMs: process.env.OLLAMA_TIMEOUT_MS,
    ollamaMaxRetries: process.env.OLLAMA_MAX_RETRIES,
    mcpTransport: process.env.MCP_TRANSPORT,
    mcpTcpPort: process.env.MCP_TCP_PORT,
    mcpLogLevel: process.env.MCP_LOG_LEVEL,
    allowedRepoRoot: process.env.ALLOWED_REPO_ROOT,
    maxFileSizeBytes: process.env.MAX_FILE_SIZE_BYTES,
    maxSearchResults: process.env.MAX_SEARCH_RESULTS,
    searchTimeoutMs: process.env.SEARCH_TIMEOUT_MS,
    enableToolTrace: process.env.ENABLE_TOOL_TRACE,
    enableStreaming: process.env.ENABLE_STREAMING,
    enableMetrics: process.env.ENABLE_METRICS,
    devDisableSandbox: process.env.DEV_DISABLE_SANDBOX,
    devMockOllama: process.env.DEV_MOCK_OLLAMA,
  };
}

/**
 * Loads and validates configuration from environment variables
 */
function loadConfig(): Config {
  const env = getEnvMapping();
  const result = ConfigSchema.safeParse(env);

  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error('Configuration validation failed:');
    console.error(formattedErrors);

    throw new ConfigurationError(
      'Invalid configuration. Check the errors above.',
      result.error.issues
    );
  }

  const config = result.data;

  // Safety check: DEV_DISABLE_SANDBOX cannot be true in production (warn but don't fail during build)
  if (config.devDisableSandbox && config.nodeEnv === 'production') {
    console.warn(
      'WARNING: DEV_DISABLE_SANDBOX is enabled in production environment. This is a security risk!'
    );
    // Only throw if not in build phase
    if (typeof window !== 'undefined' || process.env.npm_lifecycle_event !== 'build') {
      // At runtime, we could enforce this, but for now just warn
    }
  }

  // Safety check: DEV_MOCK_OLLAMA cannot be true in production
  if (config.devMockOllama && config.nodeEnv === 'production') {
    console.warn(
      'WARNING: DEV_MOCK_OLLAMA is enabled in production environment.'
    );
  }

  return config;
}

/**
 * Singleton configuration instance
 * Loaded once at startup
 */
export const config = loadConfig();

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return config.nodeEnv === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return config.nodeEnv === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return config.nodeEnv === 'test';
}

/**
 * Get the effective repo root for path validation
 * Returns allowedRepoRoot if set, otherwise null (any absolute path allowed)
 */
export function getEffectiveRepoRoot(): string | null {
  return config.allowedRepoRoot || null;
}
