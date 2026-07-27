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
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { platformEntryPlugin } from './platformEntry';

vi.mock('node:fs', () => ({
    default: {
        existsSync: vi.fn(() => false),
    },
}));

import fs from 'node:fs';

// Helper to call plugin hooks that can be functions or objects
function callHook(hook: any, ...args: any[]) {
    if (typeof hook === 'function') {
        return hook(...args);
    }
    if (hook && typeof hook.handler === 'function') {
        return hook.handler(...args);
    }
}

const TEST_APP_DIR = '/project/src';
const TEST_SERVER_ENTRY = '/project/src/entry.server.tsx';
const TEST_CLIENT_ENTRY = '/project/src/entry.client.tsx';

/** Normalize to forward slashes to match generated import paths. */
const toPosix = (p: string) => p.replace(/\\/g, '/');
const RR_DEFAULT_SERVER_ENTRY = '/project/node_modules/@react-router/dev/dist/config/defaults/entry.server.node.tsx';
const RR_DEFAULT_CLIENT_ENTRY = '/project/node_modules/@react-router/dev/dist/config/defaults/entry.client.tsx';

function createMockResolvedConfig({
    appDirectory = TEST_APP_DIR,
    serverEntryPath = RR_DEFAULT_SERVER_ENTRY,
    clientEntryPath = RR_DEFAULT_CLIENT_ENTRY,
}: {
    appDirectory?: string;
    serverEntryPath?: string;
    clientEntryPath?: string;
} = {}) {
    return {
        root: '/project',
        __reactRouterPluginContext: {
            reactRouterConfig: {
                appDirectory,
                buildDirectory: '/project/build',
            },
            entryServerFilePath: serverEntryPath,
            entryClientFilePath: clientEntryPath,
        },
    };
}

/**
 * Sets up the plugin through config + configResolved hooks.
 */
function setupPlugin({
    mode = 'production',
    config = createMockResolvedConfig(),
}: {
    mode?: string;
    config?: ReturnType<typeof createMockResolvedConfig>;
} = {}) {
    const plugin = platformEntryPlugin();
    callHook(plugin.config, {}, { mode });
    callHook(plugin.configResolved, config);
    return plugin;
}

