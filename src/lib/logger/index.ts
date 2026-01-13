/**
 * Logging Infrastructure
 *
 * Provides structured logging using Pino with configurable output formats.
 * All logs include service metadata and support request context.
 *
 * Based on PRD v1.4 Section 11
 */

import pino, { Logger, LoggerOptions } from 'pino';

// Import config conditionally to avoid circular dependencies
let logLevel = 'info';
let logFormat = 'pretty';
let nodeEnv = 'development';

// Try to load config, fall back to env vars
try {
  // We can't import config directly here due to potential circular deps
  logLevel = process.env.LOG_LEVEL || 'info';
  logFormat = process.env.LOG_FORMAT || 'pretty';
  nodeEnv = process.env.NODE_ENV || 'development';
} catch {
  // Use defaults if config loading fails
}

/**
 * Log entry metadata interface
 */
export interface LogMeta {
  request_id?: string;
  module?: string;
  duration_ms?: number;
  [key: string]: unknown;
}

/**
 * Error serialization for logs
 */
export interface SerializedError {
  code?: string;
  message: string;
  stack?: string;
  name: string;
}

/**
 * Serializes an error for logging
 */
export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: nodeEnv === 'development' ? error.stack : undefined,
      code: (error as { code?: string }).code,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

/**
 * Base logger options
 */
const baseOptions: LoggerOptions = {
  level: logLevel,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'engineering-assistant',
    version: process.env.npm_package_version || '0.1.0',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

/**
 * Create the logger instance
 * Uses pretty printing in development, JSON in production
 */
function createLogger(): Logger {
  if (logFormat === 'pretty' && nodeEnv !== 'production') {
    // Pretty print for development
    return pino({
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname,service,version',
        },
      },
    });
  }

  // JSON output for production
  return pino(baseOptions);
}

/**
 * Singleton logger instance
 */
export const logger = createLogger();

/**
 * Create a child logger for a specific module
 *
 * @param module - Module name for log context
 * @returns Child logger with module context
 *
 * @example
 * const log = createLogger('ollama-client');
 * log.info({ url }, 'Connecting to Ollama');
 */
export function createModuleLogger(module: string): Logger {
  return logger.child({ module });
}

/**
 * Create a child logger with request context
 *
 * @param requestId - Request ID for tracing
 * @param module - Optional module name
 * @returns Child logger with request context
 *
 * @example
 * const log = createRequestLogger('req_123', 'chat-handler');
 * log.info('Processing chat request');
 */
export function createRequestLogger(requestId: string, module?: string): Logger {
  return logger.child({ request_id: requestId, ...(module && { module }) });
}

/**
 * Log a request start event
 */
export function logRequestStart(
  log: Logger,
  method: string,
  path: string,
  meta?: LogMeta
): void {
  log.info({ msg: 'Request started', method, path, ...meta });
}

/**
 * Log a request completion event
 */
export function logRequestComplete(
  log: Logger,
  status: number,
  durationMs: number,
  meta?: LogMeta
): void {
  log.info({ msg: 'Request completed', status, duration_ms: durationMs, ...meta });
}

/**
 * Log a request failure event
 */
export function logRequestFailed(
  log: Logger,
  error: unknown,
  durationMs: number,
  meta?: LogMeta
): void {
  log.error({
    msg: 'Request failed',
    error: serializeError(error),
    duration_ms: durationMs,
    ...meta,
  });
}

/**
 * Log a tool call event
 */
export function logToolCall(
  log: Logger,
  tool: string,
  args: Record<string, unknown>,
  status: 'started' | 'completed' | 'error',
  result?: unknown,
  durationMs?: number,
  error?: unknown
): void {
  const baseLog = {
    msg: 'MCP tool called',
    tool,
    status,
    ...(status === 'started' && { arguments: args }),
    ...(status === 'completed' && { result, duration_ms: durationMs }),
    ...(status === 'error' && { error: serializeError(error), duration_ms: durationMs }),
  };

  if (status === 'error') {
    log.error(baseLog);
  } else {
    log.info(baseLog);
  }
}

/**
 * Default logger export for module consumers.
 */
export default logger;
