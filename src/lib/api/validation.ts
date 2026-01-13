/**
 * API validation helpers
 *
 * Centralizes common validation for API routes to keep handlers DRY.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AppError, ErrorCodes } from '@/lib/errors';
import { config } from '@/lib/config';

/**
 * Validate repo path per PRD rules and return the normalized absolute root.
 */
export async function validateRepoPath(repoPath: string): Promise<string> {
  if (!repoPath) {
    throw new AppError(ErrorCodes.MISSING_PARAMETER, 'Repository path is required', {
      param: 'repo_path',
    });
  }

  if (!path.isAbsolute(repoPath)) {
    throw new AppError(ErrorCodes.REPO_PATH_INVALID, 'Repository path must be absolute', {
      param: 'repo_path',
    });
  }

  const resolved = path.resolve(repoPath);

  if (config.allowedRepoRoot) {
    const allowedRoot = path.resolve(config.allowedRepoRoot);
    const relative = path.relative(allowedRoot, resolved);

    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new AppError(
        ErrorCodes.REPO_PATH_INVALID,
        `Repository must be inside ${allowedRoot}`,
        { param: 'repo_path' }
      );
    }
  }

  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new AppError(ErrorCodes.REPO_PATH_NOT_FOUND, 'Repository path not found', {
      param: 'repo_path',
    });
  }

  return resolved;
}
