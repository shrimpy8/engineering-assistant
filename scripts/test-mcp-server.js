#!/usr/bin/env node

/**
 * Test script for the standalone MCP server
 *
 * Spawns the MCP server as a subprocess and communicates via JSON-RPC over stdio.
 */

import { spawn } from 'child_process';
import * as readline from 'readline';

const MCP_SERVER_PATH = './mcp-server/dist/index.js';

// Test repository paths
const TEST_REPOS = {
  typescript: '/Users/harshh/Documents/GitHub/movie-discovery',
  python: '/Users/harshh/Documents/GitHub/research-copilot',
};

let messageId = 1;

/**
 * Create a JSON-RPC request
 */
function createRequest(method, params = {}) {
  return {
    jsonrpc: '2.0',
    id: messageId++,
    method,
    params,
  };
}

/**
 * Test the MCP server with a repository
 */
async function testWithRepo(repoPath, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing MCP Server with: ${label}`);
  console.log(`Repo path: ${repoPath}`);
  console.log('='.repeat(60));

  return new Promise((resolve, reject) => {
    // Spawn the MCP server
    const server = spawn('node', [MCP_SERVER_PATH, repoPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdoutBuffer = '';
    const responses = [];
    const pendingRequests = new Map();

    // Handle stderr (server logs)
    server.stderr.on('data', (data) => {
      console.log('[Server Log]', data.toString().trim());
    });

    // Handle stdout (JSON-RPC responses)
    server.stdout.on('data', (data) => {
      stdoutBuffer += data.toString();

      // Try to parse complete JSON-RPC messages
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            responses.push(response);

            if (response.id && pendingRequests.has(response.id)) {
              const { resolve } = pendingRequests.get(response.id);
              pendingRequests.delete(response.id);
              resolve(response);
            }
          } catch (e) {
            // Not valid JSON, might be a partial message
          }
        }
      }
    });

    // Helper to send request and wait for response
    function sendRequest(method, params = {}) {
      return new Promise((resolveReq, rejectReq) => {
        const request = createRequest(method, params);
        pendingRequests.set(request.id, { resolve: resolveReq, reject: rejectReq });

        const requestStr = JSON.stringify(request) + '\n';
        console.log(`\n[Request] ${method}`);
        server.stdin.write(requestStr);

        // Timeout after 10 seconds
        setTimeout(() => {
          if (pendingRequests.has(request.id)) {
            pendingRequests.delete(request.id);
            rejectReq(new Error(`Timeout waiting for response to ${method}`));
          }
        }, 10000);
      });
    }

    // Run test sequence
    async function runTests() {
      try {
        // 1. Initialize
        console.log('\n--- Step 1: Initialize ---');
        const initResponse = await sendRequest('initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        });
        console.log('[Response] Initialize:', JSON.stringify(initResponse.result, null, 2));

        // 2. Send initialized notification
        const initializedNotification = {
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        };
        server.stdin.write(JSON.stringify(initializedNotification) + '\n');
        console.log('[Notification] initialized sent');

        // Wait a bit for server to process
        await new Promise(r => setTimeout(r, 500));

        // 3. List available tools
        console.log('\n--- Step 2: List Tools ---');
        const toolsResponse = await sendRequest('tools/list', {});
        console.log('[Response] Tools available:',
          toolsResponse.result.tools.map(t => t.name).join(', '));

        // 4. Call get_repo_overview
        console.log('\n--- Step 3: Call get_repo_overview ---');
        const overviewResponse = await sendRequest('tools/call', {
          name: 'get_repo_overview',
          arguments: {},
        });
        const overviewContent = JSON.parse(overviewResponse.result.content[0].text);
        console.log('[Response] Repository structure:');
        console.log(`  Root: ${overviewContent.root}`);
        console.log(`  Files: ${overviewContent.stats?.total_files || 'N/A'}`);
        console.log(`  Directories: ${overviewContent.stats?.total_directories || 'N/A'}`);

        // Show top languages
        const languages = overviewContent.stats?.languages || [];
        console.log(`  Languages: ${languages.map(l => l.extension).join(', ') || 'N/A'}`);

        // Helper to check root-level files only
        function hasRootFile(node, filename) {
          if (!node.children) return false;
          return node.children.some(child =>
            child.type === 'file' && child.name === filename
          );
        }

        // 5. Determine dependency file based on project structure
        let depFile = null;
        const structure = overviewContent.structure;

        // Check for Python files first (to prefer Python deps in mixed projects)
        const hasPython = languages.some(l => l.extension === '.py');
        const hasTS = languages.some(l => l.extension === '.ts' || l.extension === '.tsx');

        // Priority: Python deps first if it's a Python project
        if (hasPython) {
          if (hasRootFile(structure, 'pyproject.toml')) {
            depFile = 'pyproject.toml';
          } else if (hasRootFile(structure, 'requirements.txt')) {
            depFile = 'requirements.txt';
          } else if (hasRootFile(structure, 'setup.py')) {
            depFile = 'setup.py';
          }
        }

        // Fallback to JavaScript/TypeScript deps
        if (!depFile && hasRootFile(structure, 'package.json')) {
          depFile = 'package.json';
        }

        console.log(`\n  Has Python files: ${hasPython}`);
        console.log(`  Has TypeScript files: ${hasTS}`);
        console.log(`  Detected dependency file: ${depFile || 'none found'}`);

        // 6. Read dependency file
        if (!depFile) {
          console.log('\n--- Step 4: Skipped (no dependency file found) ---');
        } else {
          console.log(`\n--- Step 4: Call read_file(${depFile}) ---`);
          const readResponse = await sendRequest('tools/call', {
            name: 'read_file',
            arguments: { path: depFile },
          });

          if (readResponse.result.isError) {
            console.log('[Response] Error reading file:', readResponse.result.content[0].text);
          } else {
            const fileContent = JSON.parse(readResponse.result.content[0].text);
            console.log('[Response] File content preview:');
            const preview = fileContent.content.substring(0, 500);
            console.log(preview + (fileContent.content.length > 500 ? '...' : ''));
          }
        }

        console.log('\n✅ Test completed successfully!');
        resolve({ success: true, label });

      } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        resolve({ success: false, label, error: error.message });
      } finally {
        server.kill();
      }
    }

    server.on('error', (err) => {
      console.error('Failed to start server:', err);
      reject(err);
    });

    // Give server time to start, then run tests
    setTimeout(runTests, 1000);
  });
}

// Main
async function main() {
  console.log('MCP Server Subprocess Test');
  console.log('==========================\n');
  console.log('This test spawns the standalone MCP server and communicates');
  console.log('via JSON-RPC over stdio (the actual MCP protocol).\n');

  const results = [];

  // Test with TypeScript project
  try {
    const result = await testWithRepo(TEST_REPOS.typescript, 'TypeScript (movie-discovery)');
    results.push(result);
  } catch (e) {
    results.push({ success: false, label: 'TypeScript', error: e.message });
  }

  // Test with Python project
  try {
    const result = await testWithRepo(TEST_REPOS.python, 'Python (research-copilot)');
    results.push(result);
  } catch (e) {
    results.push({ success: false, label: 'Python', error: e.message });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  for (const r of results) {
    const status = r.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${r.label}${r.error ? `: ${r.error}` : ''}`);
  }
}

main().catch(console.error);
