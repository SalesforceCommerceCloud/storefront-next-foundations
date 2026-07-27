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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizePath } from '../test-utils';

// Mock dependencies
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockCreateJiti = vi.fn();

vi.mock('node:fs', () => ({
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
}));

vi.mock('jiti', () => ({
    createJiti: mockCreateJiti,
}));

// Import after mocks are set up
const { parseTsconfigPaths, importTypescript } = await import('./ts-import');

describe('ts-import', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('parseTsconfigPaths', () => {
        it('should return empty object when tsconfig does not exist', () => {
            mockExistsSync.mockReturnValue(false);

            const result = parseTsconfigPaths('/project/tsconfig.json', '/project');

            expect(result).toEqual({});
            expect(mockReadFileSync).not.toHaveBeenCalled();
        });

        it('should parse paths from tsconfig.json', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(
                JSON.stringify({
                    compilerOptions: {
                        paths: {
                            '@/*': ['./src/*'],
                        },
                    },
                })
            );

            const result = parseTsconfigPaths('/project/tsconfig.json', '/project');

            // path.resolve normalizes and removes trailing slashes
            // Normalize paths for cross-platform comparison
            const normalizedResult = Object.fromEntries(
                Object.entries(result).map(([key, value]) => [key, normalizePath(value)])
            );
            expect(normalizedResult).toEqual({
                '@/': '/project/src',
            });
        });

        it('should handle baseUrl in tsconfig', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(
                JSON.stringify({
                    compilerOptions: {
                        baseUrl: './lib',
                        paths: {
                            '@/*': ['./utils/*'],
                        },
                    },
                })
            );

            const result = parseTsconfigPaths('/project/tsconfig.json', '/project');

            // path.resolve normalizes and removes trailing slashes
            // Normalize paths for cross-platform comparison
            const normalizedResult = Object.fromEntries(
                Object.entries(result).map(([key, value]) => [key, normalizePath(value)])
            );
            expect(normalizedResult).toEqual({
                '@/': '/project/lib/utils',
            });
        });

        it('should handle multiple path aliases', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(
                JSON.stringify({
                    compilerOptions: {
                        paths: {
                            '@/*': ['./src/*'],
                            '@components/*': ['./src/components/*'],
                            '@utils/*': ['./src/utils/*'],
                        },
                    },
                })
            );

            const result = parseTsconfigPaths('/project/tsconfig.json', '/project');

            // path.resolve normalizes and removes trailing slashes
            // Normalize paths for cross-platform comparison
            const normalizedResult = Object.fromEntries(
                Object.entries(result).map(([key, value]) => [key, normalizePath(value)])
            );
            expect(normalizedResult).toEqual({
                '@/': '/project/src',
                '@components/': '/project/src/components',
                '@utils/': '/project/src/utils',
            });
        });

        it('should prioritize exact aliases over wildcard aliases', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(
                JSON.stringify({
                    compilerOptions: {
                        paths: {
                            '@/*': ['./src/*'],
                            '@/config/server': ['./config.server.ts'],
                        },
                    },
                })
            );

            const result = parseTsconfigPaths('/project/tsconfig.json', '/project');
            const normalizedResult = Object.fromEntries(
                Object.entries(result).map(([key, value]) => [key, normalizePath(value)])
            );

            expect(normalizedResult).toEqual({
                '@/config/server': '/project/config.server.ts',
                '@/': '/project/src',
            });
            expect(Object.keys(normalizedResult)).toEqual(['@/config/server', '@/']);
        });

        it('should return empty object when paths is not defined', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(
                JSON.stringify({
                    compilerOptions: {},
                })
            );

            const result = parseTsconfigPaths('/project/tsconfig.json', '/project');

            expect(result).toEqual({});
        });

        it('should return empty object when compilerOptions is not defined', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify({}));

            const result = parseTsconfigPaths('/project/tsconfig.json', '/project');

            expect(result).toEqual({});
        });

        it('should handle JSON parse errors gracefully', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue('invalid json');

            const result = parseTsconfigPaths('/project/tsconfig.json', '/project');

            expect(result).toEqual({});
        });

        it('should skip paths with empty values array', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(
                JSON.stringify({
                    compilerOptions: {
                        paths: {
                            '@/*': [],
                            '@valid/*': ['./src/*'],
                        },
                    },
                })
            );

            const result = parseTsconfigPaths('/project/tsconfig.json', '/project');

            // path.resolve normalizes and removes trailing slashes
            // Normalize paths for cross-platform comparison
            const normalizedResult = Object.fromEntries(
                Object.entries(result).map(([key, value]) => [key, normalizePath(value)])
            );
            expect(normalizedResult).toEqual({
                '@valid/': '/project/src',
            });
        });
    });

    describe('importTypescript', () => {
        it('should import typescript file with jiti', async () => {
            const mockModule = { default: { foo: 'bar' } };
            const mockJitiImport = vi.fn().mockResolvedValue(mockModule);
            mockCreateJiti.mockReturnValue({ import: mockJitiImport });
            mockExistsSync.mockReturnValue(false); // No tsconfig

            const result = await importTypescript('/project/config.ts', {
                projectDirectory: '/project',
            });

            expect(mockCreateJiti).toHaveBeenCalledWith(expect.any(String), {
                fsCache: false,
                interopDefault: true,
                alias: {},
            });
            expect(mockJitiImport).toHaveBeenCalledWith('/project/config.ts');
            expect(result).toBe(mockModule);
        });

        it('should use custom tsconfigPath when provided', async () => {
            const mockModule = { default: { foo: 'bar' } };
            const mockJitiImport = vi.fn().mockResolvedValue(mockModule);
            mockCreateJiti.mockReturnValue({ import: mockJitiImport });
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(
                JSON.stringify({
                    compilerOptions: {
                        paths: {
                            '@/*': ['./src/*'],
                        },
                    },
                })
            );

            await importTypescript('/project/config.ts', {
                projectDirectory: '/project',
                tsconfigPath: '/project/custom-tsconfig.json',
            });

            expect(mockReadFileSync).toHaveBeenCalledWith('/project/custom-tsconfig.json', 'utf-8');
            // path.resolve normalizes and removes trailing slashes
            // Use normalizePath for cross-platform comparison
            const jitiCall = mockCreateJiti.mock.calls[0];
            const actualAlias = jitiCall[1]?.alias || {};
            const normalizedAlias = Object.fromEntries(
                Object.entries(actualAlias).map(([key, value]) => [key, normalizePath(value as string)])
            );
            expect(jitiCall[1]).toMatchObject({
                fsCache: false,
                interopDefault: true,
            });
            expect(normalizedAlias).toEqual({
                '@/': '/project/src',
            });
        });

        it('should default tsconfigPath to projectDirectory/tsconfig.json', async () => {
            const mockModule = { default: { foo: 'bar' } };
            const mockJitiImport = vi.fn().mockResolvedValue(mockModule);
            mockCreateJiti.mockReturnValue({ import: mockJitiImport });
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(
                JSON.stringify({
                    compilerOptions: {
                        paths: {
                            '@/*': ['./src/*'],
                        },
                    },
                })
            );

            await importTypescript('/project/config.ts', {
                projectDirectory: '/project',
            });

            // Use normalizePath for cross-platform comparison
            const actualPath = normalizePath(mockExistsSync.mock.calls[0][0] as string);
            expect(actualPath).toBe('/project/tsconfig.json');
        });

        it('should pass path aliases to jiti', async () => {
            const mockModule = { default: { foo: 'bar' } };
            const mockJitiImport = vi.fn().mockResolvedValue(mockModule);
            mockCreateJiti.mockReturnValue({ import: mockJitiImport });
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(
                JSON.stringify({
                    compilerOptions: {
                        paths: {
                            '@config/*': ['./config/*'],
                            '@utils/*': ['./utils/*'],
                        },
                    },
                })
            );

            await importTypescript('/project/config.ts', {
                projectDirectory: '/project',
            });

            // path.resolve normalizes and removes trailing slashes
            // Use normalizePath for cross-platform comparison
            const jitiCall = mockCreateJiti.mock.calls[0];
            const actualAlias = jitiCall[1]?.alias || {};
            const normalizedAlias = Object.fromEntries(
                Object.entries(actualAlias).map(([key, value]) => [key, normalizePath(value as string)])
            );
            expect(jitiCall[1]).toMatchObject({
                fsCache: false,
                interopDefault: true,
            });
            expect(normalizedAlias).toEqual({
                '@config/': '/project/config',
                '@utils/': '/project/utils',
            });
        });
    });
});
