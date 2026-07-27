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
import { describe, it, expect, vi } from 'vitest';
import { ssrSourcemapFixPlugin } from './ssrSourcemapFix';
import type { ViteDevServer } from 'vite';

function createInlineSourcemap(map: object): string {
    const base64 = Buffer.from(JSON.stringify(map)).toString('base64');
    return `//# sourceMappingURL=data:application/json;base64,${base64}`;
}

function extractInlineSourcemap(code: string): object | null {
    const prefix = '//# sourceMappingURL=data:application/json;base64,';
    const idx = code.lastIndexOf(prefix);
    if (idx === -1) return null;
    const base64Start = idx + prefix.length;
    const base64End = code.indexOf('\n', base64Start);
    const base64 = base64End === -1 ? code.slice(base64Start).trim() : code.slice(base64Start, base64End).trim();
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
}

describe('ssrSourcemapFixPlugin', () => {
    it('should return a plugin with the correct name', () => {
        const plugin = ssrSourcemapFixPlugin();
        expect(plugin.name).toBe('storefront-next:ssr-sourcemap-fix');
    });

    it('should patch bare basename sources with full file path', async () => {
        const plugin = ssrSourcemapFixPlugin();

        const originalMap = {
            version: 3,
            sources: ['index.tsx'],
            sourcesContent: ['export default function Footer() {}'],
            mappings: 'AAAA',
        };

        const originalCode = `"use strict";\nexport default function Footer() {}\n${createInlineSourcemap(originalMap)}\n`;

        const mockFetchModule = vi.fn().mockResolvedValue({
            code: originalCode,
            file: '/Users/test/src/components/footer/index.tsx',
            id: '/Users/test/src/components/footer/index.tsx',
        });

        const mockServer = {
            environments: {
                ssr: {
                    fetchModule: mockFetchModule,
                },
            },
        } as unknown as ViteDevServer;

        // Call configureServer to set up the patch
        (plugin.configureServer as (server: ViteDevServer) => void)(mockServer);

        const ssrEnv = (mockServer as any).environments.ssr;
        const result = await ssrEnv.fetchModule('/src/components/footer/index.tsx', undefined, {});

        const patchedMap = extractInlineSourcemap(result.code);
        expect(patchedMap).not.toBeNull();
        expect((patchedMap as { sources: string[] }).sources).toEqual(['/Users/test/src/components/footer/index.tsx']);
    });

    it('should not patch sources that already contain paths', async () => {
        const plugin = ssrSourcemapFixPlugin();

        const originalMap = {
            version: 3,
            sources: ['/src/components/footer/index.tsx'],
            sourcesContent: ['export default function Footer() {}'],
            mappings: 'AAAA',
        };

        const originalCode = `"use strict";\n${createInlineSourcemap(originalMap)}\n`;

        const mockFetchModule = vi.fn().mockResolvedValue({
            code: originalCode,
            file: '/Users/test/src/components/footer/index.tsx',
        });

        const mockServer = {
            environments: {
                ssr: {
                    fetchModule: mockFetchModule,
                },
            },
        } as unknown as ViteDevServer;

        (plugin.configureServer as (server: ViteDevServer) => void)(mockServer);

        const ssrEnv = (mockServer as any).environments.ssr;
        const result = await ssrEnv.fetchModule('/src/components/footer/index.tsx', undefined, {});

        const patchedMap = extractInlineSourcemap(result.code);
        expect((patchedMap as { sources: string[] }).sources).toEqual(['/src/components/footer/index.tsx']);
    });

    it('should pass through externalized modules unchanged', async () => {
        const plugin = ssrSourcemapFixPlugin();

        const mockFetchModule = vi.fn().mockResolvedValue({
            externalize: 'react',
            type: 'module',
        });

        const mockServer = {
            environments: {
                ssr: {
                    fetchModule: mockFetchModule,
                },
            },
        } as unknown as ViteDevServer;

        (plugin.configureServer as (server: ViteDevServer) => void)(mockServer);

        const ssrEnv = (mockServer as any).environments.ssr;
        const result = await ssrEnv.fetchModule('react', undefined, {});

        expect(result).toEqual({ externalize: 'react', type: 'module' });
    });

    it('should pass through modules without inline sourcemaps', async () => {
        const plugin = ssrSourcemapFixPlugin();

        const originalCode = '"use strict";\nexport default 42;\n';
        const mockFetchModule = vi.fn().mockResolvedValue({
            code: originalCode,
            file: '/Users/test/src/lib/constant.ts',
        });

        const mockServer = {
            environments: {
                ssr: {
                    fetchModule: mockFetchModule,
                },
            },
        } as unknown as ViteDevServer;

        (plugin.configureServer as (server: ViteDevServer) => void)(mockServer);

        const ssrEnv = (mockServer as any).environments.ssr;
        const result = await ssrEnv.fetchModule('/src/lib/constant.ts', undefined, {});

        expect(result.code).toBe(originalCode);
    });

    it('should not patch sourcemaps with multiple sources to avoid corruption', async () => {
        const plugin = ssrSourcemapFixPlugin();

        const originalMap = {
            version: 3,
            sources: ['foo.ts', 'bar.ts'],
            sourcesContent: ['export const a = 1;', 'export const b = 2;'],
            mappings: 'AAAA;ACAA',
        };

        const originalCode = `"use strict";\n${createInlineSourcemap(originalMap)}\n`;

        const mockFetchModule = vi.fn().mockResolvedValue({
            code: originalCode,
            file: '/Users/test/src/lib/combined.ts',
        });

        const mockServer = {
            environments: {
                ssr: {
                    fetchModule: mockFetchModule,
                },
            },
        } as unknown as ViteDevServer;

        (plugin.configureServer as (server: ViteDevServer) => void)(mockServer);

        const ssrEnv = (mockServer as any).environments.ssr;
        const result = await ssrEnv.fetchModule('/src/lib/combined.ts', undefined, {});

        // Should be unchanged — multi-source maps are left alone
        const patchedMap = extractInlineSourcemap(result.code);
        expect((patchedMap as { sources: string[] }).sources).toEqual(['foo.ts', 'bar.ts']);
    });

    it('should handle missing SSR environment gracefully', () => {
        const plugin = ssrSourcemapFixPlugin();

        const mockServer = {
            environments: {},
        } as unknown as ViteDevServer;

        // Should not throw
        expect(() => {
            (plugin.configureServer as (server: ViteDevServer) => void)(mockServer);
        }).not.toThrow();
    });
});
