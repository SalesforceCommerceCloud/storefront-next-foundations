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
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

/**
 * Parse TypeScript paths from tsconfig.json and convert to jiti alias format.
 *
 * @param tsconfigPath - Path to tsconfig.json
 * @param projectDirectory - Project root directory for resolving relative paths
 * @returns Record of alias mappings for jiti
 *
 * @example
 * // tsconfig.json: { "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }
 * // Returns: { "@/": "/absolute/path/to/src/" }
 */
export function parseTsconfigPaths(tsconfigPath: string, projectDirectory: string): Record<string, string> {
    const alias: Record<string, string> = {};

    if (!existsSync(tsconfigPath)) {
        return alias;
    }

    try {
        const tsconfigContent = readFileSync(tsconfigPath, 'utf-8');
        const tsconfig = JSON.parse(tsconfigContent) as {
            compilerOptions?: {
                paths?: Record<string, string[]>;
                baseUrl?: string;
            };
        };

        const paths = tsconfig.compilerOptions?.paths;
        const baseUrl = tsconfig.compilerOptions?.baseUrl || '.';

        if (paths) {
            for (const [key, values] of Object.entries(paths)) {
                if (values && values.length > 0) {
                    // Convert TypeScript path pattern to jiti alias
                    // e.g., "@/*": ["./src/*"] -> "@/": "<projectDir>/src/"
                    const aliasKey = key.replace(/\/\*$/, '/');
                    const aliasValue = values[0].replace(/\/\*$/, '/').replace(/^\.\//, '');
                    alias[aliasKey] = resolve(projectDirectory, baseUrl, aliasValue);
                }
            }
        }
    } catch {
        // Ignore tsconfig parse errors - caller can work without aliases
    }

    // Sort by key length descending so specific aliases match before wildcards.
    const sortedAlias: Record<string, string> = {};
    Object.keys(alias)
        .sort((a, b) => b.length - a.length)
        .forEach((key) => {
            sortedAlias[key] = alias[key];
        });

    return sortedAlias;
}

export interface TsImportOptions {
    /** Project directory for resolving paths */
    projectDirectory: string;
    /** Optional path to tsconfig.json (defaults to projectDirectory/tsconfig.json) */
    tsconfigPath?: string;
}

/**
 * Import a TypeScript file using jiti with proper path alias resolution.
 * This is a cross-platform alternative to tsx that works on Windows.
 *
 * @param filePath - Absolute path to the TypeScript file to import
 * @param options - Import options including project directory
 * @returns The imported module
 */
export async function importTypescript<T = unknown>(filePath: string, options: TsImportOptions): Promise<T> {
    const { projectDirectory, tsconfigPath = resolve(projectDirectory, 'tsconfig.json') } = options;

    const { createJiti } = await import('jiti');
    const alias = parseTsconfigPaths(tsconfigPath, projectDirectory);

    const jiti = createJiti(import.meta.url, {
        fsCache: false,
        interopDefault: true,
        alias,
    });

    return jiti.import(filePath);
}
