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
import GenerateCartridge from './generate-cartridge';
import fs from 'fs-extra';
import { generateMetadata } from '../cartridge-services/generate-cartridge';
import { validateCartridgeMetadata } from '../cartridge-services/validate-cartridge';

// Mock dependencies
vi.mock('fs-extra', () => ({
    default: {
        existsSync: vi.fn(() => true),
        mkdirSync: vi.fn(),
    },
}));

vi.mock('../cartridge-services/generate-cartridge', () => ({
    generateMetadata: vi.fn(() => Promise.resolve()),
}));

vi.mock('../cartridge-services/validate-cartridge', () => ({
    validateCartridgeMetadata: vi.fn(() =>
        Promise.resolve({
            results: [],
            totalFiles: 0,
            validFiles: 0,
            totalErrors: 0,
            skippedFiles: [],
        })
    ),
}));

describe('generate-cartridge command', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });

    it('should call generateMetadata with correct paths', async () => {
        const cmd = new GenerateCartridge([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/test/project',
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });
        vi.spyOn(cmd, 'log').mockImplementation(() => {});

        await cmd.run();

        expect(generateMetadata).toHaveBeenCalledWith(
            '/test/project',
            expect.stringContaining('app_storefrontnext_base')
        );
    });

    it('should error if project directory does not exist', async () => {
        (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

        const cmd = new GenerateCartridge([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/nonexistent/project',
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });
        vi.spyOn(cmd, 'error').mockImplementation((msg) => {
            throw new Error(msg as string);
        });

        await expect(cmd.run()).rejects.toThrow("doesn't exist");
    });

    it('should create metadata directory if it does not exist', async () => {
        // First call (project dir) returns true, second call (metadata dir) returns false
        (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValueOnce(true).mockReturnValueOnce(false);

        const cmd = new GenerateCartridge([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/test/project',
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });
        vi.spyOn(cmd, 'log').mockImplementation(() => {});

        await cmd.run();

        expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('app_storefrontnext_base'), {
            recursive: true,
        });
    });

    it('should log success message after generation', async () => {
        const cmd = new GenerateCartridge([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/test/project',
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });
        const logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});

        await cmd.run();

        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('generated successfully'));
    });

    it('should run validation after generation', async () => {
        const cmd = new GenerateCartridge([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/test/project',
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });
        vi.spyOn(cmd, 'log').mockImplementation(() => {});

        await cmd.run();

        expect(validateCartridgeMetadata).toHaveBeenCalledWith(expect.stringContaining('app_storefrontnext_base'));
    });

    it('should display validation errors at root path without location', async () => {
        (validateCartridgeMetadata as ReturnType<typeof vi.fn>).mockResolvedValue({
            results: [
                {
                    valid: false,
                    filePath: '/test/project/cartridges/bad.json',
                    schemaType: null,
                    errors: [{ path: '/', message: 'invalid format' }],
                },
            ],
            totalFiles: 1,
            validFiles: 0,
            totalErrors: 1,
            skippedFiles: [],
        });

        const cmd = new GenerateCartridge([], {} as never);
        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: { 'project-directory': '/test/project' },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });
        const logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});
        vi.spyOn(cmd, 'error').mockImplementation((msg) => {
            throw new Error(msg as string);
        });

        await expect(cmd.run()).rejects.toThrow('Generated metadata has validation errors');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('invalid format'));
    });

    it('should error when validation finds errors', async () => {
        (validateCartridgeMetadata as ReturnType<typeof vi.fn>).mockResolvedValue({
            results: [
                {
                    valid: false,
                    filePath: '/test/project/cartridges/bad.json',
                    schemaType: 'componenttype',
                    errors: [{ path: '/name', message: 'is required' }],
                },
            ],
            totalFiles: 1,
            validFiles: 0,
            totalErrors: 1,
            skippedFiles: [],
        });

        const cmd = new GenerateCartridge([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/test/project',
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });
        vi.spyOn(cmd, 'log').mockImplementation(() => {});
        vi.spyOn(cmd, 'error').mockImplementation((msg) => {
            throw new Error(msg as string);
        });

        await expect(cmd.run()).rejects.toThrow('Generated metadata has validation errors');
    });
});
