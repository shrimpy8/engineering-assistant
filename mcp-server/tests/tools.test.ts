/**
 * Tool Implementation Tests
 *
 * Tests for MCP tool implementations.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createPathValidator, PathValidator } from '../src/validation/pathValidator.js';
import { listFiles } from '../src/tools/listFiles.js';
import { readFile } from '../src/tools/readFile.js';
import { searchFiles } from '../src/tools/searchFiles.js';
import { getRepoOverview } from '../src/tools/repoOverview.js';

const TEST_DIR = path.join(process.cwd(), 'tests', 'test-repo');
let validator: PathValidator;

describe('MCP Tools', () => {
  beforeAll(async () => {
    // Create test repository structure
    await fs.mkdir(TEST_DIR, { recursive: true });
    await fs.mkdir(path.join(TEST_DIR, 'src'), { recursive: true });
    await fs.mkdir(path.join(TEST_DIR, 'src', 'lib'), { recursive: true });
    await fs.mkdir(path.join(TEST_DIR, 'docs'), { recursive: true });

    // Create test files
    await fs.writeFile(
      path.join(TEST_DIR, 'package.json'),
      JSON.stringify({ name: 'test-repo', version: '1.0.0' }, null, 2)
    );
    await fs.writeFile(
      path.join(TEST_DIR, 'README.md'),
      '# Test Repository\n\nThis is a test repo.\n'
    );
    await fs.writeFile(
      path.join(TEST_DIR, 'src', 'index.ts'),
      'export function main() {\n  console.log("Hello");\n}\n'
    );
    await fs.writeFile(
      path.join(TEST_DIR, 'src', 'lib', 'utils.ts'),
      'export function add(a: number, b: number): number {\n  return a + b;\n}\n\nexport function subtract(a: number, b: number): number {\n  return a - b;\n}\n'
    );
    await fs.writeFile(
      path.join(TEST_DIR, 'docs', 'guide.md'),
      '# Guide\n\nSome documentation.\n'
    );

    // Create a hidden file
    await fs.writeFile(path.join(TEST_DIR, '.gitignore'), 'node_modules\n');

    validator = createPathValidator(TEST_DIR, undefined);
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('list_files', () => {
    it('lists files in root directory', async () => {
      const result = await listFiles({ directory: '.' }, validator);
      expect(result.files).toBeDefined();
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.files.some((f) => f.path === 'package.json')).toBe(true);
    });

    it('finds nested files with sufficient depth', async () => {
      // List from root with enough depth to find nested files
      const result = await listFiles({ max_depth: 5 }, validator);
      // Should find files in src/lib subdirectory
      expect(result.files.some((f) => f.path.includes('lib'))).toBe(true);
    });

    it('filters by glob pattern', async () => {
      const result = await listFiles({ pattern: '*.ts' }, validator);
      expect(result.files.every((f) => f.type === 'directory' || f.path.endsWith('.ts'))).toBe(true);
    });

    it('respects max_depth', async () => {
      const result = await listFiles({ max_depth: 1 }, validator);
      const hasDeepFile = result.files.some((f) => f.path.split('/').length > 2);
      expect(hasDeepFile).toBe(false);
    });

    it('excludes hidden files by default', async () => {
      const result = await listFiles({}, validator);
      expect(result.files.some((f) => f.path.startsWith('.'))).toBe(false);
    });

    it('includes hidden files when requested', async () => {
      const result = await listFiles({ include_hidden: true }, validator);
      expect(result.files.some((f) => f.path === '.gitignore')).toBe(true);
    });

    it('returns file metadata', async () => {
      const result = await listFiles({ pattern: 'package.json' }, validator);
      const pkgFile = result.files.find((f) => f.path === 'package.json');
      expect(pkgFile).toBeDefined();
      expect(pkgFile?.type).toBe('file');
      expect(pkgFile?.size).toBeGreaterThan(0);
      expect(pkgFile?.modified_at).toBeDefined();
    });
  });

  describe('read_file', () => {
    it('reads text file content', async () => {
      const result = await readFile({ path: 'README.md' }, validator, 1024 * 1024);
      expect(result.content).toContain('# Test Repository');
      expect(result.encoding).toBe('utf-8');
      expect(result.truncated).toBe(false);
    });

    it('reads JSON file content', async () => {
      const result = await readFile({ path: 'package.json' }, validator, 1024 * 1024);
      const parsed = JSON.parse(result.content);
      expect(parsed.name).toBe('test-repo');
    });

    it('respects max_bytes limit', async () => {
      const result = await readFile({ path: 'README.md', max_bytes: 10 }, validator, 1024 * 1024);
      expect(result.content.length).toBeLessThanOrEqual(10);
      expect(result.truncated).toBe(true);
    });

    it('throws for non-existent file', async () => {
      await expect(readFile({ path: 'nonexistent.txt' }, validator, 1024 * 1024)).rejects.toThrow();
    });

    it('throws for path traversal attempt', async () => {
      await expect(readFile({ path: '../../../etc/passwd' }, validator, 1024 * 1024)).rejects.toThrow();
    });

    it('returns file metadata', async () => {
      const result = await readFile({ path: 'package.json' }, validator, 1024 * 1024);
      expect(result.path).toBe('package.json');
      expect(result.size).toBeGreaterThan(0);
      expect(result.modified_at).toBeDefined();
    });
  });

  describe('search_files', () => {
    it('finds text matches', async () => {
      const result = await searchFiles({ pattern: 'export' }, validator, 50, 10000);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches.some((m) => m.path.includes('utils.ts'))).toBe(true);
    });

    it('returns context lines', async () => {
      const result = await searchFiles(
        { pattern: 'add', context_lines: 2 },
        validator,
        50,
        10000
      );
      const match = result.matches.find((m) => m.line_content.includes('function add'));
      expect(match).toBeDefined();
      expect(match?.context.after.length).toBeGreaterThan(0);
    });

    it('filters by glob pattern', async () => {
      const result = await searchFiles(
        { pattern: 'console', glob: '**/*.ts' },
        validator,
        50,
        10000
      );
      expect(result.matches.every((m) => m.path.endsWith('.ts'))).toBe(true);
    });

    it('supports case-insensitive search', async () => {
      const result = await searchFiles(
        { pattern: 'EXPORT', case_sensitive: false },
        validator,
        50,
        10000
      );
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('supports regex patterns', async () => {
      const result = await searchFiles(
        { pattern: 'function\\s+\\w+', is_regex: true },
        validator,
        50,
        10000
      );
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('respects max_results limit', async () => {
      const result = await searchFiles(
        { pattern: 'a', max_results: 2 },
        validator,
        50,
        10000
      );
      expect(result.matches.length).toBeLessThanOrEqual(2);
    });

    it('returns search metadata', async () => {
      const result = await searchFiles({ pattern: 'export' }, validator, 50, 10000);
      expect(result.files_searched).toBeGreaterThan(0);
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('get_repo_overview', () => {
    it('returns directory structure', async () => {
      const result = await getRepoOverview({ max_depth: 3 }, validator);
      expect(result.structure).toBeDefined();
      expect(result.structure.type).toBe('directory');
      expect(result.structure.children).toBeDefined();
    });

    it('returns file statistics', async () => {
      const result = await getRepoOverview({ include_stats: true }, validator);
      expect(result.stats).toBeDefined();
      expect(result.stats?.total_files).toBeGreaterThan(0);
      expect(result.stats?.total_directories).toBeGreaterThan(0);
      expect(result.stats?.total_size).toBeGreaterThan(0);
    });

    it('returns language breakdown', async () => {
      const result = await getRepoOverview({ include_stats: true }, validator);
      expect(result.stats?.languages).toBeDefined();
      expect(result.stats?.languages.some((l) => l.extension === '.ts')).toBe(true);
    });

    it('respects max_depth', async () => {
      const result = await getRepoOverview({ max_depth: 1 }, validator);

      // Check that we don't have deeply nested children
      const hasDeepNesting = result.structure.children?.some(
        (child) => child.type === 'directory' && child.children && child.children.length > 0 &&
          child.children.some((c) => c.type === 'directory' && c.children && c.children.length > 0)
      );
      expect(hasDeepNesting).toBeFalsy();
    });

    it('can exclude stats', async () => {
      const result = await getRepoOverview({ include_stats: false }, validator);
      expect(result.stats).toBeUndefined();
    });

    it('sorts children correctly', async () => {
      const result = await getRepoOverview({ max_depth: 2 }, validator);

      // Directories should come before files
      const children = result.structure.children || [];
      let sawFile = false;
      for (const child of children) {
        if (child.type === 'file') {
          sawFile = true;
        } else if (child.type === 'directory' && sawFile) {
          // If we see a directory after seeing a file, sorting is wrong
          expect(true).toBe(false);
        }
      }
    });
  });
});
