#!/usr/bin/env npx ts-node
/**
 * MCP Server Integration Test
 *
 * Tests the MCP server tools directly without the transport layer.
 */

import { createServer } from '../src/server.js';
import { createPathValidator } from '../src/validation/pathValidator.js';
import { listFiles, readFile, searchFiles, getRepoOverview } from '../src/tools/index.js';

const TEST_REPO = process.cwd();

async function runTests() {
  console.log('🧪 MCP Server Integration Tests\n');
  console.log(`Repository: ${TEST_REPO}\n`);

  const validator = createPathValidator(TEST_REPO, undefined);
  let passed = 0;
  let failed = 0;

  // Test 1: list_files
  console.log('Test 1: list_files');
  try {
    const result = await listFiles({ directory: '.', max_depth: 2 }, validator);
    if (result.files && result.files.length > 0) {
      console.log(`  ✅ Passed - Found ${result.total_count} files/dirs`);
      passed++;
    } else {
      console.log('  ❌ Failed - No files found');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed - ${error}`);
    failed++;
  }

  // Test 2: read_file
  console.log('\nTest 2: read_file');
  try {
    const result = await readFile(
      { path: 'package.json' },
      validator,
      1024 * 1024
    );
    if (result.content && result.content.includes('@engineering-assistant/mcp-server')) {
      console.log(`  ✅ Passed - Read ${result.size} bytes`);
      passed++;
    } else {
      console.log('  ❌ Failed - Content mismatch');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed - ${error}`);
    failed++;
  }

  // Test 3: search_files
  console.log('\nTest 3: search_files');
  try {
    const result = await searchFiles(
      { pattern: 'export', glob: '**/*.ts' },
      validator,
      50,
      10000
    );
    if (result.matches && result.matches.length > 0) {
      console.log(`  ✅ Passed - Found ${result.total_matches} matches in ${result.files_searched} files`);
      passed++;
    } else {
      console.log('  ❌ Failed - No matches found');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed - ${error}`);
    failed++;
  }

  // Test 4: get_repo_overview
  console.log('\nTest 4: get_repo_overview');
  try {
    const result = await getRepoOverview({ max_depth: 2, include_stats: true }, validator);
    if (result.structure && result.stats) {
      console.log(`  ✅ Passed - ${result.stats.total_files} files, ${result.stats.total_directories} dirs`);
      passed++;
    } else {
      console.log('  ❌ Failed - Missing structure or stats');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Failed - ${error}`);
    failed++;
  }

  // Test 5: Path traversal protection
  console.log('\nTest 5: Path traversal protection');
  try {
    await readFile({ path: '../../../etc/passwd' }, validator, 1024);
    console.log('  ❌ Failed - Should have blocked path traversal');
    failed++;
  } catch (error: any) {
    if (error.code === 'path_traversal' || error.message?.includes('traversal') || error.message?.includes('outside')) {
      console.log('  ✅ Passed - Path traversal blocked');
      passed++;
    } else {
      console.log(`  ❌ Failed - Wrong error: ${error.message}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(40));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
