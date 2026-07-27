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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCartridgeMetadata } from '../validate-cartridge';

vi.mock('glob', () => ({
    glob: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@salesforce/b2c-tooling-sdk/operations/content', () => ({
    validateMetaDefinitionFile: vi.fn(),
    MetaDefinitionDetectionError: class MetaDefinitionDetectionError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'MetaDefinitionDetectionError';
        }
    },
}));

import { glob } from 'glob';
import {
    validateMetaDefinitionFile,
    MetaDefinitionDetectionError,
} from '@salesforce/b2c-tooling-sdk/operations/content';

describe('validateCartridgeMetadata', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return empty results when no files found', async () => {
        (glob as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const summary = await validateCartridgeMetadata('/test/metadata');

        expect(summary).toEqual({
            results: [],
            totalFiles: 0,
            validFiles: 0,
            totalErrors: 0,
            skippedFiles: [],
        });
    });

    it('should validate files and return results', async () => {
        (glob as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
            '/test/metadata/pages/home.json',
            '/test/metadata/components/hero.json',
        ]);

        (validateMetaDefinitionFile as ReturnType<typeof vi.fn>)
            .mockReturnValueOnce({
                valid: true,
                filePath: '/test/metadata/pages/home.json',
                schemaType: 'pagetype',
                errors: [],
            })
            .mockReturnValueOnce({
                valid: true,
                filePath: '/test/metadata/components/hero.json',
                schemaType: 'componenttype',
                errors: [],
            });

        const summary = await validateCartridgeMetadata('/test/metadata');

        expect(summary.totalFiles).toBe(2);
        expect(summary.validFiles).toBe(2);
        expect(summary.totalErrors).toBe(0);
        expect(summary.skippedFiles).toEqual([]);
    });

    it('should count errors from invalid files', async () => {
        (glob as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(['/test/metadata/components/bad.json']);

        (validateMetaDefinitionFile as ReturnType<typeof vi.fn>).mockReturnValue({
            valid: false,
            filePath: '/test/metadata/components/bad.json',
            schemaType: 'componenttype',
            errors: [
                { path: '/name', message: 'is required' },
                { path: '/region_definitions', message: 'is required' },
            ],
        });

        const summary = await validateCartridgeMetadata('/test/metadata');

        expect(summary.totalFiles).toBe(1);
        expect(summary.validFiles).toBe(0);
        expect(summary.totalErrors).toBe(2);
    });

    it('should skip files with MetaDefinitionDetectionError', async () => {
        (glob as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
            '/test/metadata/unknown.json',
            '/test/metadata/pages/home.json',
        ]);

        (validateMetaDefinitionFile as ReturnType<typeof vi.fn>)
            .mockImplementationOnce(() => {
                throw new MetaDefinitionDetectionError('Cannot detect type');
            })
            .mockReturnValueOnce({
                valid: true,
                filePath: '/test/metadata/pages/home.json',
                schemaType: 'pagetype',
                errors: [],
            });

        const summary = await validateCartridgeMetadata('/test/metadata');

        expect(summary.totalFiles).toBe(1);
        expect(summary.skippedFiles).toEqual(['unknown.json']);
    });

    it('should rethrow non-MetaDefinitionDetectionError errors', async () => {
        (glob as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(['/test/metadata/bad.json']);

        (validateMetaDefinitionFile as ReturnType<typeof vi.fn>).mockImplementation(() => {
            throw new Error('Unexpected error');
        });

        await expect(validateCartridgeMetadata('/test/metadata')).rejects.toThrow('Unexpected error');
    });
});
