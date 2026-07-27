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
import { vol } from 'memfs';
import { toPosixPath } from '../test-utils';
import { prepareForLocalDev } from './local-dev-setup';

// Mock fs-extra with memfs
vi.mock('fs-extra', async () => {
    const memfs = await import('memfs');
    return {
        default: memfs.fs,
        ...memfs.fs,
    };
});

// Mock prompts
vi.mock('prompts', () => ({
    default: vi.fn(),
}));

// Mock logger
vi.mock('./logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

import prompts from 'prompts';
import { logger } from './logger';

const logInfoSpy = vi.spyOn(logger, 'info');
const logWarnSpy = vi.spyOn(logger, 'warn');

describe('local-dev-setup', () => {
    beforeEach(() => {
        vol.reset();
        vi.clearAllMocks();
    });

    describe('prepareForLocalDev', () => {
        it('should throw error if package.json not found', async () => {
            vol.fromJSON({}, '/test-project');

            await expect(prepareForLocalDev({ projectDirectory: '/test-project' })).rejects.toThrow(
                'package.json not found in /test-project'
            );
        });

        it('should return early if no workspace dependencies found', async () => {
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        react: '^18.0.0',
                    },
                }),
            });

            await prepareForLocalDev({ projectDirectory: '/test-project' });

            expect(logInfoSpy).toHaveBeenCalledWith(
                'No workspace:* dependencies found. Project is ready for standalone use.'
            );
        });

        it('should find workspace:* dependencies in all dependency types', async () => {
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-runtime': 'workspace:*',
                    },
                    devDependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                }),
                '/packages/storefront-next-runtime/package.json': '{}',
                '/packages/storefront-next-dev/package.json': '{}',
            });

            vi.mocked(prompts)
                .mockResolvedValueOnce({ localPath: '/packages/storefront-next-runtime' })
                .mockResolvedValueOnce({ localPath: '/packages/storefront-next-dev' });

            await prepareForLocalDev({ projectDirectory: '/test-project' });

            // Should have been called twice (once for each workspace dep)
            expect(prompts).toHaveBeenCalledTimes(2);
        });

        it('should use sourcePackagesDir to suggest default paths', async () => {
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                }),
                '/monorepo/packages/storefront-next-dev/package.json': '{}',
            });

            vi.mocked(prompts).mockResolvedValueOnce({
                localPath: '/monorepo/packages/storefront-next-dev',
            });

            await prepareForLocalDev({
                projectDirectory: '/test-project',
                sourcePackagesDir: '/monorepo/packages',
            });

            // Check that prompts was called with the suggested default path
            // Normalize paths for cross-platform comparison (Windows uses backslashes)
            expect(prompts).toHaveBeenCalled();
            // Verify the actual path value matches expected (normalized to POSIX)
            const calls = vi.mocked(prompts).mock.calls;
            const lastCall = calls[calls.length - 1];
            if (
                lastCall &&
                Array.isArray(lastCall) &&
                lastCall[0] &&
                typeof lastCall[0] === 'object' &&
                'initial' in lastCall[0]
            ) {
                const actualPath = lastCall[0].initial as string;
                const expectedPath = '/monorepo/packages/storefront-next-dev';
                expect(toPosixPath(actualPath)).toBe(toPosixPath(expectedPath));
            } else {
                throw new Error('prompts was not called with expected structure');
            }
        });

        it('should warn and skip prompts when defaults=true but default path does not exist', async () => {
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                }),
                // sourcePackagesDir points somewhere that does NOT contain the package
            });

            await prepareForLocalDev({
                projectDirectory: '/test-project',
                sourcePackagesDir: '/missing/packages',
                defaults: true,
            });

            // Should not prompt at all
            expect(prompts).not.toHaveBeenCalled();
            // Should warn that the default path was not found
            expect(logWarnSpy).toHaveBeenCalledWith(expect.stringContaining('default path not found'));
        });

        it('should replace workspace:* with file: references', async () => {
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                }),
                '/packages/storefront-next-dev/package.json': '{}',
            });

            vi.mocked(prompts).mockResolvedValueOnce({
                localPath: '/packages/storefront-next-dev',
            });

            await prepareForLocalDev({ projectDirectory: '/test-project' });

            const updatedPackageJson = JSON.parse(vol.readFileSync('/test-project/package.json', 'utf8') as string);
            expect(updatedPackageJson.dependencies['@salesforce/storefront-next-dev']).toBe(
                'file:/packages/storefront-next-dev'
            );
            expect(logInfoSpy).toHaveBeenCalledWith('package.json updated with local package links');
        });

        it('should remove unresolved workspace dependencies', async () => {
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                }),
            });

            // User provides no path (empty response)
            vi.mocked(prompts).mockResolvedValueOnce({ localPath: '' });

            await prepareForLocalDev({ projectDirectory: '/test-project' });

            const updatedPackageJson = JSON.parse(vol.readFileSync('/test-project/package.json', 'utf8') as string);
            expect(updatedPackageJson.dependencies['@salesforce/storefront-next-dev']).toBeUndefined();
            expect(logWarnSpy).toHaveBeenCalledWith('Skipping @salesforce/storefront-next-dev - no path provided');
            expect(logWarnSpy).toHaveBeenCalledWith(
                'Removing unresolved workspace dependency: @salesforce/storefront-next-dev'
            );
        });

        it('should remove volta.extends from package.json', async () => {
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                    volta: {
                        extends: '../../package.json',
                        node: '24.0.0',
                    },
                }),
                '/packages/storefront-next-dev/package.json': '{}',
            });

            vi.mocked(prompts).mockResolvedValueOnce({
                localPath: '/packages/storefront-next-dev',
            });

            await prepareForLocalDev({ projectDirectory: '/test-project' });

            const updatedPackageJson = JSON.parse(vol.readFileSync('/test-project/package.json', 'utf8') as string);
            expect(updatedPackageJson.volta.extends).toBeUndefined();
            expect(updatedPackageJson.volta.node).toBe('24.0.0');
        });

        it('should remove empty volta object', async () => {
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                    volta: {
                        extends: '../../package.json',
                    },
                }),
                '/packages/storefront-next-dev/package.json': '{}',
            });

            vi.mocked(prompts).mockResolvedValueOnce({
                localPath: '/packages/storefront-next-dev',
            });

            await prepareForLocalDev({ projectDirectory: '/test-project' });

            const updatedPackageJson = JSON.parse(vol.readFileSync('/test-project/package.json', 'utf8') as string);
            expect(updatedPackageJson.volta).toBeUndefined();
        });

        it('should skip duplicate packages that appear in multiple dep types', async () => {
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                    peerDependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                }),
                '/packages/storefront-next-dev/package.json': '{}',
            });

            vi.mocked(prompts).mockResolvedValueOnce({
                localPath: '/packages/storefront-next-dev',
            });

            await prepareForLocalDev({ projectDirectory: '/test-project' });

            // Should only be called once (skips duplicate)
            expect(prompts).toHaveBeenCalledTimes(1);

            const updatedPackageJson = JSON.parse(vol.readFileSync('/test-project/package.json', 'utf8') as string);
            // Both should be updated
            expect(updatedPackageJson.dependencies['@salesforce/storefront-next-dev']).toBe(
                'file:/packages/storefront-next-dev'
            );
            expect(updatedPackageJson.peerDependencies['@salesforce/storefront-next-dev']).toBe(
                'file:/packages/storefront-next-dev'
            );
        });
    });

    describe('patchViteConfigForLinkedPackages (via prepareForLocalDev)', () => {
        it('should warn if vite.config.ts not found', async () => {
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                }),
                '/packages/storefront-next-dev/package.json': '{}',
            });

            vi.mocked(prompts).mockResolvedValueOnce({
                localPath: '/packages/storefront-next-dev',
            });

            await prepareForLocalDev({ projectDirectory: '/test-project' });

            expect(logWarnSpy).toHaveBeenCalledWith(
                'vite.config.ts not found, skipping patch for file-linked packages'
            );
        });

        it('should add ssr.noExternal block when ssr block does not exist', async () => {
            const viteConfig = `
import { defineConfig } from 'vite';

export default defineConfig(() => {
    return {
        plugins: [],
    };
});
`;
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                }),
                '/test-project/vite.config.ts': viteConfig,
                '/packages/storefront-next-dev/package.json': '{}',
            });

            vi.mocked(prompts).mockResolvedValueOnce({
                localPath: '/packages/storefront-next-dev',
            });

            await prepareForLocalDev({ projectDirectory: '/test-project' });

            const updatedViteConfig = vol.readFileSync('/test-project/vite.config.ts', 'utf8') as string;
            expect(updatedViteConfig).toContain('ssr:');
            expect(updatedViteConfig).toContain('noExternal:');
            expect(updatedViteConfig).toContain("'@salesforce/storefront-next-dev'");
            expect(logInfoSpy).toHaveBeenCalledWith(
                'vite.config.ts patched for file-linked packages (ssr.noExternal + resolve.dedupe)'
            );
        });

        it('should add noExternal to existing ssr block', async () => {
            const viteConfig = `
import { defineConfig } from 'vite';

export default defineConfig(() => {
    return {
        ssr: {
            target: 'node',
        },
    };
});
`;
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                }),
                '/test-project/vite.config.ts': viteConfig,
                '/packages/storefront-next-dev/package.json': '{}',
            });

            vi.mocked(prompts).mockResolvedValueOnce({
                localPath: '/packages/storefront-next-dev',
            });

            await prepareForLocalDev({ projectDirectory: '/test-project' });

            const updatedViteConfig = vol.readFileSync('/test-project/vite.config.ts', 'utf8') as string;
            expect(updatedViteConfig).toContain('noExternal:');
            expect(updatedViteConfig).toContain("'@salesforce/storefront-next-dev'");
        });

        it('should add dedupe to existing resolve block', async () => {
            const viteConfig = `
import { defineConfig } from 'vite';

export default defineConfig(() => {
    return {
        resolve: {
            alias: { '@': './src' },
        },
    };
});
`;
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                }),
                '/test-project/vite.config.ts': viteConfig,
                '/packages/storefront-next-dev/package.json': '{}',
            });

            vi.mocked(prompts).mockResolvedValueOnce({
                localPath: '/packages/storefront-next-dev',
            });

            await prepareForLocalDev({ projectDirectory: '/test-project' });

            const updatedViteConfig = vol.readFileSync('/test-project/vite.config.ts', 'utf8') as string;
            expect(updatedViteConfig).toContain('dedupe:');
            expect(updatedViteConfig).toContain("'react'");
            expect(updatedViteConfig).toContain("'react-dom'");
            expect(updatedViteConfig).toContain("'react-router'");
        });

        it('should merge packages into existing noExternal array', async () => {
            const viteConfig = `
import { defineConfig } from 'vite';

export default defineConfig(() => {
    return {
        ssr: {
            noExternal: ['existing-package'],
        },
    };
});
`;
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                }),
                '/test-project/vite.config.ts': viteConfig,
                '/packages/storefront-next-dev/package.json': '{}',
            });

            vi.mocked(prompts).mockResolvedValueOnce({
                localPath: '/packages/storefront-next-dev',
            });

            await prepareForLocalDev({ projectDirectory: '/test-project' });

            const updatedViteConfig = vol.readFileSync('/test-project/vite.config.ts', 'utf8') as string;
            expect(updatedViteConfig).toContain("noExternal: ['existing-package', '@salesforce/storefront-next-dev']");
        });

        it('should not duplicate packages already in noExternal', async () => {
            const viteConfig = `
import { defineConfig } from 'vite';

export default defineConfig(() => {
    return {
        ssr: {
            noExternal: ['@salesforce/storefront-next-dev'],
        },
    };
});
`;
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                }),
                '/test-project/vite.config.ts': viteConfig,
                '/packages/storefront-next-dev/package.json': '{}',
            });

            vi.mocked(prompts).mockResolvedValueOnce({
                localPath: '/packages/storefront-next-dev',
            });

            await prepareForLocalDev({ projectDirectory: '/test-project' });

            // Should report already configured since dedupe is also checked
            expect(logInfoSpy).toHaveBeenCalledWith('vite.config.ts already configured for file-linked packages');
        });

        it('should skip dedupe if already present', async () => {
            const viteConfig = `
import { defineConfig } from 'vite';

export default defineConfig(() => {
    return {
        resolve: {
            dedupe: ['react'],
        },
    };
});
`;
            vol.fromJSON({
                '/test-project/package.json': JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        '@salesforce/storefront-next-dev': 'workspace:*',
                    },
                }),
                '/test-project/vite.config.ts': viteConfig,
                '/packages/storefront-next-dev/package.json': '{}',
            });

            vi.mocked(prompts).mockResolvedValueOnce({
                localPath: '/packages/storefront-next-dev',
            });

            await prepareForLocalDev({ projectDirectory: '/test-project' });

            const updatedViteConfig = vol.readFileSync('/test-project/vite.config.ts', 'utf8') as string;
            // Should not add another dedupe block
            const dedupeMatches = updatedViteConfig.match(/dedupe:/g);
            expect(dedupeMatches?.length).toBe(1);
        });
    });
});
