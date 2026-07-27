/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Converts a path to use POSIX separators (forward slashes) and removes
 * Windows drive letter prefix if present. This is a test-only utility
 * kept self-contained to avoid interference with vi.mock of production modules.
 *
 * @param p - The path to convert
 * @returns The path with forward slashes and no drive letter
 */
export function toPosixPath(p: string): string {
    let result = p.replace(/\\/g, '/');
    // Remove Windows drive letter prefix (e.g., "C:" or "D:")
    if (/^[A-Za-z]:/.test(result)) {
        result = result.slice(2);
    }
    return result;
}

/**
 * Checks if the actual path ends with the expected path segments.
 * This is useful when Windows adds a drive letter prefix.
 *
 * @param actual - The actual path (may have drive letter on Windows)
 * @param expected - The expected path pattern (Unix-style)
 * @returns True if actual path ends with expected path
 */
export function pathEndsWith(actual: string, expected: string): boolean {
    const normalizedActual = toPosixPath(actual);
    const normalizedExpected = toPosixPath(expected);
    return normalizedActual.endsWith(normalizedExpected);
}

/**
 * Compares two paths for equality, ignoring platform differences.
 * Uses toPosixPath to normalize both paths before comparing.
 *
 * @param actual - The actual path
 * @param expected - The expected path (Unix-style starting with /)
 * @returns True if paths are equivalent
 */
export function pathsEqual(actual: string, expected: string): boolean {
    // toPosixPath now handles drive letter removal and separator normalization
    return toPosixPath(actual) === toPosixPath(expected);
}

/**
 * Creates a regex pattern that matches a path regardless of separator style
 * and optional drive letter prefix.
 *
 * @param pathPattern - The path pattern using forward slashes
 * @returns A regex that matches the path on any platform
 */
export function createPathRegex(pathPattern: string): RegExp {
    // Escape special regex characters except forward slash
    const escaped = pathPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Replace forward slashes with pattern that matches both / and \
    const pattern = escaped.replace(/\//g, '[/\\\\]');
    // Allow optional drive letter prefix (e.g., C: or D:)
    return new RegExp(`(?:[A-Za-z]:)?${pattern}`);
}

// Keep normalizePath as an alias for backwards compatibility
export const normalizePath = toPosixPath;
