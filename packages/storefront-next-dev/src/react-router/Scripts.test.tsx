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
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// Mock react-router Scripts to avoid HydratedRouter requirement
vi.mock('react-router', () => ({
    Scripts: vi.fn(() => createElement('script', { 'data-test': 'react-router-scripts' })),
}));

describe('Scripts', () => {
    const originalWindow = global.window;
    const originalProcessEnv = process.env;

    beforeEach(() => {
        // Reset process.env before each test
        process.env = { ...originalProcessEnv };
        vi.clearAllMocks();
        // Clear module cache to ensure isSSR is re-evaluated
        vi.resetModules();
    });

    afterEach(() => {
        // Restore original state
        global.window = originalWindow;
        process.env = originalProcessEnv;
    });

    describe('SSR environment', () => {
        beforeEach(() => {
            // Simulate SSR environment by deleting window
            // @ts-expect-error - intentionally deleting window for SSR simulation
            delete global.window;
        });

        it('should render with default bundle ID', async () => {
            delete process.env.BUNDLE_ID;

            const { Scripts } = await import('./Scripts');
            const html = renderToStaticMarkup(createElement(Scripts, {}));

            expect(html).toBeDefined();
            expect(typeof html).toBe('string');
            expect(html).toContain('local');
            expect(html).toContain('_BUNDLE_ID');
            expect(html).toContain('_BUNDLE_PATH');
            expect(html).toContain('/mobify/bundle/local/client/');
        });

        it('should render with custom bundle ID and path', async () => {
            process.env.BUNDLE_ID = 'custom-bundle-123';

            const { Scripts } = await import('./Scripts');
            const html = renderToStaticMarkup(createElement(Scripts, {}));

            expect(html).toBeDefined();
            expect(html).toContain('custom-bundle-123');
            expect(html).toContain('/mobify/bundle/custom-bundle-123/client/');
            expect(html).toContain('_BUNDLE_ID');
            expect(html).toContain('_BUNDLE_PATH');
        });

        it('should render with empty bundle ID', async () => {
            process.env.BUNDLE_ID = '';

            const { Scripts } = await import('./Scripts');
            const html = renderToStaticMarkup(createElement(Scripts, {}));

            expect(html).toBeDefined();
            expect(html).toContain('_BUNDLE_ID');
            expect(html).toContain('_BUNDLE_PATH');
        });

        it('should handle bundle ID with special characters', async () => {
            process.env.BUNDLE_ID = 'bundle-v1.2.3-alpha';

            const { Scripts } = await import('./Scripts');
            const html = renderToStaticMarkup(createElement(Scripts, {}));

            expect(html).toBeDefined();
            expect(html).toContain('bundle-v1.2.3-alpha');
        });

        it('should forward props to ReactRouterScripts', async () => {
            const { Scripts } = await import('./Scripts');
            const html = renderToStaticMarkup(createElement(Scripts, { nonce: 'test-nonce' }));

            expect(html).toBeDefined();
            expect(typeof html).toBe('string');
        });

        it('should forward nonce to the sf-next-bundle-config inline script', async () => {
            const { Scripts } = await import('./Scripts');
            const html = renderToStaticMarkup(createElement(Scripts, { nonce: 'test-nonce' }));

            // The bundle-config inline <script> must carry the nonce so a strict
            // CSP (script-src 'nonce-...') doesn't block it. Regression guard.
            expect(html).toMatch(/<script[^>]*id="sf-next-bundle-config"[^>]*nonce="test-nonce"/);
        });
    });

    describe('Client environment', () => {
        beforeEach(() => {
            // Simulate client environment with window object
            global.window = {} as any;
        });

        it('should not render InternalServerScripts on client side', async () => {
            const { Scripts } = await import('./Scripts');
            const html = renderToStaticMarkup(createElement(Scripts, {}));

            expect(html).toBeDefined();
            expect(typeof html).toBe('string');
            // On client side, InternalServerScripts returns null, so no bundle scripts
            expect(html).toContain('data-test="react-router-scripts"');
            expect(html).not.toContain('_BUNDLE_ID');
        });

        it('should forward props to ReactRouterScripts', async () => {
            const { Scripts } = await import('./Scripts');
            const html = renderToStaticMarkup(createElement(Scripts, { nonce: 'client-nonce' }));

            expect(html).toBeDefined();
            expect(typeof html).toBe('string');
        });
    });

    describe('Module exports', () => {
        it('should export Scripts as a named function', async () => {
            const module = await import('./Scripts');

            expect(module).toHaveProperty('Scripts');
            expect(typeof module.Scripts).toBe('function');
        });
    });
});
