/**
 * Structured logger for the MCP server.
 *
 * Uses pino with log level from MCP_LOG_LEVEL env var.
 * Writes to stderr so it doesn't interfere with the stdio MCP transport on stdout.
 */
import pino from 'pino';

export const logger = pino({
  level: process.env['MCP_LOG_LEVEL'] ?? 'info',
  transport: {
    target: 'pino/file',
    options: { destination: process.stderr.fd },
  },
});
