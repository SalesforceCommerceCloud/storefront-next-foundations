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
import path from 'node:path';
import { buildMiddlewareRegistryPlugin } from './buildMiddlewareRegistry';

// Mock fs
vi.mock('fs', () => ({
    existsSync: vi.fn(),
}));

// Mock tsdown
const mockTsdownBuild = vi.fn();
vi.mock('tsdown', () => ({
    build: mockTsdownBuild,
}));

import { existsSync } from 'fs';
const mockExistsSync = vi.mocked(existsSync);

describe('buildMiddlewareRegistryPlugin', () => {
    // Use any type to avoid complex Vite type issues
    const testRoot = path.resolve('/test/project');
    const mockResolvedConfig: any = {
        root: testRoot,
        resolve: {
            alias: [{ find: '@', replacement: path.join(testRoot, 'src') }],
        },
        __reactRouterPluginContext: {
            reactRouterConfig: {
                buildDirectory: path.join(testRoot, 'build'),
            },
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockTsdownBuild.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should create a plugin with correct metadata', () => {
        const plugin: any = buildMiddlewareRegistryPlugin();

        expect(plugin.name).toBe('storefront-next:build-middleware-registry');
        expect(plugin.apply).toBe('build');
        expect(plugin.buildApp).toBeDefined();
        expect(plugin.buildApp.order).toBe('post');
    });

    it('should skip build when middleware-registry.ts does not exist', async () => {
        mockExistsSync.mockReturnValue(false);

        const plugin: any = buildMiddlewareRegistryPlugin();
        plugin.configResolved(mockResolvedConfig);

        // Execute the buildApp handler
        await plugin.buildApp.handler();

        expect(mockExistsSync).toHaveBeenCalledWith(path.join(testRoot, 'src/server/middleware-registry.ts'));
        expect(mockTsdownBuild).not.toHaveBeenCalled();
    });

    it('should call tsdown build when middleware-registry.ts exists', async () => {
        mockExistsSync.mockReturnValue(true);

        const plugin: any = buildMiddlewareRegistryPlugin();
        plugin.configResolved(mockResolvedConfig);

        await plugin.buildApp.handler();

        expect(mockExistsSync).toHaveBeenCalledWith(path.join(testRoot, 'src/server/middleware-registry.ts'));
        expect(mockTsdownBuild).toHaveBeenCalledTimes(1);
    });

    it('should use correct tsdown build configuration', async () => {
        mockExistsSync.mockReturnValue(true);

        const plugin: any = buildMiddlewareRegistryPlugin();
        plugin.configResolved(mockResolvedConfig);

        await plugin.buildApp.handler();

        const buildCall = mockTsdownBuild.mock.calls[0][0];
        expect(buildCall.cwd).toBe(testRoot);
        expect(buildCall.entry).toEqual({
            'middleware-registry': path.join(testRoot, 'src/server/middleware-registry.ts'),
        });
        expect(buildCall.outDir).toBe(path.join(testRoot, 'build/server'));
        expect(buildCall.format).toEqual(['esm']);
        expect(buildCall.platform).toBe('node');
        expect(buildCall.dts).toBe(false);
        expect(buildCall.clean).toBe(false);
        expect(buildCall.hash).toBe(false);
        expect(buildCall.noExternal).toEqual([/.*/]);
        expect(buildCall.external).toEqual([/^node:/]);
    });

    it('should resolve build directory from react-router context', async () => {
        mockExistsSync.mockReturnValue(true);

        const customBuildPath = path.resolve('/custom/build/path');
        const customConfig: any = {
            ...mockResolvedConfig,
            __reactRouterPluginContext: {
                reactRouterConfig: {
                    buildDirectory: customBuildPath,
                },
            },
        };

        const plugin: any = buildMiddlewareRegistryPlugin();
        plugin.configResolved(customConfig);

        await plugin.buildApp.handler();

        const buildCall = mockTsdownBuild.mock.calls[0][0];
        expect(buildCall.outDir).toBe(path.join(customBuildPath, 'server'));
    });

    it('should use project root as cwd for tsdown', async () => {
        mockExistsSync.mockReturnValue(true);

        const plugin: any = buildMiddlewareRegistryPlugin();
        plugin.configResolved(mockResolvedConfig);

        await plugin.buildApp.handler();

        const buildCall = mockTsdownBuild.mock.calls[0][0];
        expect(buildCall.cwd).toBe(testRoot);
    });

    it('should output .mjs via outExtensions', async () => {
        mockExistsSync.mockReturnValue(true);

        const plugin: any = buildMiddlewareRegistryPlugin();
        plugin.configResolved(mockResolvedConfig);

        await plugin.buildApp.handler();

        const buildCall = mockTsdownBuild.mock.calls[0][0];
        expect(buildCall.outExtensions).toBeDefined();
        expect(typeof buildCall.outExtensions).toBe('function');
        const ext = buildCall.outExtensions();
        expect(ext.js).toBe('.mjs');
    });

    it('should not clean output directory', async () => {
        mockExistsSync.mockReturnValue(true);

        const plugin: any = buildMiddlewareRegistryPlugin();
        plugin.configResolved(mockResolvedConfig);

        await plugin.buildApp.handler();

        const buildCall = mockTsdownBuild.mock.calls[0][0];
        expect(buildCall.clean).toBe(false);
    });

    it('should handle build errors gracefully', async () => {
        mockExistsSync.mockReturnValue(true);
        const buildError = new Error('Build failed');
        mockTsdownBuild.mockRejectedValue(buildError);

        const plugin: any = buildMiddlewareRegistryPlugin();
        plugin.configResolved(mockResolvedConfig);

        await expect(plugin.buildApp.handler()).rejects.toThrow('Build failed');
    });
});
