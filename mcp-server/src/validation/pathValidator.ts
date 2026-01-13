/**
 * Path Validation & Sandboxing
 *
 * Multi-layer security for file system access.
 * Prevents path traversal attacks and ensures all access is within allowed boundaries.
 *
 * Based on PRD v1.4 Section 7.3 and 10.2
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { AccessDeniedError } from '../errors/index.js';

/**
 * Suspicious patterns that indicate potential path traversal attempts
 */
const SUSPICIOUS_PATTERNS = ['..', '~', '$', '`', '\0', '%2e', '%2f', '%5c'];

/**
 * Path validator for sandboxed file system access
 */
export class PathValidator {
  private readonly allowedRoot: string;

  /**
   * Create a path validator
   *
   * @param allowedRoot - The root directory for all file operations
   */
  constructor(allowedRoot: string) {
    // Resolve to absolute path immediately
    this.allowedRoot = path.resolve(allowedRoot);
  }

  /**
   * Get the allowed root path
   */
  getAllowedRoot(): string {
    return this.allowedRoot;
  }

  /**
   * Layer 1: Input validation
   * Reject paths with suspicious patterns before any processing
   */
  private validateInput(inputPath: string): void {
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (inputPath.includes(pattern)) {
        throw new AccessDeniedError(
          inputPath,
          `Path contains suspicious pattern: ${pattern}`
        );
      }
    }

    // Check for null bytes (injection attack)
    if (inputPath.includes('\0')) {
      throw new AccessDeniedError(inputPath, 'Path contains null byte');
    }
  }

  /**
   * Layer 2: Path normalization and containment check
   * Ensure the resolved path is within the allowed root
   */
  private validateContainment(inputPath: string): string {
    // Resolve the full path
    const fullPath = path.resolve(this.allowedRoot, inputPath);

    // Normalize both paths for comparison
    const normalizedRoot = path.normalize(this.allowedRoot);
    const normalizedTarget = path.normalize(fullPath);

    // Check if path is exactly the root or starts with root + separator
    const isContained =
      normalizedTarget === normalizedRoot ||
      normalizedTarget.startsWith(normalizedRoot + path.sep);

    if (!isContained) {
      throw new AccessDeniedError(inputPath, this.allowedRoot);
    }

    return fullPath;
  }

  /**
   * Layer 3: Symlink escape prevention
   * Ensure symlinks don't point outside the allowed root
   */
  private async validateSymlinks(targetPath: string): Promise<string> {
    try {
      // Resolve all symlinks to get the real path
      const realPath = await fs.realpath(targetPath);

      // Check if real path is still within allowed root
      const normalizedRoot = path.normalize(this.allowedRoot);
      const normalizedReal = path.normalize(realPath);

      const isContained =
        normalizedReal === normalizedRoot ||
        normalizedReal.startsWith(normalizedRoot + path.sep);

      if (!isContained) {
        throw new AccessDeniedError(
          targetPath,
          `Symlink resolves outside allowed root`
        );
      }

      return realPath;
    } catch (error) {
      // If realpath fails (e.g., file doesn't exist), that's okay
      // The file existence check will happen later
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return targetPath;
      }
      throw error;
    }
  }

  /**
   * Validate a relative path and return the safe absolute path
   *
   * @param relativePath - Path relative to the allowed root
   * @returns Validated absolute path
   * @throws AccessDeniedError if path is not allowed
   */
  async validate(relativePath: string): Promise<string> {
    // Layer 1: Input validation
    this.validateInput(relativePath);

    // Layer 2: Containment check
    const fullPath = this.validateContainment(relativePath);

    // Layer 3: Symlink validation
    const safePath = await this.validateSymlinks(fullPath);

    return safePath;
  }

  /**
   * Validate a path synchronously (without symlink check)
   * Use when async validation is not possible
   *
   * @param relativePath - Path relative to the allowed root
   * @returns Validated absolute path
   * @throws AccessDeniedError if path is not allowed
   */
  validateSync(relativePath: string): string {
    // Layer 1: Input validation
    this.validateInput(relativePath);

    // Layer 2: Containment check
    return this.validateContainment(relativePath);
  }

  /**
   * Convert an absolute path back to relative (for responses)
   *
   * @param absolutePath - Absolute path within allowed root
   * @returns Relative path from allowed root
   */
  toRelative(absolutePath: string): string {
    return path.relative(this.allowedRoot, absolutePath);
  }

  /**
   * Check if a path is within the allowed root (without throwing)
   *
   * @param relativePath - Path to check
   * @returns true if path is allowed, false otherwise
   */
  isAllowed(relativePath: string): boolean {
    try {
      this.validateSync(relativePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a path validator for a given repository root
 *
 * @param repoRoot - Repository root path
 * @param globalAllowedRoot - Optional global restriction (from ALLOWED_REPO_ROOT)
 * @returns PathValidator instance
 * @throws AccessDeniedError if repoRoot is outside globalAllowedRoot
 */
export function createPathValidator(
  repoRoot: string,
  globalAllowedRoot?: string
): PathValidator {
  // If there's a global restriction, ensure repo root is within it
  if (globalAllowedRoot) {
    const normalizedGlobal = path.normalize(path.resolve(globalAllowedRoot));
    const normalizedRepo = path.normalize(path.resolve(repoRoot));

    const isAllowed =
      normalizedRepo === normalizedGlobal ||
      normalizedRepo.startsWith(normalizedGlobal + path.sep);

    if (!isAllowed) {
      throw new AccessDeniedError(
        repoRoot,
        `Repository must be inside ${globalAllowedRoot}`
      );
    }
  }

  return new PathValidator(repoRoot);
}

export default PathValidator;
