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
import { describe, it, expect } from 'vitest';
import type { Rollup, UserConfig, ConfigEnv, ConfigPluginContext } from 'vite';
import { readableChunkFileNames, readableChunkFileNamesPlugin } from './readableChunkFileNames';

describe('readableChunkFileNames', () => {
    describe('source code chunks', () => {
        it('should generate debuggable name for single src file', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/src/components/Button.tsx'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(components)-Button.[hash].js');
        });

        it('should generate debuggable name for nested src file', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/src/components/ui/inputs/TextField.tsx'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(components)-(ui)-(inputs)-TextField.[hash].js');
        });

        it('should handle file with query parameters', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/src/utils/helper.ts?worker'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(utils)-helper.[hash].js');
        });

        it('should handle file in src root', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/src/index.tsx'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/-index.[hash].js');
        });

        it('should handle .jsx files', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/src/App.jsx'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/-App.[hash].js');
        });

        it('should handle .js files', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/src/utils/format.js'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(utils)-format.[hash].js');
        });

        it('should handle .mjs files', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/src/utils/format.mjs'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(utils)-format.[hash].js');
        });
    });

    describe('node_modules chunks', () => {
        it('should generate debuggable name for regular package', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/node_modules/lodash/index.js'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(package)-(lodash)-index.[hash].js');
        });

        it('should generate debuggable name for scoped package', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/node_modules/@react-router/dev/index.js'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(package)-(@react-router-dev)-index.[hash].js');
        });

        it('should handle nested paths in scoped packages', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/node_modules/@babel/runtime/helpers/esm/extends.js'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(package)-(@babel-runtime)-(helpers)-(esm)-extends.[hash].js');
        });

        it('should handle package with query parameters', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/node_modules/react/index.js?commonjs-entry'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(package)-(react)-index.[hash].js');
        });

        it('should handle package in nested node_modules', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/node_modules/foo/node_modules/bar/index.js'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(package)-(bar)-index.[hash].js');
        });

        it('should handle package with deep nested path', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/node_modules/package/lib/utils/deep/helper.js'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(package)-(package)-(lib)-(utils)-(deep)-helper.[hash].js');
        });
    });

    describe('edge cases', () => {
        it('should return default name when moduleIds is empty', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: [],
            } as unknown as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(chunk)-[name].[hash].js');
        });

        it('should return default name when moduleIds is undefined', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: undefined,
            } as unknown as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(chunk)-[name].[hash].js');
        });

        it('should return default name when path has no src or node_modules', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/dist/bundle.js'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(chunk)-[name].[hash].js');
        });

        it('should use last moduleId when multiple are provided', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: [
                    '/Users/project/src/utils/first.ts',
                    '/Users/project/src/components/second.tsx',
                    '/Users/project/src/lib/third.ts',
                ],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(lib)-third.[hash].js');
        });

        it('should handle files without extensions', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/src/components/Button'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(components)-Button.[hash].js');
        });

        it('should handle paths with multiple query parameters', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/src/utils/helper.ts?worker&inline'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(utils)-helper.[hash].js');
        });
    });

    describe('cross-platform compatibility (Windows paths)', () => {
        it('should handle Windows path for src file', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['C:\\Users\\project\\src\\components\\Button.tsx'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(components)-Button.[hash].js');
        });

        it('should handle Windows path for nested src file', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['C:\\Users\\project\\src\\components\\ui\\inputs\\TextField.tsx'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(components)-(ui)-(inputs)-TextField.[hash].js');
        });

        it('should handle Windows path for node_modules regular package', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['C:\\Users\\project\\node_modules\\lodash\\index.js'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(package)-(lodash)-index.[hash].js');
        });

        it('should handle Windows path for node_modules scoped package', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['C:\\Users\\project\\node_modules\\@react-router\\dev\\index.js'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(package)-(@react-router-dev)-index.[hash].js');
        });

        it('should handle Windows path with query parameters', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['C:\\Users\\project\\src\\utils\\helper.ts?worker'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(utils)-helper.[hash].js');
        });

        it('should handle Windows path for nested node_modules package', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['C:\\Users\\project\\node_modules\\@babel\\runtime\\helpers\\esm\\extends.js'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(package)-(@babel-runtime)-(helpers)-(esm)-extends.[hash].js');
        });

        it('should handle Windows path for file in src root', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['C:\\Users\\project\\src\\index.tsx'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/-index.[hash].js');
        });

        it('should handle mixed Windows and POSIX paths (last moduleId is Windows)', () => {
            const chunkInfo: Rollup.PreRenderedChunk = {
                moduleIds: ['/Users/project/src/utils/first.ts', 'C:\\Users\\project\\src\\components\\Button.tsx'],
            } as Rollup.PreRenderedChunk;

            const result = readableChunkFileNames(chunkInfo);

            expect(result).toBe('assets/(components)-Button.[hash].js');
        });
    });
});

describe('readableChunkFileNamesPlugin', () => {
    it('should return a plugin with correct name', () => {
        const plugin = readableChunkFileNamesPlugin();
        expect(plugin.name).toBe('storefront-next:readable-chunk-file-names');
    });

    it('should apply only to build', () => {
        const plugin = readableChunkFileNamesPlugin();
        expect(plugin.apply).toBe('build');
    });

    it('should configure client build rollup options', () => {
        const plugin = readableChunkFileNamesPlugin();

        expect(plugin.config).toBeDefined();
        expect(typeof plugin.config).toBe('function');

        // Create properly typed mock config and env
        const mockUserConfig: UserConfig = {};
        const mockConfigEnv: ConfigEnv = {
            command: 'build',
            mode: 'production',
            isSsrBuild: false,
            isPreview: false,
        };

        // Create a ConfigPluginContext mock. The config hook doesn't use the context,
        // but TypeScript requires it. We use Partial to create a minimal mock with
        // only the required metadata.
        const mockContext: Partial<ConfigPluginContext> = {
            meta: {
                rollupVersion: '4.0.0',
                viteVersion: '6.0.0',
            },
        };

        // Extract and call the config function with proper types
        const configHook = plugin.config;
        expect(configHook).toBeDefined();

        // Handle both function and object hook forms
        let configFn;
        if (typeof configHook === 'function') {
            configFn = configHook;
        } else if (configHook && typeof configHook === 'object' && 'handler' in configHook) {
            configFn = configHook.handler;
        } else {
            throw new Error('Invalid config hook');
        }

        // Call the config function with the mock context
        const config = configFn.call(mockContext as ConfigPluginContext, mockUserConfig, mockConfigEnv);

        expect(config).toEqual({
            environments: {
                client: {
                    build: {
                        rollupOptions: {
                            output: {
                                chunkFileNames: readableChunkFileNames,
                                entryFileNames: readableChunkFileNames,
                            },
                        },
                    },
                },
            },
        });
    });
});
