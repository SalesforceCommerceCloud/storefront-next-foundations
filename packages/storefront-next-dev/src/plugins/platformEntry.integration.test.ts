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
 * Integration tests for platformEntryPlugin.
 *
 * These tests create a real Vite dev server (no HTTP listener) and use
 * transformRequest() to verify the plugin produces correct module output
 * when running through Vite's full plugin pipeline (resolveId → load → transform).
 *
 * This complements the unit tests in platformEntry.test.ts which call the
 * load hook directly and assert on raw code strings.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type ViteDevServer, type Plugin } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { platformEntryPlugin } from './platformEntry';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// ------- Test Helpers -------

interface FixtureConfig {
    hasUserServerEntry?: boolean;
    hasUserClientEntry?: boolean;
}

interface Fixture {
    rootDir: string;
    appDirectory: string;
    serverEntryFilePath: string;
    clientEntryFilePath: string;
    cleanup: () => void;
}

/**
 * Creates a temporary fixture directory with minimal entry file stubs.
 *
 * For non-ejected scenarios, entry paths point to files under defaults/.
 * For ejected scenarios, entry paths point to user files under src/.
 */
function createFixture(config: FixtureConfig = {}): Fixture {
    // Use realpathSync to resolve macOS /var → /private/var symlink.
    // Vite normalizes its root with realpathSync, so all fixture paths must match.
    const rootDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'platform-entry-test-')));
    const appDir = path.join(rootDir, 'src');
    const defaultsDir = path.join(rootDir, 'defaults');

    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(defaultsDir, { recursive: true });

    // Default entry stubs (simulating React Router's built-in defaults)
    fs.writeFileSync(
        path.join(defaultsDir, 'entry.server.node.tsx'),
        'export default function handleRequest() { return new Response("ok"); }\n'
    );
    fs.writeFileSync(path.join(defaultsDir, 'entry.client.tsx'), 'export default function hydrate() {}\n');

    let serverEntryFilePath: string;
    let clientEntryFilePath: string;

    if (config.hasUserServerEntry) {
        fs.writeFileSync(
            path.join(appDir, 'entry.server.tsx'),
            'export default function handleRequest() { return new Response("custom"); }\n'
        );
        serverEntryFilePath = path.join(appDir, 'entry.server.tsx');
    } else {
        serverEntryFilePath = path.join(defaultsDir, 'entry.server.node.tsx');
    }

    if (config.hasUserClientEntry) {
        fs.writeFileSync(path.join(appDir, 'entry.client.tsx'), 'export default function hydrate() { /* custom */ }\n');
        clientEntryFilePath = path.join(appDir, 'entry.client.tsx');
    } else {
        clientEntryFilePath = path.join(defaultsDir, 'entry.client.tsx');
    }

    return {
        rootDir,
        appDirectory: appDir,
        serverEntryFilePath,
        clientEntryFilePath,
        cleanup: () => fs.rmSync(rootDir, { recursive: true, force: true }),
    };
}

/**
 * Mock plugin that injects __reactRouterPluginContext onto the config,
 * simulating what React Router's Vite plugin does.
 *
 * Uses the config hook (not configResolved) because platformEntryPlugin
 * reads the context during configResolved. Vite calls all config hooks
 * and merges results before calling configResolved.
 */
function mockReactRouterContextPlugin(fixture: Fixture): Plugin {
    return {
        name: 'test:mock-rr-context',
        config(config) {
            (config as any).__reactRouterPluginContext = {
                reactRouterConfig: {
                    appDirectory: fixture.appDirectory,
                    buildDirectory: path.join(fixture.rootDir, 'build'),
                },
                entryServerFilePath: fixture.serverEntryFilePath,
                entryClientFilePath: fixture.clientEntryFilePath,
            };
        },
    };
}

/**
 * Resolves SDK entry imports to actual source files in the monorepo.
 * The generated composition code imports from these package paths.
 */
function sdkImportResolver(): Plugin {
    return {
        name: 'test:sdk-resolver',
        resolveId(id) {
            if (id === '@salesforce/storefront-next-dev/entry/server') {
                return path.resolve(currentDir, '../entry/server.ts');
            }
            if (id === '@salesforce/storefront-next-dev/entry/client') {
                return path.resolve(currentDir, '../entry/client.ts');
            }
            return null;
        },
    };
}

async function createTestViteServer(fixture: Fixture, options: { mode?: string } = {}): Promise<ViteDevServer> {
    return createServer({
        configFile: false,
        root: fixture.rootDir,
        mode: options.mode,
        plugins: [mockReactRouterContextPlugin(fixture), platformEntryPlugin(), sdkImportResolver()],
        server: {
            middlewareMode: true,
            // Disable strict filesystem checking so Vite can read files from
            // temp directories on Windows. Without this, searchForWorkspaceRoot()
            // may not find a workspace root above the temp dir, causing
            // isFileLoadingAllowed() to reject reads from within the fixture.
            fs: { strict: false },
        },
        // Prevent Vite from calling realpathSync on resolved file paths.
        // On Windows, Vite's safeRealpathSync can asynchronously switch from
        // fs.realpathSync to fs.realpathSync.native (after a background `net use`
        // check). The native version returns the canonical case from the filesystem,
        // which may differ from the case used in our fixture paths, causing the
        // plugin's path comparison to fail.
        resolve: { preserveSymlinks: true },
        optimizeDeps: { noDiscovery: true },
        logLevel: 'silent',
    });
}

