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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateFromSchema } from './generate-types';
import { generateOperationFile } from './generate-operation-map';

const mockOpenApiDefault = vi.fn();
const mockAstToString = vi.fn();

vi.mock('openapi-typescript', () => ({
    default: mockOpenApiDefault,
    astToString: mockAstToString,
}));

vi.mock('./generate-operation-map', () => ({
    generateOperationFile: vi.fn(),
}));

describe('generateFromSchema', () => {
    const tempDirs: string[] = [];
    const mockGenerateOperationFile = vi.mocked(generateOperationFile);

    afterEach(() => {
        vi.clearAllMocks();
        tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
    });

    const createTempDir = () => {
        const dir = mkdtempSync(join(tmpdir(), 'sfnext-scapi-generate-types-'));
        tempDirs.push(dir);
        return dir;
    };

    it('writes generated types and then creates the operation map file', async () => {
        const dir = createTempDir();
        const schemaPath = join(dir, 'schema.yaml');
        const outputDir = join(dir, 'generated');
        const expectedTypesFile = join(outputDir, 'loyalty-v1.ts');
        const expectedOperationsFile = join(outputDir, 'loyalty-v1.operations.ts');

        mockOpenApiDefault.mockResolvedValue({ kind: 'mock-ast' });
        mockAstToString.mockReturnValue('export interface paths {}');
        mockGenerateOperationFile.mockReturnValue(expectedOperationsFile);

        const result = await generateFromSchema(schemaPath, outputDir, 'loyalty-v1');

        expect(mockOpenApiDefault).toHaveBeenCalledWith(new URL(`file://${schemaPath}`));
        expect(mockAstToString).toHaveBeenCalledWith({ kind: 'mock-ast' });
        expect(existsSync(expectedTypesFile)).toBe(true);
        expect(readFileSync(expectedTypesFile, 'utf-8')).toBe('export interface paths {}');
        expect(mockGenerateOperationFile).toHaveBeenCalledWith(expectedTypesFile);
        expect(result).toEqual({
            typesFile: expectedTypesFile,
            operationsFile: expectedOperationsFile,
        });
    });
});
