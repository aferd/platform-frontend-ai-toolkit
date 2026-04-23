import * as path from 'path';
import * as fs from 'fs';
import { PathValidation } from '../types.js';

/**
 * Repository root directory (set during server initialization)
 */
let repoRoot: string = process.cwd();

/**
 * Initialize the repository root path
 */
export function setRepoRoot(rootPath: string): void {
  repoRoot = path.resolve(rootPath);
}

/**
 * Get the current repository root
 */
export function getRepoRoot(): string {
  return repoRoot;
}

/**
 * Test file path patterns that are allowed for write operations
 */
const WRITE_ALLOWED_PATTERNS = [
  /\/tests?\//,                    // /test/ or /tests/ directories
  /\.test\.(ts|tsx|js|jsx)$/,     // .test.ts, .test.tsx files
  /\.spec\.(ts|tsx|js|jsx)$/,     // .spec.ts, .spec.tsx files
  /\.stories\.(ts|tsx|js|jsx)$/,  // .stories.ts, .stories.tsx files
  /\/e2e\//,                       // /e2e/ directories
  /\/playwright\//,                // /playwright/ directories
  /playwright\.config\.(ts|js)$/,  // Playwright config files
];

/**
 * Patterns for files that should never be written
 */
const WRITE_FORBIDDEN_PATTERNS = [
  /\.py$/,                         // Python files (IQE tests)
  /\/iqe\//,                       // IQE directories
  /pytest\.ini$/,                  // Pytest config
  /conftest\.py$/,                 // Pytest fixtures
];

/**
 * Sanitize and validate a file path
 *
 * This function implements path jailing to ensure all operations
 * remain within the repository root and prevents directory traversal.
 *
 * @param inputPath - The path to validate
 * @returns PathValidation result
 */
export function validatePath(inputPath: string): PathValidation {
  try {
    // Resolve the path relative to repo root
    const resolved = path.resolve(repoRoot, inputPath);
    const relativePath = path.relative(repoRoot, resolved);

    // Check if path escapes the repository root
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return {
        isValid: false,
        sanitized: '',
        error: 'Path escapes repository root (directory traversal attempt)',
        isWriteAllowed: false,
      };
    }

    // Determine if write is allowed based on patterns
    const isWriteAllowed = isPathWriteAllowed(resolved);

    return {
      isValid: true,
      sanitized: resolved,
      error: undefined,
      isWriteAllowed,
    };
  } catch (error) {
    return {
      isValid: false,
      sanitized: '',
      error: `Path validation error: ${error instanceof Error ? error.message : String(error)}`,
      isWriteAllowed: false,
    };
  }
}

/**
 * Check if a path is allowed for write operations
 *
 * @param filePath - The absolute file path
 * @returns true if write is allowed
 */
export function isPathWriteAllowed(filePath: string): boolean {
  // Check forbidden patterns first
  if (WRITE_FORBIDDEN_PATTERNS.some(pattern => pattern.test(filePath))) {
    return false;
  }

  // Check allowed patterns
  return WRITE_ALLOWED_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Validate and sanitize a path for read operations
 *
 * @param inputPath - The path to read
 * @returns Sanitized absolute path
 * @throws Error if path is invalid
 */
export function validateReadPath(inputPath: string): string {
  const validation = validatePath(inputPath);

  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid path');
  }

  if (!fs.existsSync(validation.sanitized)) {
    throw new Error(`Path does not exist: ${inputPath}`);
  }

  return validation.sanitized;
}

/**
 * Validate and sanitize a path for write operations
 *
 * @param inputPath - The path to write
 * @returns Sanitized absolute path
 * @throws Error if path is invalid or write is not allowed
 */
export function validateWritePath(inputPath: string): string {
  const validation = validatePath(inputPath);

  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid path');
  }

  if (!validation.isWriteAllowed) {
    throw new Error(
      `Write operation not allowed for path: ${inputPath}\n` +
      'Write access is restricted to test files only:\n' +
      '- **/tests/** directories\n' +
      '- **/*.test.ts, **/*.test.tsx files\n' +
      '- **/*.spec.ts, **/*.spec.tsx files\n' +
      '- **/*.stories.ts, **/*.stories.tsx files\n' +
      '- Playwright E2E configuration files'
    );
  }

  return validation.sanitized;
}

/**
 * Safe file read with path validation
 *
 * @param filePath - Path to read
 * @returns File contents
 */
export function safeReadFile(filePath: string): string {
  const sanitized = validateReadPath(filePath);
  return fs.readFileSync(sanitized, 'utf-8');
}

/**
 * Safe file write with path validation (test files only)
 *
 * @param filePath - Path to write
 * @param content - Content to write
 */
export function safeWriteFile(filePath: string, content: string): void {
  const sanitized = validateWritePath(filePath);

  // Ensure directory exists
  const dir = path.dirname(sanitized);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(sanitized, content, 'utf-8');
}

/**
 * Safe directory listing with path validation
 *
 * @param dirPath - Directory to list
 * @returns Array of file/directory names
 */
export function safeReadDir(dirPath: string): string[] {
  const sanitized = validateReadPath(dirPath);

  const stats = fs.statSync(sanitized);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${dirPath}`);
  }

  return fs.readdirSync(sanitized);
}

/**
 * Check if path exists safely
 *
 * @param filePath - Path to check
 * @returns true if exists
 */
export function safeExists(filePath: string): boolean {
  const validation = validatePath(filePath);

  if (!validation.isValid) {
    return false;
  }

  return fs.existsSync(validation.sanitized);
}

/**
 * Get file stats safely
 *
 * @param filePath - Path to stat
 * @returns fs.Stats object
 */
export function safeStat(filePath: string): fs.Stats {
  const sanitized = validateReadPath(filePath);
  return fs.statSync(sanitized);
}
