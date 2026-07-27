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
import type { UserConfig, ConfigEnv } from 'vite';
import { baseConfigPlugin } from './baseConfig';

function invokeConfigHook(plugin: ReturnType<typeof baseConfigPlugin>): UserConfig {
    const configHook = plugin.config;
    if (typeof configHook !== 'function') {
        throw new Error('baseConfigPlugin().config is expected to be a function');
    }
    const result = configHook.call(
        {} as never,
        {} as UserConfig,
        { command: 'serve', mode: 'development' } as ConfigEnv
    );
    if (!result || result instanceof Promise) {
        throw new Error('baseConfigPlugin().config is expected to return a config object synchronously');
    }
    return result as UserConfig;
}

describe('baseConfigPlugin', () => {
    it('returns a plugin with the expected name', () => {
        const plugin = baseConfigPlugin();
        expect(plugin.name).toBe('storefront-next:base-config');
    });

    it('dedupes React and React Router to prevent duplicate instances', () => {
        const config = invokeConfigHook(baseConfigPlugin());
        expect(config.resolve?.dedupe).toEqual(['react', 'react-dom', 'react-router']);
    });

    it('pre-bundles React Router entries via optimizeDeps.include', () => {
        const config = invokeConfigHook(baseConfigPlugin());
        expect(config.optimizeDeps?.include).toEqual(
            expect.arrayContaining(['react-router', 'react-router/internal/react-server-client'])
        );
    });

    it('pre-bundles the React-importing runtime SDK entry points to prevent a late re-optimize that loads a second React instance', () => {
        const config = invokeConfigHook(baseConfigPlugin());
        // These subpaths import React (useContext/createContext). If Vite discovers
        // them lazily at request time it re-optimizes and reloads, transiently
        // creating a duplicate React → "Invalid hook call". Including them up front
        // keeps a single first-pass optimization with one shared React.
        expect(config.optimizeDeps?.include).toEqual(
            expect.arrayContaining([
                '@salesforce/storefront-next-runtime/config',
                '@salesforce/storefront-next-runtime/security/react',
                '@salesforce/storefront-next-runtime/site-context',
                '@salesforce/storefront-next-runtime/design/react/core',
                '@salesforce/storefront-next-runtime/routing/app-wrapper',
                '@salesforce/storefront-next-runtime/i18n/client',
                // Transitive i18n deps reached through the SDK entry points — must be
                // pre-bundled too, or they trigger the same late re-optimize + reload.
                'i18next-browser-languagedetector',
                'remix-i18next/middleware',
            ])
        );
    });

    it('forces the SDK through Vite SSR transform via ssr.noExternal to keep module identity stable in dev', () => {
        const config = invokeConfigHook(baseConfigPlugin());
        expect(config.ssr?.noExternal).toEqual(['@salesforce/storefront-next-runtime']);
    });
});
