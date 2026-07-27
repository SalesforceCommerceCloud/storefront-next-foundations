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
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..', '..', '..', '..');

describe('Extension Routes', () => {
    let originalReactRouterAppDirectory: string;

    beforeEach(() => {
        originalReactRouterAppDirectory = globalThis.__reactRouterAppDirectory;
        globalThis.__reactRouterAppDirectory = __dirname;
    });

    afterEach(() => {
        globalThis.__reactRouterAppDirectory = originalReactRouterAppDirectory;
    });

    it('should nest extension routes with _app prefix under the _app layout', async () => {
        const { default: routes } = await import('@/routes');
        const resolvedRoutes = await routes;

        // With site context URL prefix configured, routes are wrapped under a site-context-wrapper
        const wrapper = resolvedRoutes.find((r: any) => r.id === 'site-context-wrapper');
        expect(wrapper).toBeDefined();
        expect(wrapper?.children).toBeDefined();

        // Find the _app layout inside the wrapper
        const wrappedRoutes = wrapper?.children ?? [];
        const defaultLayout = wrappedRoutes.find((r: any) => r.file === 'routes/_app.tsx');
        expect(defaultLayout).toBeDefined();
        expect(defaultLayout?.children).toBeDefined();

        // Check that extension route with _app prefix is nested under _app layout
        const storeLocatorRoute = defaultLayout?.children?.find(
            (r: any) => r.file === 'extensions/store-locator/routes/_app.store-locator.tsx'
        );
        expect(storeLocatorRoute).toBeDefined();
        expect(storeLocatorRoute?.path).toBe('store-locator');
        expect(storeLocatorRoute?.file).toBe('extensions/store-locator/routes/_app.store-locator.tsx');
    });

    it('should add extension resource routes as excluded routes at root level', async () => {
        const { default: routes } = await import('@/routes');
        const resolvedRoutes = await routes;

        // Resource routes should be excluded from the prefix wrapper and stay at root level
        const resourceRoute = resolvedRoutes.find(
            (r: any) => r.file === 'extensions/store-locator/routes/resource.stores.ts'
        );
        expect(resourceRoute).toBeDefined();
        expect(resourceRoute?.path).toBe('resource/stores');
        expect(resourceRoute?.file).toBe('extensions/store-locator/routes/resource.stores.ts');
        // Verify it's not nested under any layout (no children property or parent)
        expect(resourceRoute?.children).toBeUndefined();
    });
});
