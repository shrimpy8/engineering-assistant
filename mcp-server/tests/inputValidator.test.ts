/**
 * Input Validator Tests
 *
 * Tests for input argument validation and sanitization.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizePath,
  sanitizeGlobPattern,
  escapeRegex,
  validateRegex,
  validateListFilesArgs,
  validateReadFileArgs,
  validateSearchFilesArgs,
  validateRepoOverviewArgs,
} from '../src/validation/inputValidator.js';

describe('Sanitization Functions', () => {
  describe('sanitizePath', () => {
    it('removes null bytes', () => {
      expect(sanitizePath('test\0file.txt')).toBe('testfile.txt');
    });

    it('normalizes backslashes to forward slashes', () => {
      expect(sanitizePath('src\\lib\\file.ts')).toBe('src/lib/file.ts');
    });

    it('handles clean paths unchanged', () => {
      expect(sanitizePath('src/lib/file.ts')).toBe('src/lib/file.ts');
    });
  });

  describe('sanitizeGlobPattern', () => {
    it('allows valid glob characters', () => {
      expect(sanitizeGlobPattern('**/*.ts')).toBe('**/*.ts');
    });

    it('allows bracket patterns (commas stripped)', () => {
      // Note: Current implementation strips commas for security
      expect(sanitizeGlobPattern('*.{ts,js}')).toBe('*.{tsjs}');
    });

    it('removes invalid characters', () => {
      // Semicolons and spaces are removed
      expect(sanitizeGlobPattern('*.ts;rm -rf /')).toBe('*.tsrm-rf/');
    });

    it('allows question mark wildcards', () => {
      expect(sanitizeGlobPattern('file?.txt')).toBe('file?.txt');
    });
  });

  describe('escapeRegex', () => {
    it('escapes special regex characters', () => {
      expect(escapeRegex('test.file')).toBe('test\\.file');
      expect(escapeRegex('(foo)')).toBe('\\(foo\\)');
      expect(escapeRegex('a*b+c?')).toBe('a\\*b\\+c\\?');
    });

    it('handles plain text unchanged', () => {
      expect(escapeRegex('plaintext')).toBe('plaintext');
    });
  });

  describe('validateRegex', () => {
    it('validates valid regex patterns', () => {
      expect(validateRegex('test.*')).toBeInstanceOf(RegExp);
      expect(validateRegex('^start')).toBeInstanceOf(RegExp);
    });

    it('throws for invalid regex patterns', () => {
      expect(() => validateRegex('[')).toThrow();
      expect(() => validateRegex('*invalid')).toThrow();
    });
  });
});

describe('Argument Validation', () => {
  describe('validateListFilesArgs', () => {
    it('validates with default values', () => {
      const result = validateListFilesArgs({});
      expect(result.directory).toBe('.');
      expect(result.max_depth).toBe(3);
      expect(result.include_hidden).toBe(false);
    });

    it('validates custom arguments', () => {
      const result = validateListFilesArgs({
        directory: 'src',
        pattern: '*.ts',
        max_depth: 5,
        include_hidden: true,
      });
      expect(result.directory).toBe('src');
      expect(result.pattern).toBe('*.ts');
      expect(result.max_depth).toBe(5);
      expect(result.include_hidden).toBe(true);
    });

    it('clamps max_depth to valid range', () => {
      expect(() => validateListFilesArgs({ max_depth: 0 })).toThrow();
      expect(() => validateListFilesArgs({ max_depth: 11 })).toThrow();
    });

    it('sanitizes directory path', () => {
      const result = validateListFilesArgs({ directory: 'src\\lib' });
      expect(result.directory).toBe('src/lib');
    });
  });

  describe('validateReadFileArgs', () => {
    it('requires path argument', () => {
      expect(() => validateReadFileArgs({})).toThrow();
    });

    it('validates with default values', () => {
      const result = validateReadFileArgs({ path: 'test.txt' });
      expect(result.path).toBe('test.txt');
      expect(result.max_bytes).toBe(100000);
      expect(result.encoding).toBe('utf-8');
    });

    it('validates base64 encoding', () => {
      const result = validateReadFileArgs({
        path: 'image.png',
        encoding: 'base64',
      });
      expect(result.encoding).toBe('base64');
    });

    it('rejects invalid encoding', () => {
      expect(() =>
        validateReadFileArgs({ path: 'test.txt', encoding: 'ascii' })
      ).toThrow();
    });
  });

  describe('validateSearchFilesArgs', () => {
    it('requires pattern argument', () => {
      expect(() => validateSearchFilesArgs({})).toThrow();
    });

    it('validates with default values', () => {
      const result = validateSearchFilesArgs({ pattern: 'test' });
      expect(result.pattern).toBe('test');
      expect(result.is_regex).toBe(false);
      expect(result.max_results).toBe(50);
      expect(result.context_lines).toBe(2);
      expect(result.case_sensitive).toBe(false);
    });

    it('validates regex patterns when is_regex is true', () => {
      const result = validateSearchFilesArgs({
        pattern: 'test.*',
        is_regex: true,
      });
      expect(result.is_regex).toBe(true);
    });

    it('throws for invalid regex when is_regex is true', () => {
      expect(() =>
        validateSearchFilesArgs({ pattern: '[', is_regex: true })
      ).toThrow();
    });

    it('clamps max_results to valid range', () => {
      expect(() => validateSearchFilesArgs({ pattern: 'test', max_results: 0 })).toThrow();
      expect(() => validateSearchFilesArgs({ pattern: 'test', max_results: 1001 })).toThrow();
    });
  });

  describe('validateRepoOverviewArgs', () => {
    it('validates with default values', () => {
      const result = validateRepoOverviewArgs({});
      expect(result.max_depth).toBe(2);
      expect(result.include_stats).toBe(true);
    });

    it('validates custom arguments', () => {
      const result = validateRepoOverviewArgs({
        max_depth: 4,
        include_stats: false,
      });
      expect(result.max_depth).toBe(4);
      expect(result.include_stats).toBe(false);
    });

    it('clamps max_depth to valid range', () => {
      expect(() => validateRepoOverviewArgs({ max_depth: 0 })).toThrow();
      expect(() => validateRepoOverviewArgs({ max_depth: 6 })).toThrow();
    });
  });
});
