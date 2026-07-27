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
 * Generate operation maps from OpenAPI TypeScript definitions.
 *
 * Extracted from storefront-next-runtime/scripts/generate-operation-maps.ts
 * for reuse in the sfnext CLI.
 *
 * Input: A generated .ts file from openapi-typescript
 * Output: A .operations.ts file with operation name → { m, b, s } mappings
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';

interface ExtractedOperationInfo {
    method: string;
    path: string;
}

interface OptimizedOperationInfo {
    m: string;
    b: string;
    s: string;
}

type OperationMap = Record<string, ExtractedOperationInfo>;
type OptimizedOperationMap = Record<string, OptimizedOperationInfo>;

/**
 * Extract operation mappings from a generated TypeScript file.
 *
 * Parses the `paths` interface to find path strings, HTTP methods,
 * and operation references (e.g., operations["getCategories"]).
 */
export function extractOperationMap(filePath: string): OperationMap {
    const content = readFileSync(filePath, 'utf-8');
    const operations: OperationMap = {};
    const lines = content.split('\n');

    let currentPath: string | null = null;
    const validMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
    let insidePathsInterface = false;

    for (const line of lines) {
        if (line.match(/^export interface paths \{/)) {
            insidePathsInterface = true;
            continue;
        }

        if (insidePathsInterface && line.match(/^\}$/)) {
            break;
        }

        if (!insidePathsInterface) {
            continue;
        }

        const pathMatch = line.match(/^\s+"([^"]+)":\s*\{/);
        if (pathMatch) {
            currentPath = pathMatch[1];
            continue;
        }

        const operationMatch = line.match(/^\s+(\w+):\s*operations\["([^"]+)"\];?/);
        if (operationMatch && currentPath) {
            const [, method, operationName] = operationMatch;
            if (validMethods.includes(method.toLowerCase())) {
                operations[operationName] = {
                    method: method.toUpperCase(),
                    path: currentPath,
                };
            }
        }

        if (currentPath && line.match(/^\s{4}\};?\s*$/)) {
            currentPath = null;
        }
    }

    return operations;
}

/**
 * Find the longest common prefix for all paths.
 */
function findCommonBasePath(operations: OperationMap): string {
    const paths = Object.values(operations).map((op) => op.path);

    if (paths.length === 0) return '';
    if (paths.length === 1) {
        const lastSlashIndex = paths[0].lastIndexOf('/');
        return lastSlashIndex > 0 ? paths[0].substring(0, lastSlashIndex) : '';
    }

    let prefix = paths[0];
    for (let i = 1; i < paths.length; i++) {
        const current = paths[i];
        let j = 0;
        while (j < prefix.length && j < current.length && prefix[j] === current[j]) {
            j++;
        }
        prefix = prefix.substring(0, j);
        if (prefix.length === 0) return '';
    }

    const trimmed = prefix.replace(/\/+$/, '');
    if (!trimmed || !trimmed.includes('/')) return '';
    return trimmed;
}

/**
 * Convert an operation map to optimized format with abbreviated keys.
 */
function convertToOptimizedOperations(operations: OperationMap, basePath: string): OptimizedOperationMap {
    const optimizedOperations: OptimizedOperationMap = {};
    for (const [name, { method, path: opPath }] of Object.entries(operations)) {
        const suffix = opPath.startsWith(basePath) ? opPath.substring(basePath.length) : opPath;
        optimizedOperations[name] = { m: method, b: basePath, s: suffix };
    }
    return optimizedOperations;
}

/**
 * Generate an operation map file from a generated TypeScript types file.
 *
 * @param inputFile - Path to the openapi-typescript generated .ts file
 * @param outputFile - Path for the output .operations.ts file (defaults to same dir as input)
 * @returns The output file path
 */
export function generateOperationFile(inputFile: string, outputFile?: string): string {
    const operations = extractOperationMap(inputFile);
    const baseName = basename(inputFile, '.ts');

    if (!outputFile) {
        outputFile = join(dirname(inputFile), `${baseName}.operations.ts`);
    }

    const operationCount = Object.keys(operations).length;
    if (operationCount === 0) {
        throw new Error(`No operations found in ${baseName}.ts`);
    }

    const basePath = findCommonBasePath(operations);
    const optimizedOps = convertToOptimizedOperations(operations, basePath);
    const entries = Object.entries(optimizedOps)
        .map(([name, { m, s }]) => `  ${name}: { m: '${m}' as const, b: BASE_PATH, s: '${s}' }`)
        .join(',\n');

    const output = `/**
 * Auto-generated operation map for ${baseName}
 *
 * Generated by sfnext scapi — do not edit manually.
 *
 * Property abbreviations:
 * - m: HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)
 * - b: Base path shared across operations
 * - s: Suffix path unique to this operation
 */

export const BASE_PATH = '${basePath}' as const;

export const operations = {
${entries}
} as const;
`;

    writeFileSync(outputFile, output, 'utf-8');
    return outputFile;
}
