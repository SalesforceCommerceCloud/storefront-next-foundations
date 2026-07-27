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
/**
 * @file Vitest tests for path-util.ts
 * Covers: resolvePathFromAlias, isSupportedFileExtension, FILE_EXTENSIONS
 */
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { Volume } from 'memfs';
import path from 'path';
import { normalizePath } from '../test-utils';

let vol: any;
let resolvePathFromAlias: (p: string, root: string) => string;
let isSupportedFileExtension: (f: string) => boolean;
let FILE_EXTENSIONS: string[];

async function loadModuleWithFs(files: Record<string, string> = {}) {
    vi.resetModules();
    vol = Volume.fromJSON(files);
    vi.doMock('fs', () => ({
        default: vol,
        ...vol,
    }));
    const mod = await import('./path-util');
    resolvePathFromAlias = mod.resolvePathFromAlias;
    isSupportedFileExtension = mod.isSupportedFileExtension;
    FILE_EXTENSIONS = mod.FILE_EXTENSIONS;
}

describe('path-util', () => {
    const mockProjectRoot = '/mock/project';
    const tsconfigPath = path.join(mockProjectRoot, 'tsconfig.json');

    describe('isSupportedFileExtension', () => {
        it('returns true for supported extensions', async () => {
            await loadModuleWithFs();
            for (const ext of FILE_EXTENSIONS) {
                expect(isSupportedFileExtension(`file${ext}`)).toBe(true);
            }
        });
        it('returns false for unsupported extensions', async () => {
            await loadModuleWithFs();
            expect(isSupportedFileExtension('file.txt')).toBe(false);
            expect(isSupportedFileExtension('file.md')).toBe(false);
        });
    });

    describe('resolvePathFromAlias', () => {
        beforeEach(async () => {
            const baseFiles: Record<string, string> = {};
            baseFiles[tsconfigPath] = JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: {
                        '@/*': ['./src/*'],
                        '+types/*': ['./types/*'],
                        '@alias/CompB': ['src/components/CompB'],
                        '@noMatch/*': ['src/doesnotexist/*'],
                    },
                },
            });
            // Existing files
            baseFiles[`${mockProjectRoot}/src/components/CompA.tsx`] = 'export {}';
            baseFiles[`${mockProjectRoot}/src/components/CompB/index.tsx`] = 'export {}';
            baseFiles[`${mockProjectRoot}/types/components/CompA.ts`] = 'export {}';
            await loadModuleWithFs(baseFiles);
        });

        it('returns the same path for relative imports', () => {
            expect(resolvePathFromAlias('./foo/bar', mockProjectRoot)).toBe('./foo/bar');
            expect(resolvePathFromAlias('../baz', mockProjectRoot)).toBe('../baz');
        });

        it('resolves a simple alias with wildcard', () => {
            const result = resolvePathFromAlias('@/components/CompA', mockProjectRoot);
            expect(normalizePath(result)).toContain('src/components/CompA.tsx');
        });

        it('resolves a simple alias with leading +types', () => {
            const result = resolvePathFromAlias('+types/components/CompA', mockProjectRoot);
            expect(normalizePath(result)).toContain('types/components/CompA.ts');
        });

        it('resolves an alias without wildcard', () => {
            const result = resolvePathFromAlias('@alias/CompB', mockProjectRoot);
            expect(normalizePath(result)).toContain('src/components/CompB/index.tsx');
        });

        it('returns the original path if no tsconfig.json exists', async () => {
            // Recreate module without tsconfig
            await loadModuleWithFs({});
            expect(resolvePathFromAlias('@components/CompA', mockProjectRoot)).toBe('@components/CompA');
        });

        it('returns the original path if no alias matches', () => {
            expect(resolvePathFromAlias('notAnAlias/CompA', mockProjectRoot)).toBe('notAnAlias/CompA');
        });

        it('return the original path if alias matches but no file exists', async () => {
            // Provide only tsconfig, but no files mapped
            await loadModuleWithFs({
                [tsconfigPath]: JSON.stringify({
                    compilerOptions: { paths: { '@noMatch/*': ['src/doesnotexist/*'] } },
                }),
            });
            expect(resolvePathFromAlias('@noMatch/DoesNotExist', mockProjectRoot)).toBe('@noMatch/DoesNotExist');
        });

        it('throws if tsconfig.json is invalid', async () => {
            await loadModuleWithFs({
                [tsconfigPath]: 'invalid json',
            });
            expect(() => resolvePathFromAlias('@/CompA', mockProjectRoot)).toThrow(/Error parsing tsconfig.json/);
        });

        it('resolves to directory if no index file exists but directory exists', async () => {
            const files: Record<string, string> = {};
            files[tsconfigPath] = JSON.stringify({
                compilerOptions: { paths: { '@alias/CompB': ['src/components/CompB'] } },
            });
            await loadModuleWithFs(files);
            vol.mkdirSync(`${mockProjectRoot}/src/components/CompB`, { recursive: true });
            const result = resolvePathFromAlias('@alias/CompB', mockProjectRoot);
            expect(normalizePath(result)).toContain('src/components/CompB');
        });

        it('handles tsconfig.json with comments', async () => {
            const commented = `{
                // comment
                "compilerOptions": { "paths": { "@foo/*": ["src/foo/*"] } }
            }`;
            const files: Record<string, string> = {};
            files[tsconfigPath] = commented;
            files[`${mockProjectRoot}/src/foo/Bar.tsx`] = 'export {}';
            await loadModuleWithFs(files);
            const result = resolvePathFromAlias('@foo/Bar', mockProjectRoot);
            expect(normalizePath(result)).toContain('src/foo/Bar.tsx');
        });

        it('uses cache when same projectRoot is queried multiple times', async () => {
            const files: Record<string, string> = {};
            files[tsconfigPath] = JSON.stringify({
                compilerOptions: { paths: { '@/*': ['./src/*'] } },
            });
            files[`${mockProjectRoot}/src/components/CompA.tsx`] = 'export {}';
            await loadModuleWithFs(files);

            // First call - should load and cache
            const result1 = resolvePathFromAlias('@/components/CompA', mockProjectRoot);
            expect(normalizePath(result1)).toContain('src/components/CompA.tsx');

            // Second call with same projectRoot - should use cache
            // Note: This works because we don't reset modules between calls in the same test
            const result2 = resolvePathFromAlias('@/components/CompA', mockProjectRoot);
            expect(normalizePath(result2)).toContain('src/components/CompA.tsx');
        });

        it('handles paths that are not an object (null or string)', async () => {
            const files: Record<string, string> = {};
            files[tsconfigPath] = JSON.stringify({
                compilerOptions: { paths: null },
            });
            await loadModuleWithFs(files);
            expect(resolvePathFromAlias('@/CompA', mockProjectRoot)).toBe('@/CompA');

            // Test with paths as string
            files[tsconfigPath] = JSON.stringify({
                compilerOptions: { paths: 'invalid' },
            });
            await loadModuleWithFs(files);
            expect(resolvePathFromAlias('@/CompA', mockProjectRoot)).toBe('@/CompA');
        });

        it('handles path mapping as string (not array)', async () => {
            // When mapping is a string instead of array, it should wrap it
            const files: Record<string, string> = {};
            files[tsconfigPath] = JSON.stringify({
                compilerOptions: {
                    paths: {
                        '@single': 'src/components/Single', // String, not array
                    },
                },
            });
            files[`${mockProjectRoot}/src/components/Single.tsx`] = 'export {}';
            await loadModuleWithFs(files);
            const result = resolvePathFromAlias('@single', mockProjectRoot);
            expect(normalizePath(result)).toContain('src/components/Single.tsx');
        });
    });
});
