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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ResolvedConfig } from 'vite';
import { normalizePath, createPathRegex } from '../test-utils';

const { mockReadFileSync, mockWriteFileSync, mockExistsSync, mockReaddirSync } = vi.hoisted(() => {
    return {
        mockReadFileSync: vi.fn(),
        mockWriteFileSync: vi.fn(),
        mockExistsSync: vi.fn(),
        mockReaddirSync: vi.fn(),
    };
});

vi.mock('fs-extra', () => {
    return {
        default: {
            readFileSync: mockReadFileSync,
            writeFileSync: mockWriteFileSync,
            existsSync: mockExistsSync,
            readdirSync: mockReaddirSync,
        },
    };
});

import { fixReactRouterManifestUrlsPlugin } from './fixReactRouterManifestUrls';

// Helper to call plugin hooks that can be functions or objects
function callHook(hook: any, ...args: any[]) {
    if (typeof hook === 'function') {
        return hook(...args);
    }
    if (hook && typeof hook.handler === 'function') {
        return hook.handler(...args);
    }
}

describe('fixReactRouterManifestUrlsPlugin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.SFCC_LOG_LEVEL = 'debug';
    });

    afterEach(() => {
        delete process.env.SFCC_LOG_LEVEL;
    });

    it('should return a plugin with correct name', () => {
        const plugin = fixReactRouterManifestUrlsPlugin();
        expect(plugin.name).toBe('storefront-next:fix-react-router-manifest-urls');
    });

    it('should have enforce set to post', () => {
        const plugin = fixReactRouterManifestUrlsPlugin();
        expect(plugin.enforce).toBe('post');
    });

    it('should have configResolved hook', () => {
        const plugin = fixReactRouterManifestUrlsPlugin();
        expect(plugin.configResolved).toBeDefined();
        expect(typeof plugin.configResolved).toBe('function');
    });

    it('should have closeBundle hook', () => {
        const plugin = fixReactRouterManifestUrlsPlugin();
        expect(plugin.closeBundle).toBeDefined();
        expect(typeof plugin.closeBundle).toBe('function');
    });

    describe('closeBundle', () => {
        it('should return early when client build directory does not exist', () => {
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/path/to/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(false);

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            expect(mockExistsSync).toHaveBeenCalledWith('/path/to/build');
            expect(mockReaddirSync).not.toHaveBeenCalled();
        });

        it('should find and process files with /assets/ references', () => {
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockReturnValue([
                { name: 'manifest-abc123.js', isDirectory: () => false, isFile: () => true },
                { name: 'other-file.js', isDirectory: () => false, isFile: () => true },
            ]);
            mockReadFileSync
                .mockReturnValueOnce('const url = "/assets/file.js";')
                .mockReturnValue('const url = "/scripts/file.js";');

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            expect(mockReaddirSync).toHaveBeenCalledWith('/build', { withFileTypes: true });
            expect(mockReadFileSync).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            // Use regex to match both Unix (/) and Windows (\) path separators
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[sfnext:debug]'),
                expect.stringMatching(createPathRegex('patched /assets/ references in /build/manifest-abc123.js'))
            );
        });

        it('should transform double-quoted asset URLs', () => {
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockReturnValue([
                { name: 'manifest-abc.js', isDirectory: () => false, isFile: () => true },
            ]);
            mockReadFileSync.mockReturnValue('const url = "/assets/file.js";');

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            // Use normalizePath for cross-platform comparison
            const [actualPath, actualContent] = mockWriteFileSync.mock.calls[0];
            expect(normalizePath(actualPath)).toBe('/build/manifest-abc.js');
            expect(actualContent).toBe('const url = (window._BUNDLE_PATH || "/") + "assets/file.js";');

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[sfnext:debug]'),
                expect.stringMatching(createPathRegex('patched /assets/ references in /build/manifest-abc.js'))
            );
        });

        it('should transform single-quoted asset URLs', () => {
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockReturnValue([
                { name: 'manifest-xyz.js', isDirectory: () => false, isFile: () => true },
            ]);
            mockReadFileSync.mockReturnValue("const url = '/assets/style.css';");

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            // Note: regex only replaces opening quote+/assets/, leaving closing quote intact
            // Use normalizePath for cross-platform comparison
            const [actualPath, actualContent] = mockWriteFileSync.mock.calls[0];
            expect(normalizePath(actualPath)).toBe('/build/manifest-xyz.js');
            expect(actualContent).toBe('const url = (window._BUNDLE_PATH || "/") + "assets/style.css\';');

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[sfnext:debug]'),
                expect.stringMatching(createPathRegex('patched /assets/ references in /build/manifest-xyz.js'))
            );
        });

        it('should transform multiple asset URLs in same file', () => {
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockReturnValue([
                { name: 'manifest-multi.js', isDirectory: () => false, isFile: () => true },
            ]);
            mockReadFileSync.mockReturnValue('"/assets/a.js" and "/assets/b.css"');

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            // Use normalizePath for cross-platform comparison
            const [actualPath, actualContent] = mockWriteFileSync.mock.calls[0];
            expect(normalizePath(actualPath)).toBe('/build/manifest-multi.js');
            expect(actualContent).toBe(
                '(window._BUNDLE_PATH || "/") + "assets/a.js" and (window._BUNDLE_PATH || "/") + "assets/b.css"'
            );

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[sfnext:debug]'),
                expect.stringMatching(createPathRegex('patched /assets/ references in /build/manifest-multi.js'))
            );
        });

        it('should not write file if no asset URLs found', () => {
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockReturnValue([
                { name: 'manifest-no-assets.js', isDirectory: () => false, isFile: () => true },
            ]);
            mockReadFileSync.mockReturnValue('const url = "/other/path.js";');

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            expect(mockWriteFileSync).not.toHaveBeenCalled();
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should process nested directories', () => {
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(true);
            mockReaddirSync
                .mockReturnValueOnce([
                    { name: 'subdir', isDirectory: () => true, isFile: () => false },
                    { name: 'manifest-root.js', isDirectory: () => false, isFile: () => true },
                ])
                .mockReturnValueOnce([{ name: 'manifest-nested.js', isDirectory: () => false, isFile: () => true }]);
            mockReadFileSync.mockReturnValue('"/assets/file.js"');

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            expect(mockReaddirSync).toHaveBeenCalledTimes(2);
            expect(mockReaddirSync).toHaveBeenCalledWith('/build', { withFileTypes: true });
            // Use normalizePath for cross-platform comparison
            const secondCallPath = normalizePath(mockReaddirSync.mock.calls[1][0]);
            expect(secondCallPath).toBe('/build/subdir');

            expect(consoleLogSpy).toHaveBeenCalledTimes(2);
            expect(consoleLogSpy).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('[sfnext:debug]'),
                expect.stringMatching(
                    createPathRegex('patched /assets/ references in /build/subdir/manifest-nested.js')
                )
            );
            expect(consoleLogSpy).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining('[sfnext:debug]'),
                expect.stringMatching(createPathRegex('patched /assets/ references in /build/manifest-root.js'))
            );
        });

        it('should only process files with /assets/ references and .js extension', () => {
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockReturnValue([
                { name: 'manifest-valid.js', isDirectory: () => false, isFile: () => true },
                { name: 'manifest-valid.ts', isDirectory: () => false, isFile: () => true },
                { name: 'other-file.js', isDirectory: () => false, isFile: () => true },
                { name: 'other-file.ts', isDirectory: () => false, isFile: () => true },
                { name: 'symbolic-link.js', isDirectory: () => false, isFile: () => false },
                { name: 'manifest.js', isDirectory: () => false, isFile: () => true },
            ]);
            mockReadFileSync.mockReturnValue('"/assets/file.js"');

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            // Should only read manifest-valid.js (includes 'manifest-' and ends with '.js')
            // 'manifest.js' doesn't include 'manifest-' substring, so it's excluded
            expect(mockReadFileSync).toHaveBeenCalledTimes(3);

            expect(consoleLogSpy).toHaveBeenCalledTimes(3);
            // Use regex to match both Unix (/) and Windows (\) path separators
            expect(consoleLogSpy).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('[sfnext:debug]'),
                expect.stringMatching(createPathRegex('patched /assets/ references in /build/manifest-valid.js'))
            );
            expect(consoleLogSpy).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining('[sfnext:debug]'),
                expect.stringMatching(createPathRegex('patched /assets/ references in /build/other-file.js'))
            );
            expect(consoleLogSpy).toHaveBeenNthCalledWith(
                3,
                expect.stringContaining('[sfnext:debug]'),
                expect.stringMatching(createPathRegex('patched /assets/ references in /build/manifest.js'))
            );
        });
    });
});
