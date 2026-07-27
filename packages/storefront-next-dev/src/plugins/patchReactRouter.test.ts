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
import { patchReactRouterPlugin } from './patchReactRouter';

// Helper to call plugin hooks that can be functions or objects
function callHook(hook: any, ...args: any[]) {
    if (typeof hook === 'function') {
        return hook(...args);
    }
    if (hook && typeof hook.handler === 'function') {
        return hook.handler(...args);
    }
}

describe('patchReactRouterPlugin', () => {
    it('should return a plugin with correct name', () => {
        const plugin = patchReactRouterPlugin();
        expect(plugin.name).toBe('storefront-next:patch-react-router');
    });

    it('should have enforce set to pre', () => {
        const plugin = patchReactRouterPlugin();
        expect(plugin.enforce).toBe('pre');
    });

    describe('config', () => {
        it('should detect test mode', () => {
            const plugin = patchReactRouterPlugin();
            // Simulate calling config hook with test mode
            callHook(plugin.config, {}, { mode: 'test' });

            // After test mode is set, resolveId should return null
            const result = callHook(plugin.resolveId, 'react-router', '/some/importer.ts');
            expect(result).toBeNull();
        });

        it('should skip patching in development mode to avoid duplicate instances', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'development' });

            const result = callHook(plugin.resolveId, 'react-router', '/some/importer.ts');
            expect(result).toBeNull();
        });

        it('should not affect patching in production mode', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'production' });

            const result = callHook(plugin.resolveId, 'react-router', '/some/importer.ts');
            expect(result).toBe('\0patched-react-router');
        });
    });

    describe('configEnvironment', () => {
        it('should mark react-router as noExternal for ssr environment in production', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'production' });
            const result = callHook(plugin.configEnvironment, 'ssr');

            expect(result).toEqual({
                resolve: {
                    noExternal: ['react-router'],
                },
            });
        });

        it('should return undefined for ssr environment in development mode', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'development' });
            const result = callHook(plugin.configEnvironment, 'ssr');

            expect(result).toBeUndefined();
        });

        it('should return undefined for non-ssr environments', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'production' });
            const result = callHook(plugin.configEnvironment, 'client');

            expect(result).toBeUndefined();
        });

        it('should return undefined for other environments', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'production' });
            const result = callHook(plugin.configEnvironment, 'custom');

            expect(result).toBeUndefined();
        });

        it('should return undefined in test mode for all environments', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'test' });

            expect(callHook(plugin.configEnvironment, 'ssr')).toBeUndefined();
            expect(callHook(plugin.configEnvironment, 'client')).toBeUndefined();
        });
    });

    describe('resolveId', () => {
        it('should resolve react-router to virtual module in production', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'production' });
            const result = callHook(plugin.resolveId, 'react-router', '/some/importer.ts');

            expect(result).toBe('\0patched-react-router');
        });

        it('should return null in development mode to avoid duplicate instances', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'development' });
            const result = callHook(plugin.resolveId, 'react-router', '/some/importer.ts');

            expect(result).toBeNull();
        });

        it('should not resolve when importer is the virtual module itself', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'production' });
            const result = callHook(plugin.resolveId, 'react-router', '\0patched-react-router');

            expect(result).toBeNull();
        });

        it('should not resolve when importer includes storefront-next-dev', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'production' });
            const result = callHook(plugin.resolveId, 'react-router', '/path/to/storefront-next-dev/file.ts');

            expect(result).toBeNull();
        });

        it('should return null for non-react-router modules', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'production' });
            const result = callHook(plugin.resolveId, 'some-other-module', '/some/importer.ts');

            expect(result).toBeNull();
        });

        it('should handle undefined importer', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'production' });
            const result = callHook(plugin.resolveId, 'react-router', undefined);

            expect(result).toBe('\0patched-react-router');
        });

        it('should return null in test mode to avoid Windows path resolution errors', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'test' });
            const result = callHook(plugin.resolveId, 'react-router', '/some/importer.ts');

            expect(result).toBeNull();
        });
    });

    describe('load', () => {
        it('should load virtual module with patched Scripts component in production', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'production' });
            const result = callHook(plugin.load, '\0patched-react-router');

            expect(result).toContain("export * from 'react-router'");
            expect(result).toContain("export { Scripts } from '@salesforce/storefront-next-dev/react-router/Scripts'");
        });

        it('should return null in development mode', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'development' });
            const result = callHook(plugin.load, '\0patched-react-router');

            expect(result).toBeNull();
        });

        it('should return null for non-virtual modules', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'production' });
            const result = callHook(plugin.load, '/some/real/file.ts');

            expect(result).toBeNull();
        });

        it('should export all from react-router except Scripts', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'production' });
            const result = callHook(plugin.load, '\0patched-react-router');

            // Verify that the code re-exports everything from react-router
            // and then overrides Scripts with our custom implementation
            expect(typeof result).toBe('string');
            expect(result).toContain("export * from 'react-router'");
        });

        it('should return null in test mode', () => {
            const plugin = patchReactRouterPlugin();
            callHook(plugin.config, {}, { mode: 'test' });
            const result = callHook(plugin.load, '\0patched-react-router');

            expect(result).toBeNull();
        });
    });
});
