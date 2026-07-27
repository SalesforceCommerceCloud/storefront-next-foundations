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
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { extractOperationMap, generateOperationFile } from './generate-operation-map';

describe('generate-operation-map', () => {
    const tempDirs: string[] = [];

    afterEach(() => {
        tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
    });

    const createTempDir = () => {
        const dir = mkdtempSync(join(tmpdir(), 'sfnext-scapi-operation-map-'));
        tempDirs.push(dir);
        return dir;
    };

    it('extracts operation names, methods, and paths from generated types', () => {
        const dir = createTempDir();
        const inputFile = join(dir, 'loyalty.ts');

        writeFileSync(
            inputFile,
            `export interface paths {
  "/customers/{customerId}/loyalty": {
    get: operations["getLoyaltyPoints"];
  };
  "/customers/{customerId}/history": {
    post: operations["createLoyaltyHistory"];
  };
}
`,
            'utf-8'
        );

        expect(extractOperationMap(inputFile)).toEqual({
            getLoyaltyPoints: {
                method: 'GET',
                path: '/customers/{customerId}/loyalty',
            },
            createLoyaltyHistory: {
                method: 'POST',
                path: '/customers/{customerId}/history',
            },
        });
    });

    it('generates optimized operation maps with a shared base path', () => {
        const dir = createTempDir();
        const inputFile = join(dir, 'loyalty.ts');

        writeFileSync(
            inputFile,
            `export interface paths {
  "/customers/{customerId}/loyalty": {
    get: operations["getLoyaltyPoints"];
  };
  "/customers/{customerId}/history": {
    post: operations["createLoyaltyHistory"];
  };
}
`,
            'utf-8'
        );

        const outputFile = generateOperationFile(inputFile);
        const content = readFileSync(outputFile, 'utf-8');

        expect(content).toContain("export const BASE_PATH = '/customers/{customerId}' as const;");
        expect(content).toContain("getLoyaltyPoints: { m: 'GET' as const, b: BASE_PATH, s: '/loyalty' }");
        expect(content).toContain("createLoyaltyHistory: { m: 'POST' as const, b: BASE_PATH, s: '/history' }");
    });

    it('throws when no operations can be extracted', () => {
        const dir = createTempDir();
        const inputFile = join(dir, 'empty.ts');

        writeFileSync(inputFile, 'export interface paths {}', 'utf-8');

        expect(() => generateOperationFile(inputFile)).toThrow('No operations found in empty.ts');
    });

    it('derives the base path from a single operation file', () => {
        const dir = createTempDir();
        const inputFile = join(dir, 'single-operation.ts');

        writeFileSync(
            inputFile,
            `export interface paths {
  "/customers/{customerId}/loyalty": {
    get: operations["getLoyaltyPoints"];
    };
}
`,
            'utf-8'
        );

        const outputFile = generateOperationFile(inputFile);
        const content = readFileSync(outputFile, 'utf-8');

        expect(content).toContain("export const BASE_PATH = '/customers/{customerId}' as const;");
        expect(content).toContain("getLoyaltyPoints: { m: 'GET' as const, b: BASE_PATH, s: '/loyalty' }");
    });

    it('ignores declarations outside the paths interface', () => {
        const dir = createTempDir();
        const inputFile = join(dir, 'mixed.ts');

        writeFileSync(
            inputFile,
            `export interface components {
  schemas: {};
}

export interface paths {
  "/products": {
    get: operations["getProducts"];
    };
}
`,
            'utf-8'
        );

        expect(extractOperationMap(inputFile)).toEqual({
            getProducts: {
                method: 'GET',
                path: '/products',
            },
        });
    });
});
