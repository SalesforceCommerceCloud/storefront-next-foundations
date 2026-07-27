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

import fs from 'fs';
import path from 'path';

// Cache for tsconfig paths to avoid repeated disk reads and JSON parsing
let cachedTsconfigPaths: Record<string, string[] | string> | null = null;
let cachedTsconfigRoot: string | null = null;

export const FILE_EXTENSIONS: string[] = ['.tsx', '.ts', '.d.ts'];

/**
 * Strip the comments from the JSON string
 * @param jsonString
 * @returns {string}
 */
function stripJsonComments(jsonString: string): string {
    return jsonString
        .replace(/\/\/.*$/gm, '') // remove // comments
        .replace(/\/\*[\s\S]*?\*\//g, ''); // remove /* */ comments
}

/**
 * Load the tsconfig.json paths from the project root
 * @param projectRoot
 * @returns {Record<string, string[] | string>}
 */
function loadTsconfigPaths(projectRoot: string): Record<string, string[] | string> | null {
    // If cache is valid for the same root, return it
    if (cachedTsconfigPaths && cachedTsconfigRoot === projectRoot) {
        return cachedTsconfigPaths;
    }

    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
        cachedTsconfigPaths = {}; // empty object
        cachedTsconfigRoot = projectRoot;
        return cachedTsconfigPaths;
    }

    try {
        const tsconfigContent = stripJsonComments(fs.readFileSync(tsconfigPath, 'utf-8'));
        const tsconfig = JSON.parse(tsconfigContent);
        const paths = tsconfig?.compilerOptions?.paths;
        if (paths && typeof paths === 'object') {
            cachedTsconfigPaths = paths;
        } else {
            cachedTsconfigPaths = {}; // empty object
        }
        cachedTsconfigRoot = projectRoot;
        return cachedTsconfigPaths;
    } catch (error) {
        throw new Error(`Error parsing tsconfig.json for project ${projectRoot}: ${String(error)}`);
    }
}

/**
 * Resolve the path from the alias to the real path by consulting tsconfig.json paths configuration
 * @param {string} importPath
 * @param {string} projectRoot
 * @returns {string}
 */
export function resolvePathFromAlias(importPath: string, projectRoot: string): string {
    // First check if this is a relative import - if so, return as is
    if (importPath.startsWith('.')) {
        return importPath;
    }

    // Load and cache tsconfig paths
    const paths = loadTsconfigPaths(projectRoot);
    if (!paths || typeof paths !== 'object' || Object.keys(paths).length === 0) {
        return importPath;
    }

    // Find matching alias
    for (const [alias, mappings] of Object.entries(paths)) {
        // Convert TypeScript path pattern to regex (escape '+' to literal, keep '*' as wildcard)
        const aliasEscapedPlus = alias.replace(/\+/g, '\\+');
        const aliasPattern = aliasEscapedPlus.replace(/\*/g, '(.*)');
        const aliasRegex = new RegExp(`^${aliasPattern}$`);
        const match = importPath.match(aliasRegex);

        if (match) {
            const mappingArray = Array.isArray(mappings) ? mappings : [mappings];
            // Try each mapping until we find an existing file
            for (const mapping of mappingArray) {
                // Replace wildcards in the mapping with captured groups
                let resolvedPath = mapping;
                for (let i = 1; i < match.length; i++) {
                    resolvedPath = resolvedPath.replace('*', match[i]);
                }

                // Remove leading "./" from the mapping if present
                if (resolvedPath.startsWith('./')) {
                    resolvedPath = resolvedPath.substring(2);
                }

                const fullPath = path.resolve(projectRoot, resolvedPath);

                // Check if the file exists (with common extensions)
                for (const ext of FILE_EXTENSIONS) {
                    const pathWithExt = fullPath + ext;
                    if (fs.existsSync(pathWithExt)) {
                        return pathWithExt;
                    }
                }

                // Also check if it's a directory with index file
                if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
                    for (const indexFile of ['index.ts', 'index.tsx', 'index.js', 'index.jsx']) {
                        const indexPath = path.join(fullPath, indexFile);
                        if (fs.existsSync(indexPath)) {
                            return indexPath;
                        }
                    }
                    // If directory exists but no index file, return the directory path
                    return fullPath;
                }
            }
        }
    }

    // If no existing file was found for this alias simply return the original import path
    return importPath;
}

export function isSupportedFileExtension(fileName: string): boolean {
    return FILE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}
