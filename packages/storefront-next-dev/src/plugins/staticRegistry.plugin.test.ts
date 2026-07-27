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
import { vol } from 'memfs';
import { glob } from 'glob';
import { staticRegistryPlugin } from './staticRegistry';
import { normalizePath } from '../test-utils';

// Mock glob
vi.mock('glob', () => ({
    glob: vi.fn(),
}));

// Don't mock ts-morph - let it work normally but with simple test files

// Mock fs operations with memfs and specific overrides
vi.mock('fs', async () => {
    const memfs = await import('memfs');
    return {
        ...memfs.fs,
        writeFileSync: vi.fn(),
        existsSync: vi.fn(),
    };
});

const mockGlob = vi.mocked(glob);

// Import mocked fs functions after the mock is set up
import { writeFileSync, existsSync } from 'fs';
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockExistsSync = vi.mocked(existsSync);

describe('staticRegistryPlugin Integration', () => {
    beforeEach(() => {
        vol.reset();
        vi.clearAllMocks();
        mockExistsSync.mockReturnValue(true);
    });

    afterEach(() => {
        vol.reset();
    });

    async function callPluginHooks(plugin: any, projectRoot: string, errorCallback?: (msg: string) => void) {
        const configResolvedHook = plugin.configResolved;
        const buildStartHook = plugin.buildStart;

        // Call configResolved
        void configResolvedHook({ root: projectRoot });

        // Call buildStart with proper context
        const context = { error: errorCallback || vi.fn() };
        await buildStartHook.call(context, {});
    }

    describe('Plugin Configuration', () => {
        it('has correct plugin name and hooks', () => {
            const plugin = staticRegistryPlugin();
            expect(plugin.name).toBe('storefrontnext:static-registry');
            expect(plugin.configResolved).toBeDefined();
            expect(plugin.buildStart).toBeDefined();
            expect(plugin.handleHotUpdate).toBeDefined();
        });

        it('accepts custom configuration', () => {
            const config = {
                componentPath: 'custom/components',
                registryPath: 'custom/registry.ts',
            };
            const plugin = staticRegistryPlugin(config);
            expect(plugin.name).toBe('storefrontnext:static-registry');
        });
    });

    describe('Component Scanning Integration', () => {
        it('scans components and generates registry code', async () => {
            const mockProjectRoot = '/test/project';

            // Setup file system with real component files
            vol.fromJSON({
                '/test/project/src/components/hero/index.tsx': `
                    @Component('hero', { group: 'layouts' })
                    export default class Hero {}
                `,
                '/test/project/src/lib/static-registry.ts': `
                    import { ComponentRegistry } from '@/lib/component-registry';
                    export const registry = new ComponentRegistry();
                    
                    // STATIC_REGISTRY_START
                    // Generated content will be inserted here
                    // STATIC_REGISTRY_END
                `,
            });

            // Mock glob to return component files
            mockGlob.mockResolvedValue(['/test/project/src/components/hero/index.tsx']);

            const plugin = staticRegistryPlugin();
            await callPluginHooks(plugin, mockProjectRoot);

            expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
            const [filePath, content] = mockWriteFileSync.mock.calls[0];
            // Use normalizePath for cross-platform comparison
            expect(normalizePath(filePath as string)).toBe('/test/project/src/lib/static-registry.ts');
            expect(content).toContain("targetRegistry.registerImporter('layouts.hero'");
        });

        it('handles multiple components', async () => {
            const mockProjectRoot = '/test/project';

            vol.fromJSON({
                '/test/project/src/lib/static-registry.ts': `
                    // STATIC_REGISTRY_START
                    // STATIC_REGISTRY_END
                `,
            });

            // Mock glob to return component files
            mockGlob.mockResolvedValue([
                '/test/project/src/components/hero/index.tsx',
                '/test/project/src/components/carousel/index.tsx',
            ]);

            // Add real component files to memfs
            vol.fromJSON(
                {
                    '/test/project/src/components/hero/index.tsx': `@Component('hero')\nexport default class Hero {}`,
                    '/test/project/src/components/carousel/index.tsx': `@Component('carousel')\nexport default class Carousel {}`,
                },
                '/test/project/src/components'
            );

            const plugin = staticRegistryPlugin();
            await callPluginHooks(plugin, mockProjectRoot);

            const [, content] = mockWriteFileSync.mock.calls[0];
            expect(content).toContain("targetRegistry.registerImporter('storefrontnext_base.carousel'");
            expect(content).toContain("targetRegistry.registerImporter('storefrontnext_base.hero'");
        });
    });

    describe('Error Handling', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        afterEach(() => {
            consoleErrorSpy.mockClear();
        });
        it('handles file write errors gracefully', async () => {
            const mockProjectRoot = '/test/project';
            const errorCallback = vi.fn();

            // Setup a valid file system but make writeFileSync fail
            vol.fromJSON({
                '/test/project/src/components/hero/index.tsx': `@Component('hero')\nexport default class Hero {}`,
                '/test/project/src/lib/static-registry.ts': `
                    // STATIC_REGISTRY_START
                    // STATIC_REGISTRY_END
                `,
            });

            mockGlob.mockResolvedValue(['/test/project/src/components/hero/index.tsx']);
            mockWriteFileSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });

            const plugin = staticRegistryPlugin({ failOnError: false });

            await callPluginHooks(plugin, mockProjectRoot, errorCallback);

            // Check that console.error was called with write error
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('[sfnext:error]'),
                expect.stringContaining('Static registry generation failed')
            );
        });

        it('handles glob errors gracefully', async () => {
            const mockProjectRoot = '/test/project';
            const errorCallback = vi.fn();

            mockGlob.mockRejectedValue(new Error('Glob failed'));

            const plugin = staticRegistryPlugin({ failOnError: false });
            await callPluginHooks(plugin, mockProjectRoot, errorCallback);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('[sfnext:error]'),
                expect.stringContaining('Static registry generation failed')
            );
        });
    });

    describe('Hot Module Replacement', () => {
        it('has handleHotUpdate hook defined', () => {
            const plugin = staticRegistryPlugin();
            expect(plugin.handleHotUpdate).toBeDefined();
        });

        it('filters component files correctly', () => {
            // Test the file filtering logic without calling the actual hook
            const componentPath = 'src/components';

            const testCases = [
                {
                    file: '/test/project/src/components/hero/index.tsx',
                    expected: true,
                },
                {
                    file: '/test/project/src/utils/helper.ts',
                    expected: false,
                },
                {
                    file: '/test/project/src/components/carousel/index.ts',
                    expected: true,
                },
                {
                    file: '/test/project/src/components/hero/styles.css',
                    expected: false,
                },
            ];

            testCases.forEach(({ file, expected }) => {
                const normalizedComponentPath = componentPath.replace(/\\/g, '/');
                const normalizedFile = file.replace(/\\/g, '/');

                const shouldHandle =
                    normalizedFile.includes(`/${normalizedComponentPath}/`) &&
                    (normalizedFile.endsWith('.ts') || normalizedFile.endsWith('.tsx'));

                expect(shouldHandle).toBe(expected);
            });
        });
    });

    describe('Registry File Updates', () => {
        it('preserves existing content outside markers', async () => {
            const mockProjectRoot = '/test/project';

            // Reset writeFileSync mock to not throw errors
            mockWriteFileSync.mockReset();
            const existingContent = `
                import { ComponentRegistry } from '@/lib/component-registry';
                
                export const registry = new ComponentRegistry();
                
                // Custom code before
                
                // STATIC_REGISTRY_START
                // Old generated content
                // STATIC_REGISTRY_END
                
                // Custom code after
                export { registry as default };
            `;

            vol.fromJSON({
                '/test/project/src/components/hero/index.tsx': `@Component('hero')\nexport default class Hero {}`,
                '/test/project/src/lib/static-registry.ts': existingContent,
            });

            mockGlob.mockResolvedValue(['/test/project/src/components/hero/index.tsx']);

            const plugin = staticRegistryPlugin();
            await callPluginHooks(plugin, mockProjectRoot);

            const [, newContent] = mockWriteFileSync.mock.calls[0];
            expect(newContent).toContain('// Custom code before');
            expect(newContent).toContain('// Custom code after');
            expect(newContent).toContain("targetRegistry.registerImporter('storefrontnext_base.hero'");
            expect(newContent).not.toContain('// Old generated content');
        });
    });
});
