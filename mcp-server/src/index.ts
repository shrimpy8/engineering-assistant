#!/usr/bin/env node

/**
 * Engineering Assistant MCP Server
 *
 * Entry point for the MCP server.
 * Provides sandboxed file system access for code analysis.
 *
 * Usage:
 *   ea-mcp-server <repo-path>
 *   npm run start -- <repo-path>
 *
 * Based on PRD v1.4 Section 7
 */

import { startServer } from './server.js';

/**
 * Parse command line arguments
 */
function parseArgs(): { repoPath: string } {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: ea-mcp-server <repo-path>');
    console.error('');
    console.error('Arguments:');
    console.error('  repo-path    Absolute path to the repository to analyze');
    console.error('');
    console.error('Environment Variables:');
    console.error('  ALLOWED_REPO_ROOT    Restrict repos to paths inside this directory');
    console.error('  MAX_FILE_SIZE_BYTES  Maximum file size to read (default: 1MB)');
    console.error('  MAX_SEARCH_RESULTS   Maximum search results (default: 50)');
    console.error('  SEARCH_TIMEOUT_MS    Search timeout in ms (default: 10000)');
    console.error('  MCP_LOG_LEVEL        Log level: debug|info|warn|error');
    process.exit(1);
  }

  const repoPath = args[0];

  // Validate it's an absolute path
  if (!repoPath.startsWith('/')) {
    console.error('Error: repo-path must be an absolute path');
    process.exit(1);
  }

  return { repoPath };
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const { repoPath } = parseArgs();
    await startServer(repoPath);
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Run
main();
