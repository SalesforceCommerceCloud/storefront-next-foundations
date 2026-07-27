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
import type { ServerBuild } from 'react-router';
import { patchReactRouterBuild } from './utils';

describe('server utils', () => {
    describe('patchReactRouterBuild', () => {
        it('should replace /assets/ paths with bundle path', () => {
            const bundleId = 'test-bundle-456';
            const testBuild = {
                assets: {
                    url: '/assets/manifest.json',
                    version: '123',
                    entry: {
                        module: '/assets/entry-abc123.js',
                        imports: ['/assets/chunk-def456.js', '/assets/chunk-ghi789.js'],
                    },
                    routes: {
                        root: {
                            id: 'root',
                            path: '',
                            file: '/assets/root-ghi789.js',
                            module: '/assets/root-ghi789.js',
                        },
                    },
                },
                publicPath: '/assets/',
            } as unknown as ServerBuild;

            const patchedBuild = patchReactRouterBuild(testBuild, bundleId);

            // Check that publicPath is updated
            expect(patchedBuild.publicPath).toBe('/mobify/bundle/test-bundle-456/client/');

            // Check that assets paths are updated
            const assetsString = JSON.stringify(patchedBuild.assets);
            expect(assetsString).not.toContain('"/assets/');
            expect(assetsString).toContain('/mobify/bundle/test-bundle-456/client/assets/');
        });

        it('should handle different BUNDLE_ID values', () => {
            const bundleId = 'production-bundle-789';
            const testBuild = {
                assets: {
                    url: '/assets/manifest.json',
                    version: '123',
                    entry: {
                        module: '/assets/entry-abc123.js',
                        imports: ['/assets/chunk-def456.js'],
                    },
                    routes: {
                        root: {
                            id: 'root',
                            path: '',
                            file: '/assets/root-ghi789.js',
                            module: '/assets/root-ghi789.js',
                        },
                    },
                },
                publicPath: '/assets/',
            } as unknown as ServerBuild;

            const patchedBuild = patchReactRouterBuild(testBuild, bundleId);

            expect(patchedBuild.publicPath).toBe('/mobify/bundle/production-bundle-789/client/');
            const assetsString = JSON.stringify(patchedBuild.assets);
            expect(assetsString).toContain('/mobify/bundle/production-bundle-789/client/assets/');
        });

        it('should preserve non-asset paths in the build', () => {
            const bundleId = 'test-bundle';
            const testBuild = {
                assets: {
                    url: '/assets/manifest.json',
                    version: '123',
                    entry: {
                        module: '/assets/entry.js',
                        imports: ['/assets/chunk.js'],
                    },
                    routes: {
                        root: {
                            id: 'root',
                            path: '/home',
                            file: '/assets/root.js',
                            module: '/assets/root.js',
                        },
                    },
                },
                publicPath: '/assets/',
                otherProperty: 'should-be-preserved',
            } as unknown as ServerBuild;

            const patchedBuild = patchReactRouterBuild(testBuild, bundleId);

            expect((patchedBuild as any).otherProperty).toBe('should-be-preserved');
            expect(patchedBuild.assets.version).toBe('123');
        });

        it('should not set basename when MRT_ENV_BASE_PATH is not set', () => {
            delete process.env.MRT_ENV_BASE_PATH;
            const testBuild = {
                assets: {
                    url: '/assets/manifest.json',
                    entry: { module: '/assets/entry.js' },
                },
                publicPath: '/assets/',
            } as unknown as ServerBuild;

            const patchedBuild = patchReactRouterBuild(testBuild, 'test-bundle');

            expect(patchedBuild.basename).toBeUndefined();
        });

        it('should set basename from MRT_ENV_BASE_PATH when configured', () => {
            process.env.MRT_ENV_BASE_PATH = '/shop';
            const testBuild = {
                assets: {
                    url: '/assets/manifest.json',
                    entry: { module: '/assets/entry.js' },
                },
                publicPath: '/assets/',
            } as unknown as ServerBuild;

            const patchedBuild = patchReactRouterBuild(testBuild, 'test-bundle');

            expect(patchedBuild.basename).toBe('/shop');
            delete process.env.MRT_ENV_BASE_PATH;
        });

        it('should include base path in publicPath and asset URLs when configured', () => {
            process.env.MRT_ENV_BASE_PATH = '/shop';
            const testBuild = {
                assets: {
                    url: '/assets/manifest.json',
                    entry: { module: '/assets/entry.js', imports: [] },
                    routes: {},
                },
                publicPath: '/assets/',
            } as unknown as ServerBuild;

            const patchedBuild = patchReactRouterBuild(testBuild, 'test-bundle');

            expect(patchedBuild.publicPath).toBe('/shop/mobify/bundle/test-bundle/client/');
            expect(patchedBuild.assets.url).toContain('/shop/mobify/bundle/test-bundle/client/assets/');
            delete process.env.MRT_ENV_BASE_PATH;
        });

        it('should create a deep copy of assets to avoid mutation', () => {
            const bundleId = 'test-bundle';
            const testBuild = {
                assets: {
                    url: '/assets/manifest.json',
                    entry: {
                        module: '/assets/entry.js',
                    },
                },
                publicPath: '/assets/',
            } as unknown as ServerBuild;

            const patchedBuild = patchReactRouterBuild(testBuild, bundleId);

            // Verify the patched build has different assets object
            expect(patchedBuild.assets).not.toBe(testBuild.assets);
            expect(patchedBuild.assets.url).toContain('/mobify/bundle/');
        });
    });
});
