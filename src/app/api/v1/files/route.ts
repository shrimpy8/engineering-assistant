/**
 * Files API Endpoint
 *
 * GET /api/v1/files
 * GET /api/v1/files?path=src/index.ts
 *
 * Browse and read repository files.
 * Wraps MCP tools for the frontend.
 *
 * Based on PRD v1.4 Section 6.4.4
 */

import { NextRequest } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createResponseContext, successResponse, errorResponse } from '@/lib/api';
import { logRequestStart, logRequestEnd, logRequestError } from '@/lib/api/logging';
import { AppError } from '@/lib/errors';
import { validateRepoPath } from '@/lib/api/validation';
import { ErrorCodes } from '@/lib/errors/codes';
import type { FileEntry, ListFilesData, ReadFileData } from '@/types/api';

/** Directories to exclude from listings (build artifacts, dependencies) */
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '__pycache__',
  '.cache',
]);

/**
 * GET /api/v1/files
 *
 * Lists files in a repository directory or reads file content.
 *
 * @param request - Next.js request with query params:
 *   - repo: Repository root path (default: cwd)
 *   - path: Relative path within repo (default: ".")
 *   - read: If true, returns file content instead of listing
 *
 * @returns Stripe-style response with file entries or content
 *
 * @example
 * // List directory:
 * GET /api/v1/files?repo=/path/to/repo&path=src
 *
 * // Read file:
 * GET /api/v1/files?repo=/path/to/repo&path=src/index.ts&read=true
 */
export async function GET(request: NextRequest) {
  const ctx = createResponseContext(request.headers);
  logRequestStart(ctx, request);

  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path') || '.';
    const read = searchParams.get('read') === 'true';
    const repoPath = searchParams.get('repo') || process.cwd();
    const repoRoot = await validateRepoPath(repoPath);

    // Security: Validate path is within repo (avoid prefix bypasses like /repo vs /repo2)
    const fullPath = path.resolve(repoRoot, filePath);
    const relative = path.relative(repoRoot, fullPath);

    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      return errorResponse(
        ErrorCodes.ACCESS_DENIED,
        'Path traversal not allowed',
        ctx,
        { param: 'path' }
      );
    }

    const stat = await fs.stat(fullPath).catch(() => null);

    if (!stat) {
      return errorResponse(
        ErrorCodes.FILE_NOT_FOUND,
        'Path not found',
        ctx,
        { param: 'path' }
      );
    }

    if (stat.isFile()) {
      // Read file content
      if (!read) {
        // Just return file info
        const data: ListFilesData = {
          path: filePath,
          entries: [
            {
              name: path.basename(filePath),
              path: filePath,
              type: 'file',
              size: stat.size,
              modified_at: stat.mtime.toISOString(),
            },
          ],
        };
        const response = successResponse(data, ctx);
        logRequestEnd(ctx, response.status);
        return response;
      }

      // Apply a size cap to avoid unbounded reads from the GET endpoint.
      const maxBytesParam = Number(searchParams.get('max_bytes') || 100000);
      const maxBytes = Number.isFinite(maxBytesParam) && maxBytesParam > 0
        ? Math.min(maxBytesParam, 10_485_760)
        : 100000;
      const encodingParam = searchParams.get('encoding');
      const encoding = encodingParam === 'base64' ? 'base64' : 'utf-8';
      const bytesToRead = Math.min(stat.size, maxBytes);
      const truncated = stat.size > maxBytes;

      const handle = await fs.open(fullPath, 'r');
      let content: string;
      try {
        const buffer = Buffer.alloc(bytesToRead);
        await handle.read(buffer, 0, bytesToRead, 0);
        content = encoding === 'base64' ? buffer.toString('base64') : buffer.toString('utf-8');
      } finally {
        await handle.close();
      }

      const data: ReadFileData = {
        path: filePath,
        content,
        size: stat.size,
        modified_at: stat.mtime.toISOString(),
        encoding,
        truncated,
      };
      const response = successResponse(data, ctx);
      logRequestEnd(ctx, response.status);
      return response;
    }

    // List directory contents
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const fileEntries: FileEntry[] = [];

    for (const entry of entries) {
      // Skip hidden files and excluded directories
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;

      const entryPath = path.join(filePath, entry.name);
      const fullEntryPath = path.join(fullPath, entry.name);

      try {
        const entryStat = await fs.stat(fullEntryPath);
        fileEntries.push({
          name: entry.name,
          path: entryPath === '.' ? entry.name : entryPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? entryStat.size : undefined,
          modified_at: entryStat.mtime.toISOString(),
        });
      } catch {
        // Skip files we can't stat
      }
    }

    // Sort: directories first, then alphabetically
    fileEntries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    const data: ListFilesData = {
      path: filePath,
      entries: fileEntries,
    };
    const response = successResponse(data, ctx);
    logRequestEnd(ctx, response.status);
    return response;
  } catch (error) {
    logRequestError(ctx, error);
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, ctx, {
        param: error.param,
        details: error.details,
      });
    }

    console.error('Files API error:', error);

    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Internal server error',
      ctx
    );
  }
}
