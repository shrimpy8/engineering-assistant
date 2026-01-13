/**
 * MCP Server Configuration
 *
 * Loads configuration from environment variables with sensible defaults.
 * Based on PRD v1.4 Section 7.1
 */

import { z } from 'zod';

/**
 * Configuration schema
 */
const MCPConfigSchema = z.object({
  transport: z.enum(['stdio', 'tcp']).default('stdio'),
  tcpPort: z.coerce.number().min(1).max(65535).default(3001),
  allowedRoot: z.string().optional(),
  maxFileSize: z.coerce.number().min(1024).default(1048576), // 1MB
  maxSearchResults: z.coerce.number().min(1).max(1000).default(50),
  searchTimeout: z.coerce.number().min(1000).max(60000).default(10000),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type MCPServerConfig = z.infer<typeof MCPConfigSchema>;

/**
 * Load configuration from environment
 */
function loadConfig(): MCPServerConfig {
  const env = {
    transport: process.env.MCP_TRANSPORT,
    tcpPort: process.env.MCP_TCP_PORT,
    allowedRoot: process.env.ALLOWED_REPO_ROOT || undefined,
    maxFileSize: process.env.MAX_FILE_SIZE_BYTES,
    maxSearchResults: process.env.MAX_SEARCH_RESULTS,
    searchTimeout: process.env.SEARCH_TIMEOUT_MS,
    logLevel: process.env.MCP_LOG_LEVEL,
  };

  const result = MCPConfigSchema.safeParse(env);

  if (!result.success) {
    console.error('MCP Server configuration error:');
    console.error(result.error.format());
    throw new Error('Invalid MCP server configuration');
  }

  return result.data;
}

export const config = loadConfig();

export default config;
