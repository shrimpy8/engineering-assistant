/**
 * read_file Tool
 *
 * Reads file contents from the repository.
 * Based on PRD v1.4 Section 7.2.2
 */

import * as fs from 'fs/promises';
import { PathValidator } from '../validation/pathValidator.js';
import { validateReadFileArgs } from '../validation/inputValidator.js';
import {
  FileNotFoundError,
  FileTooLargeError,
  BinaryFileError,
  toMCPError,
} from '../errors/index.js';

/**
 * read_file result
 */
export interface ReadFileResult {
  path: string;
  content: string;
  size: number;
  modified_at: string;
  encoding: string;
  truncated: boolean;
}

/**
 * Binary file detection patterns (magic bytes)
 */
const BINARY_PATTERNS = [
  /^\x7fELF/, // ELF
  /^MZ/, // Windows executable
  /^\x89PNG/, // PNG
  /^\xff\xd8\xff/, // JPEG
  /^GIF8[79]a/, // GIF
  /^PK/, // ZIP
  /^\x1f\x8b/, // gzip
];

/**
 * File extensions that are always considered binary
 */
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.webp',
  '.bmp',
  '.svg', // Usually text but can have issues
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.bz2',
  '.7z',
  '.rar',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.wasm',
  '.pyc',
  '.class',
  '.o',
  '.obj',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.mp3',
  '.mp4',
  '.wav',
  '.avi',
  '.mov',
  '.sqlite',
  '.db',
]);

/**
 * Check if a buffer looks like binary data
 */
function isBinaryContent(buffer: Buffer): boolean {
  // Check magic bytes
  const header = buffer.slice(0, 16).toString('binary');
  for (const pattern of BINARY_PATTERNS) {
    if (pattern.test(header)) {
      return true;
    }
  }

  // Check for null bytes in the first 8KB (common in binary files)
  const checkLength = Math.min(buffer.length, 8192);
  for (let i = 0; i < checkLength; i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }

  return false;
}

/**
 * Execute read_file tool
 */
export async function readFile(
  args: unknown,
  validator: PathValidator,
  maxFileSize: number
): Promise<ReadFileResult> {
  // Validate arguments
  const params = validateReadFileArgs(args);

  try {
    // Validate and resolve file path
    const filePath = await validator.validate(params.path);

    // Check if file exists and get stats
    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new FileNotFoundError(params.path);
      }
      throw error;
    }

    // Check if it's a file
    if (!stat.isFile()) {
      throw new FileNotFoundError(params.path);
    }

    // Check file size against configured max
    const effectiveMaxSize = Math.min(params.max_bytes, maxFileSize);
    if (stat.size > maxFileSize) {
      throw new FileTooLargeError(params.path, stat.size, maxFileSize);
    }

    // Check for binary extension
    const ext = params.path.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    if (BINARY_EXTENSIONS.has(ext)) {
      if (params.encoding !== 'base64') {
        throw new BinaryFileError(params.path);
      }
    }

    // Read file content
    const buffer = await fs.readFile(filePath);

    // Check for binary content
    if (params.encoding === 'utf-8' && isBinaryContent(buffer)) {
      throw new BinaryFileError(params.path);
    }

    // Determine if truncation is needed
    const truncated = buffer.length > effectiveMaxSize;
    const contentBuffer = truncated
      ? buffer.slice(0, effectiveMaxSize)
      : buffer;

    // Encode content
    let content: string;
    if (params.encoding === 'base64') {
      content = contentBuffer.toString('base64');
    } else {
      content = contentBuffer.toString('utf-8');
    }

    return {
      path: params.path,
      content,
      size: stat.size,
      modified_at: stat.mtime.toISOString(),
      encoding: params.encoding,
      truncated,
    };
  } catch (error) {
    throw toMCPError(error);
  }
}

/**
 * Tool definition for MCP registration
 */
export const readFileDefinition = {
  name: 'read_file',
  description:
    'Read the contents of a file from the repository. Supports text files (UTF-8) and binary files (base64).',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'File path relative to repository root',
      },
      max_bytes: {
        type: 'number',
        description: 'Maximum bytes to read. Default: 100000 (100KB)',
        default: 100000,
        minimum: 1,
      },
      encoding: {
        type: 'string',
        description: 'Output encoding. Default: utf-8',
        enum: ['utf-8', 'base64'],
        default: 'utf-8',
      },
    },
    required: ['path'],
  },
};
