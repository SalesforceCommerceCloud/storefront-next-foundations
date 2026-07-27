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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Remove from './remove';
import { readAllSchemaMetadata } from '../../scapi/schema-utils';
import { generateCustomClientsFile } from '../../scapi/generate-custom-clients';

vi.mock('../../scapi/schema-utils', () => ({
    readAllSchemaMetadata: vi.fn(),
}));

vi.mock('../../scapi/generate-custom-clients', () => ({
    generateCustomClientsFile: vi.fn(),
}));

describe('scapi remove command', () => {
    const tempDirs: string[] = [];
    const mockReadAllSchemaMetadata = vi.mocked(readAllSchemaMetadata);
    const mockGenerateCustomClientsFile = vi.mocked(generateCustomClientsFile);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
    });

    const createProjectDir = () => {
        const projectDir = mkdtempSync(join(tmpdir(), 'sfnext-scapi-remove-'));
        tempDirs.push(projectDir);
        mkdirSync(join(projectDir, 'src', 'scapi', 'schemas'), { recursive: true });
        mkdirSync(join(projectDir, 'src', 'scapi', 'generated'), { recursive: true });
        return projectDir;
    };

    it('removes schema, metadata, generated files, and regenerates the registry', async () => {
        const projectDir = createProjectDir();
        const schemaPath = join(projectDir, 'src', 'scapi', 'schemas', 'loyalty-v1.yaml');
        const metaPath = join(projectDir, 'src', 'scapi', 'schemas', 'loyalty-v1.meta.json');
        const typesPath = join(projectDir, 'src', 'scapi', 'generated', 'loyalty-v1.ts');
        const opsPath = join(projectDir, 'src', 'scapi', 'generated', 'loyalty-v1.operations.ts');

        [schemaPath, metaPath, typesPath, opsPath].forEach((filePath) => writeFileSync(filePath, 'test', 'utf-8'));

        mockReadAllSchemaMetadata.mockReturnValue([
            {
                clientKey: 'loyalty',
                basePath: '/custom/loyalty/v1',
                supportsLocale: false,
                orgPrefix: true,
                schemaName: 'loyalty-v1',
            },
        ]);

        const cmd = new Remove([], {} as never);
        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: { 'project-directory': projectDir },
            args: { name: 'loyalty' },
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(existsSync(schemaPath)).toBe(false);
        expect(existsSync(metaPath)).toBe(false);
        expect(existsSync(typesPath)).toBe(false);
        expect(existsSync(opsPath)).toBe(false);
        expect(mockGenerateCustomClientsFile).toHaveBeenCalledWith(join(projectDir, 'src', 'scapi'));
    });

    it('throws when the client key is not registered', async () => {
        const projectDir = createProjectDir();
        const cmd = new Remove([], {} as never);

        mockReadAllSchemaMetadata.mockReturnValue([]);
        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: { 'project-directory': projectDir },
            args: { name: 'missingClient' },
            argv: [],
            raw: [],
            metadata: {},
        });
        vi.spyOn(cmd as any, 'error').mockImplementation((...args: unknown[]) => {
            throw new Error(String(args[0]));
        });

        await expect(cmd.run()).rejects.toThrow(
            'No registered client found with key "missingClient". Run `sfnext scapi list` to see registered clients.'
        );
    });

    it('removes the override namespace wrapper for built-in client overrides', async () => {
        const projectDir = createProjectDir();
        const schemaPath = join(projectDir, 'src', 'scapi', 'schemas', 'shopper-products-v1.yaml');
        const metaPath = join(projectDir, 'src', 'scapi', 'schemas', 'shopper-products-v1.meta.json');
        const typesPath = join(projectDir, 'src', 'scapi', 'generated', 'shopper-products-v1.ts');
        const opsPath = join(projectDir, 'src', 'scapi', 'generated', 'shopper-products-v1.operations.ts');
        const namespacePath = join(projectDir, 'src', 'scapi', 'generated', 'shopper-products-v1.namespace.ts');

        [schemaPath, metaPath, typesPath, opsPath, namespacePath].forEach((filePath) =>
            writeFileSync(filePath, 'test', 'utf-8')
        );

        mockReadAllSchemaMetadata.mockReturnValue([
            {
                clientKey: 'shopperProducts',
                basePath: '/product/shopper-products/v1',
                supportsLocale: true,
                orgPrefix: true,
                kind: 'override',
                schemaName: 'shopper-products-v1',
            },
        ]);

        const cmd = new Remove([], {} as never);
        const logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});
        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: { 'project-directory': projectDir },
            args: { name: 'shopperProducts' },
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(existsSync(namespacePath)).toBe(false);
        expect(existsSync(typesPath)).toBe(false);
        expect(existsSync(opsPath)).toBe(false);
        expect(mockGenerateCustomClientsFile).toHaveBeenCalledWith(join(projectDir, 'src', 'scapi'));
        const logLines = logSpy.mock.calls.map(([line]) => line);
        expect(logLines).toContain(`Updated ${join('src', 'scapi', 'index.ts')}`);
    });

    it('regenerates the registry even when generated files are already absent', async () => {
        const projectDir = createProjectDir();
        const schemaPath = join(projectDir, 'src', 'scapi', 'schemas', 'loyalty-v1.yaml');

        writeFileSync(schemaPath, 'test', 'utf-8');
        mockReadAllSchemaMetadata.mockReturnValue([
            {
                clientKey: 'loyalty',
                basePath: '/custom/loyalty/v1',
                supportsLocale: false,
                orgPrefix: true,
                schemaName: 'loyalty-v1',
            },
        ]);

        const cmd = new Remove([], {} as never);
        const logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});
        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: { 'project-directory': projectDir },
            args: { name: 'loyalty' },
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(existsSync(schemaPath)).toBe(false);
        expect(mockGenerateCustomClientsFile).toHaveBeenCalledWith(join(projectDir, 'src', 'scapi'));
        const logLines = logSpy.mock.calls.map(([line]) => line);
        expect(logLines).toContain(`Updated ${join('src', 'scapi', 'custom-clients.ts')}`);
    });
});
