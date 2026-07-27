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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import List from './list';
import { readAllSchemaMetadata } from '../../scapi/schema-utils';

vi.mock('../../scapi/schema-utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../scapi/schema-utils')>();
    return {
        ...actual,
        readAllSchemaMetadata: vi.fn(),
    };
});

describe('scapi list command', () => {
    const mockReadAllSchemaMetadata = vi.mocked(readAllSchemaMetadata);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('prints an empty-state message when no clients are registered', async () => {
        const cmd = new List([], {} as never);
        const logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});
        mockReadAllSchemaMetadata.mockReturnValue([]);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: { 'project-directory': '/project' },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(mockReadAllSchemaMetadata).toHaveBeenCalledWith(join('/project', 'src', 'scapi', 'schemas'));
        expect(logSpy).toHaveBeenNthCalledWith(1, 'No SCAPI client overrides or custom APIs registered.');
        expect(logSpy).toHaveBeenNthCalledWith(2, 'Use `sfnext scapi add` to add one.');
    });

    it('prints the registered client metadata', async () => {
        const cmd = new List([], {} as never);
        const logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});
        mockReadAllSchemaMetadata.mockReturnValue([
            {
                clientKey: 'loyalty',
                basePath: '/custom/loyalty/v1',
                supportsLocale: true,
                orgPrefix: true,
                schemaName: 'loyalty-v1',
            },
            {
                clientKey: 'storeInventory',
                basePath: '/custom/store-inventory/v1',
                supportsLocale: false,
                orgPrefix: false,
                schemaName: 'store-inventory-v1',
            },
        ]);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: { 'project-directory': '/project' },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        const output = logSpy.mock.calls.map(([line]) => line).join('\n');
        expect(output).toContain('Registered SCAPI clients (2):');
        expect(output).toContain('loyalty');
        expect(output).toContain('schemas/loyalty-v1.yaml');
        expect(output).toContain('/custom/loyalty/v1');
        expect(output).toContain('Locale:  yes');
        expect(output).toContain('storeInventory');
        expect(output).toContain('/custom/store-inventory/v1');
        expect(output).toContain('Locale:  no');
    });
});