/** Convert an absolute file path to a Vite URL relative to the fixture root. */
function toViteUrl(fixture: Fixture, filePath: string, query = ''): string {
    return `/${path.relative(fixture.rootDir, filePath).split(path.sep).join('/')}${query}`;
}

// ------- Tests -------

describe('platformEntryPlugin integration', () => {
    describe('non-ejected entries', () => {
        let fixture: Fixture;
        let server: ViteDevServer;

        beforeAll(async () => {
            fixture = createFixture({ hasUserServerEntry: false, hasUserClientEntry: false });
            server = await createTestViteServer(fixture);
        });

        afterAll(async () => {
            await server.close();
            fixture.cleanup();
        });

        it('server entry generates composition code', async () => {
            const result = await server.transformRequest(toViteUrl(fixture, fixture.serverEntryFilePath));
            const code = result?.code ?? '';

            expect(code).toContain('composeServerEntry');
            expect(code).toContain('platform-passthrough');
            expect(code).toContain('_composed.default');
            expect(code).toContain('handleDataRequest');
            expect(code).toContain('handleError');
            expect(code).toContain('streamTimeout');
        });

        it('client entry generates composition code', async () => {
            const result = await server.transformRequest(toViteUrl(fixture, fixture.clientEntryFilePath));
            const code = result?.code ?? '';

            expect(code).toContain('entry/client');
            expect(code).toContain('platform-passthrough');
        });
    });

    describe('ejected entries', () => {
        let fixture: Fixture;
        let server: ViteDevServer;

        beforeAll(async () => {
            fixture = createFixture({ hasUserServerEntry: true, hasUserClientEntry: true });
            server = await createTestViteServer(fixture);
        });

        afterAll(async () => {
            await server.close();
            fixture.cleanup();
        });

        it('server entry wraps user file', async () => {
            const result = await server.transformRequest(toViteUrl(fixture, fixture.serverEntryFilePath));
            const code = result?.code ?? '';

            expect(code).toContain('composeServerEntry');
            expect(code).toContain('platform-passthrough');
            expect(code).not.toContain('defaults/entry.server');
        });

        it('client entry wraps user file', async () => {
            const result = await server.transformRequest(toViteUrl(fixture, fixture.clientEntryFilePath));
            const code = result?.code ?? '';

            expect(code).toContain('entry/client');
            expect(code).toContain('platform-passthrough');
            expect(code).not.toContain('defaults/entry.client');
        });

        it('both entries are wrapped correctly in parallel', async () => {
            const [serverResult, clientResult] = await Promise.all([
                server.transformRequest(toViteUrl(fixture, fixture.serverEntryFilePath)),
                server.transformRequest(toViteUrl(fixture, fixture.clientEntryFilePath)),
            ]);

            const serverCode = serverResult?.code ?? '';
            const clientCode = clientResult?.code ?? '';

            expect(serverCode).toContain('composeServerEntry');
            expect(serverCode).toContain('platform-passthrough');

            expect(clientCode).toContain('entry/client');
            expect(clientCode).toContain('platform-passthrough');
        });
    });

    describe('passthrough bypass', () => {
        let fixture: Fixture;
        let server: ViteDevServer;

        beforeAll(async () => {
            fixture = createFixture({ hasUserServerEntry: false, hasUserClientEntry: false });
            server = await createTestViteServer(fixture);
        });

        afterAll(async () => {
            await server.close();
            fixture.cleanup();
        });

        it('passthrough query bypasses composition (no infinite loop)', async () => {
            const result = await server.transformRequest(
                toViteUrl(fixture, fixture.serverEntryFilePath, '?platform-passthrough')
            );
            const code = result?.code ?? '';

            expect(code).not.toContain('composeServerEntry');
            expect(code).toContain('handleRequest');
        });
    });

    describe('test mode', () => {
        let fixture: Fixture;
        let server: ViteDevServer;

        beforeAll(async () => {
            fixture = createFixture({ hasUserServerEntry: false, hasUserClientEntry: false });
            server = await createTestViteServer(fixture, { mode: 'test' });
        });

        afterAll(async () => {
            await server.close();
            fixture.cleanup();
        });

        it('test mode disables plugin — raw file content returned', async () => {
            const result = await server.transformRequest(toViteUrl(fixture, fixture.serverEntryFilePath));
            const code = result?.code ?? '';

            expect(code).not.toContain('composeServerEntry');
            expect(code).toContain('handleRequest');
        });
    });
});
