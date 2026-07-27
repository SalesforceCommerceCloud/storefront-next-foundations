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
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const mockInitializePlugins = vi.hoisted(() => vi.fn());

vi.mock('../cli-plugins.js', () => ({
    initializePlugins: mockInitializePlugins,
}));

describe('init hook', () => {
    let loadEnvFileSpy: ReturnType<typeof vi.spyOn>;

    // Standalone-bin context: the published `sfnext` CLI runs every command with bin === 'sfnext',
    // so the scope guard always passes. All existing behavior (.env load, plugin discovery)
    // continues unchanged.
    const standaloneCtx = { config: { bin: 'sfnext' } } as never;

    beforeEach(() => {
        vi.clearAllMocks();
        loadEnvFileSpy = vi.spyOn(process, 'loadEnvFile').mockImplementation(() => undefined);
    });

    test('calls initializePlugins', async () => {
        const { default: hook } = await import('./init.js');
        await hook.call(standaloneCtx, { argv: [] } as never);

        expect(mockInitializePlugins).toHaveBeenCalledOnce();
    });

    test('loads .env from cwd when no --project-directory flag given', async () => {
        const { default: hook } = await import('./init.js');
        await hook.call(standaloneCtx, { argv: [] } as never);

        expect(loadEnvFileSpy).toHaveBeenCalledWith(path.join(process.cwd(), '.env'));
    });

    test('loads .env from --project-directory flag value', async () => {
        const { default: hook } = await import('./init.js');
        await hook.call(standaloneCtx, { argv: ['--project-directory', '/custom/dir'] } as never);

        expect(loadEnvFileSpy).toHaveBeenCalledWith(path.join(path.resolve('/custom/dir'), '.env'));
    });

    test('loads .env from -d shorthand', async () => {
        const { default: hook } = await import('./init.js');
        await hook.call(standaloneCtx, { argv: ['-d', '/short/dir'] } as never);

        expect(loadEnvFileSpy).toHaveBeenCalledWith(path.join(path.resolve('/short/dir'), '.env'));
    });

    test('loads .env from --project-directory=value inline form', async () => {
        const { default: hook } = await import('./init.js');
        await hook.call(standaloneCtx, { argv: ['--project-directory=/inline/dir'] } as never);

        expect(loadEnvFileSpy).toHaveBeenCalledWith(path.join(path.resolve('/inline/dir'), '.env'));
    });

    test('falls back to cwd when --project-directory is followed by another flag instead of a value', async () => {
        const { default: hook } = await import('./init.js');
        await hook.call(standaloneCtx, { argv: ['--project-directory', '--yes'] } as never);

        expect(loadEnvFileSpy).toHaveBeenCalledWith(path.join(process.cwd(), '.env'));
    });

    test('swallows error when .env file is not found', async () => {
        loadEnvFileSpy.mockImplementationOnce(() => {
            throw new Error('file not found');
        });

        const { default: hook } = await import('./init.js');
        await expect(hook.call(standaloneCtx, { argv: [] } as never)).resolves.toBeUndefined();
    });

    test('runs body for sfnext-namespaced commands when loaded under another CLI', async () => {
        const { default: hook } = await import('./init.js');
        await hook.call({ config: { bin: 'b2c' } } as never, { argv: [], id: 'sfnext:dev' } as never);

        expect(mockInitializePlugins).toHaveBeenCalledOnce();
        expect(loadEnvFileSpy).toHaveBeenCalled();
    });

    test('does NOT run body for unrelated commands of a host CLI', async () => {
        const { default: hook } = await import('./init.js');
        await hook.call({ config: { bin: 'b2c' } } as never, { argv: [], id: 'auth:login' } as never);

        expect(mockInitializePlugins).not.toHaveBeenCalled();
        expect(loadEnvFileSpy).not.toHaveBeenCalled();
    });
});

// Integration test: runs against the real built dist/hooks/init.js via oclif's runHook.
// Requires `pnpm build` to be run first. Skipped automatically when dist is missing.
// Run explicitly with: pnpm build && pnpm test src/hooks/init.test.ts
// Confirms that vars from a non-CWD --project-directory .env land in process.env
// before oclif resolves env-backed flag defaults (e.g. flags with env: 'MRT_PROJECT').
describe('init hook — integration', () => {
    const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
    const distExists = fs.existsSync(path.join(ROOT, 'dist/hooks/init.js'));
    let testDir: string;

    beforeEach(() => {
        // Undo the outer beforeEach spy so process.loadEnvFile is the real implementation.
        vi.restoreAllMocks();
        testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfnext-init-'));
    });

    afterEach(() => {
        fs.rmSync(testDir, { recursive: true, force: true });
        delete process.env.MRT_PROJECT;
    });

    test.skipIf(!distExists)(
        'env vars from --project-directory .env are in process.env before flag resolution',
        async () => {
            fs.writeFileSync(path.join(testDir, '.env'), 'MRT_PROJECT=from-project-dir\n');
            delete process.env.MRT_PROJECT;

            // Import the built hook directly rather than via runHook (which loads the full
            // oclif Config and all command dist files). Using runHook causes V8 coverage to
            // source-map the dist execution back to src files, overwriting unit test coverage.
            const distHookPath = path.join(ROOT, 'dist/hooks/init.js');
            const { default: hook } = await import(distHookPath);
            // The hook scope-guards on `this.config.bin === 'sfnext'` (or sfnext-prefixed id),
            // so we must provide a matching context.
            await hook.call(
                { config: { bin: 'sfnext' } } as never,
                {
                    argv: ['--project-directory', testDir],
                } as never
            );

            // Confirms the init hook loaded .env into process.env.
            // oclif reads process.env when resolving flags with env: 'MRT_PROJECT',
            // so this proves the hook runs early enough for that to work.
            expect(process.env.MRT_PROJECT).toBe('from-project-dir');
        },
        15_000
    );
});
