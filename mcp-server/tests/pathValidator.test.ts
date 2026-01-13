/**
 * Path Validator Tests
 *
 * Tests for path validation and sandboxing functionality.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createPathValidator } from '../src/validation/pathValidator.js';

const TEST_DIR = path.join(process.cwd(), 'tests', 'fixtures');
const OUTSIDE_DIR = '/tmp/mcp-test-outside';

describe('PathValidator', () => {
  beforeAll(async () => {
    // Create test directories
    await fs.mkdir(TEST_DIR, { recursive: true });
    await fs.writeFile(path.join(TEST_DIR, 'test.txt'), 'test content');
    await fs.mkdir(path.join(TEST_DIR, 'subdir'), { recursive: true });
    await fs.writeFile(path.join(TEST_DIR, 'subdir', 'nested.txt'), 'nested');
  });

  describe('createPathValidator', () => {
    it('creates a validator for a valid repo path', () => {
      const validator = createPathValidator(TEST_DIR, undefined);
      expect(validator).toBeDefined();
      expect(validator.getAllowedRoot()).toBe(TEST_DIR);
    });

    it('resolves relative repo path to absolute', () => {
      // createPathValidator resolves relative paths - doesn't throw
      const validator = createPathValidator('./relative', undefined);
      expect(validator.getAllowedRoot()).toContain('relative');
    });
  });

  describe('validate', () => {
    it('validates absolute paths within repo', async () => {
      const validator = createPathValidator(TEST_DIR, undefined);
      const result = await validator.validate('test.txt');
      expect(result).toBe(path.join(TEST_DIR, 'test.txt'));
    });

    it('validates nested paths', async () => {
      const validator = createPathValidator(TEST_DIR, undefined);
      const result = await validator.validate('subdir/nested.txt');
      expect(result).toBe(path.join(TEST_DIR, 'subdir', 'nested.txt'));
    });

    it('blocks path traversal with ../', async () => {
      const validator = createPathValidator(TEST_DIR, undefined);
      await expect(validator.validate('../../../etc/passwd')).rejects.toThrow();
    });

    it('blocks path traversal with encoded characters', async () => {
      const validator = createPathValidator(TEST_DIR, undefined);
      await expect(validator.validate('..%2F..%2Fetc/passwd')).rejects.toThrow();
    });

    it('blocks absolute paths outside repo', async () => {
      const validator = createPathValidator(TEST_DIR, undefined);
      await expect(validator.validate('/etc/passwd')).rejects.toThrow();
    });

    it('handles current directory .', async () => {
      const validator = createPathValidator(TEST_DIR, undefined);
      const result = await validator.validate('.');
      expect(result).toBe(TEST_DIR);
    });
  });

  describe('toRelative', () => {
    it('converts absolute path to relative', () => {
      const validator = createPathValidator(TEST_DIR, undefined);
      const result = validator.toRelative(path.join(TEST_DIR, 'subdir', 'file.txt'));
      expect(result).toBe('subdir/file.txt');
    });

    it('returns relative path even for paths outside repo', () => {
      // toRelative uses path.relative() which computes relative path from root
      const validator = createPathValidator(TEST_DIR, undefined);
      const result = validator.toRelative('/some/other/path');
      // Should start with ../ since it's outside the repo
      expect(result).toContain('..');
    });
  });

  describe('allowedRoot restriction', () => {
    it('allows repo within allowed root', () => {
      const allowedRoot = path.dirname(TEST_DIR);
      const validator = createPathValidator(TEST_DIR, allowedRoot);
      expect(validator.getAllowedRoot()).toBe(TEST_DIR);
    });

    it('rejects repo outside allowed root', () => {
      const allowedRoot = '/home/allowed';
      expect(() => createPathValidator(TEST_DIR, allowedRoot)).toThrow();
    });
  });
});