describe('platformEntryPlugin', () => {
    beforeEach(() => {
        vi.mocked(fs.existsSync).mockReset();
        vi.mocked(fs.existsSync).mockReturnValue(false);
    });

    it('should return a plugin with correct name', () => {
        const plugin = platformEntryPlugin();
        expect(plugin.name).toBe('storefront-next:platform-entry');
    });

    it('should have enforce set to pre', () => {
        const plugin = platformEntryPlugin();
        expect(plugin.enforce).toBe('pre');
    });

    describe('test mode', () => {
        it('should disable load in test mode', () => {
            const plugin = setupPlugin({ mode: 'test' });
            const result = callHook(plugin.load, RR_DEFAULT_SERVER_ENTRY);
            expect(result).toBeNull();
        });
    });

    describe('load — non-ejected (default entries)', () => {
        it('should intercept the server entry file path and return composed code', () => {
            const plugin = setupPlugin();
            const result = callHook(plugin.load, RR_DEFAULT_SERVER_ENTRY);

            expect(result).toContain(`${RR_DEFAULT_SERVER_ENTRY}?platform-passthrough`);
            expect(result).toContain('@salesforce/storefront-next-dev/entry/server');
            expect(result).toContain('composeServerEntry');
            expect(result).toContain('export default _composed.default');
            expect(result).toContain('export const handleError');
            expect(result).toContain('export const instrumentations');
            expect(result).toContain('export const streamTimeout');
        });

        it('should include export * to forward unknown future exports from the app entry', () => {
            const plugin = setupPlugin();
            const result = callHook(plugin.load, RR_DEFAULT_SERVER_ENTRY);

            // The generated code should re-export everything from the app entry
            // so that future React Router exports pass through without a plugin update
            expect(result).toMatch(/export \* from/);
            expect(result).toContain(`${RR_DEFAULT_SERVER_ENTRY}?platform-passthrough`);
        });

        it('should intercept the client entry file path and return composed code', () => {
            const plugin = setupPlugin();
            const result = callHook(plugin.load, RR_DEFAULT_CLIENT_ENTRY);

            expect(result).toContain('@salesforce/storefront-next-dev/entry/client');
            expect(result).toContain(`${RR_DEFAULT_CLIENT_ENTRY}?platform-passthrough`);
        });

        it('should use passthrough query for non-ejected entries to resolve in app context', () => {
            const plugin = setupPlugin();

            const serverResult = callHook(plugin.load, RR_DEFAULT_SERVER_ENTRY);
            expect(serverResult).toContain(`${RR_DEFAULT_SERVER_ENTRY}?platform-passthrough`);

            const clientResult = callHook(plugin.load, RR_DEFAULT_CLIENT_ENTRY);
            expect(clientResult).toContain(`${RR_DEFAULT_CLIENT_ENTRY}?platform-passthrough`);
        });

        it('should return null for unrelated module ids', () => {
            const plugin = setupPlugin();
            const result = callHook(plugin.load, '/some/real/file.ts');
            expect(result).toBeNull();
        });

        it('should skip IDs with passthrough query', () => {
            const plugin = setupPlugin();
            const result = callHook(plugin.load, `${RR_DEFAULT_SERVER_ENTRY}?platform-passthrough`);
            expect(result).toBeNull();
        });
    });

    describe('load — ejected entries', () => {
        it('should generate server entry code importing the user file with passthrough query', () => {
            vi.mocked(fs.existsSync).mockImplementation((filePath) => {
                return filePath === path.resolve(TEST_APP_DIR, 'entry.server.tsx');
            });

            const plugin = setupPlugin({
                config: createMockResolvedConfig({
                    serverEntryPath: TEST_SERVER_ENTRY,
                }),
            });

            const result = callHook(plugin.load, TEST_SERVER_ENTRY);

            // Should import from the user's file with passthrough query
            expect(result).toContain(`${toPosix(path.resolve(TEST_APP_DIR, 'entry.server.tsx'))}?platform-passthrough`);
            // Should not import from SDK defaults
            expect(result).not.toContain('entry/defaults/entry.server');
            // Should still use composeServerEntry
            expect(result).toContain('composeServerEntry');
        });

        it('should generate client entry code importing the user file with passthrough query', () => {
            vi.mocked(fs.existsSync).mockImplementation((filePath) => {
                return filePath === path.resolve(TEST_APP_DIR, 'entry.client.tsx');
            });

            const plugin = setupPlugin({
                config: createMockResolvedConfig({
                    clientEntryPath: TEST_CLIENT_ENTRY,
                }),
            });

            const result = callHook(plugin.load, TEST_CLIENT_ENTRY);

            expect(result).toContain(`${toPosix(path.resolve(TEST_APP_DIR, 'entry.client.tsx'))}?platform-passthrough`);
            expect(result).not.toContain('entry/defaults/entry.client');
        });

        it('should skip passthrough-queried ejected entry files (no circular load)', () => {
            vi.mocked(fs.existsSync).mockImplementation((filePath) => {
                return filePath === path.resolve(TEST_APP_DIR, 'entry.server.tsx');
            });

            const plugin = setupPlugin({
                config: createMockResolvedConfig({
                    serverEntryPath: TEST_SERVER_ENTRY,
                }),
            });

            // The passthrough import should not be intercepted
            const result = callHook(plugin.load, `${TEST_SERVER_ENTRY}?platform-passthrough`);
            expect(result).toBeNull();
        });
    });

    describe('without react router plugin context', () => {
        it('should be a no-op when __reactRouterPluginContext is missing', () => {
            const plugin = platformEntryPlugin();
            callHook(plugin.config, {}, { mode: 'production' });
            callHook(plugin.configResolved, { root: '/project' });

            const result = callHook(plugin.load, RR_DEFAULT_SERVER_ENTRY);
            expect(result).toBeNull();
        });
    });

    describe('configureServer — file watcher', () => {
        function createMockServer() {
            const listeners: Record<string, ((...args: any[]) => void)[]> = {};
            return {
                restart: vi.fn().mockResolvedValue(undefined),
                watcher: {
                    on(event: string, cb: (...args: any[]) => void) {
                        listeners[event] = listeners[event] ?? [];
                        listeners[event].push(cb);
                    },
                },
                _emit(event: string, ...args: any[]) {
                    for (const cb of listeners[event] ?? []) cb(...args);
                },
            };
        }

        it('should restart when a new entry file is added', () => {
            // Start with no ejected entries
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const plugin = setupPlugin();
            const server = createMockServer();
            callHook(plugin.configureServer, server);

            // Simulate entry file appearing — existsSync now finds it
            vi.mocked(fs.existsSync).mockImplementation((p) => p === path.resolve(TEST_APP_DIR, 'entry.server.tsx'));
            server._emit('add', path.join(TEST_APP_DIR, 'entry.server.tsx'));

            expect(server.restart).toHaveBeenCalled();
        });

        it('should restart when an entry file is removed', () => {
            // Start with an ejected server entry
            vi.mocked(fs.existsSync).mockImplementation((p) => p === path.resolve(TEST_APP_DIR, 'entry.server.tsx'));
            const plugin = setupPlugin({
                config: createMockResolvedConfig({ serverEntryPath: TEST_SERVER_ENTRY }),
            });
            const server = createMockServer();
            callHook(plugin.configureServer, server);

            // Simulate entry file being deleted
            vi.mocked(fs.existsSync).mockReturnValue(false);
            server._emit('unlink', path.join(TEST_APP_DIR, 'entry.server.tsx'));

            expect(server.restart).toHaveBeenCalled();
        });

        it('should ignore files in subdirectories', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const plugin = setupPlugin();
            const server = createMockServer();
            callHook(plugin.configureServer, server);

            server._emit('add', path.join(TEST_APP_DIR, 'nested', 'entry.server.tsx'));

            expect(server.restart).not.toHaveBeenCalled();
        });

        it('should ignore non-entry files', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const plugin = setupPlugin();
            const server = createMockServer();
            callHook(plugin.configureServer, server);

            server._emit('add', path.join(TEST_APP_DIR, 'other-file.tsx'));

            expect(server.restart).not.toHaveBeenCalled();
        });

        it('should ignore files with unsupported extensions', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const plugin = setupPlugin();
            const server = createMockServer();
            callHook(plugin.configureServer, server);

            server._emit('add', path.join(TEST_APP_DIR, 'entry.server.json'));

            expect(server.restart).not.toHaveBeenCalled();
        });

        it('should not restart when ejection status has not changed', () => {
            // No ejected entries, and a file add event but still no entry found
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const plugin = setupPlugin();
            const server = createMockServer();
            callHook(plugin.configureServer, server);

            // File event fires but existsSync still returns false (e.g., temp file)
            server._emit('add', path.join(TEST_APP_DIR, 'entry.server.tsx'));

            expect(server.restart).not.toHaveBeenCalled();
        });

        it('should be a no-op in test mode', () => {
            const plugin = setupPlugin({ mode: 'test' });
            const server = createMockServer();
            callHook(plugin.configureServer, server);

            // In test mode, no listeners should be registered
            server._emit('add', path.join(TEST_APP_DIR, 'entry.server.tsx'));
            expect(server.restart).not.toHaveBeenCalled();
        });
    });
});
