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
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile, stat } from 'fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
    toPascalCase,
    toCamelCase,
    getDefaultDirs,
    findExtensionsWithConfigByMode,
    generateBarrelByMode,
    aggregateByMode,
    aggregateExtensionConfig,
    CLIENT_MODE,
    SERVER_MODE,
} from './aggregate-extension-config';

interface TestDirs {
    EXTENSIONS_DIR: string;
    OUTPUT_DIR: string;
}

const writeExtensionConfig = (extensionsDir: string, name: string, body = 'export default {};') =>
    mkdir(join(extensionsDir, name), { recursive: true }).then(() =>
        writeFile(join(extensionsDir, name, 'config.ts'), body)
    );

const writeExtensionServerConfig = (extensionsDir: string, name: string, body = 'export default {};') =>
    mkdir(join(extensionsDir, name), { recursive: true }).then(() =>
        writeFile(join(extensionsDir, name, 'server-config.ts'), body)
    );

describe('aggregate-extension-config', () => {
    describe('toCamelCase', () => {
        it('converts a kebab-case folder name to the camelCase config key', () => {
            expect(toCamelCase('loqate-address-verification')).toBe('loqateAddressVerification');
            expect(toCamelCase('store-locator')).toBe('storeLocator');
            expect(toCamelCase('bnpl')).toBe('bnpl');
        });

        it('handles single words and empty strings', () => {
            expect(toCamelCase('extension')).toBe('extension');
            expect(toCamelCase('')).toBe('');
        });
    });

    describe('toPascalCase', () => {
        it('converts kebab-case to PascalCase', () => {
            expect(toPascalCase('store-locator')).toBe('StoreLocator');
        });
    });

    describe('getDefaultDirs', () => {
        it('places the output dir under src/extensions/config of the project root', () => {
            const { EXTENSIONS_DIR, OUTPUT_DIR } = getDefaultDirs('/tmp/my-app');
            expect(EXTENSIONS_DIR).toBe(join('/tmp/my-app', 'src', 'extensions'));
            expect(OUTPUT_DIR).toBe(join('/tmp/my-app', 'src', 'extensions', 'config'));
        });
    });

    describe('generateBarrelByMode', () => {
        it('emits an empty default export when no extensions ship a config', () => {
            const content = generateBarrelByMode([], CLIENT_MODE);
            expect(content).toContain('// No extension config files found');
            expect(content).toContain('export default {};');
        });

        it('namespaces each extension by the camelCase of its folder name', () => {
            const content = generateBarrelByMode(
                [{ name: 'loqate-address-verification', path: '../loqate-address-verification/config' }],
                CLIENT_MODE
            );
            expect(content).toContain(
                "import loqateAddressVerificationConfig from '../loqate-address-verification/config';"
            );
            expect(content).toContain('loqateAddressVerification: loqateAddressVerificationConfig,');
            // The locale aggregator's ext-prefixed convention must NOT leak into config keys —
            // the merchant-facing path is app.extension.loqateAddressVerification.
            expect(content).not.toContain('extLoqateAddressVerification');
        });

        it('imports each extension config by a relative path, never the @/ alias', () => {
            // config.server.ts pulls this barrel in through jiti during route typegen, before
            // Vite resolves @/, so an aliased import here would fail to resolve at typegen time.
            const content = generateBarrelByMode(
                [{ name: 'store-locator', path: '../store-locator/config' }],
                CLIENT_MODE
            );
            expect(content).toContain("from '../store-locator/config';");
            expect(content).not.toContain('@/extensions');
        });

        it('throws when two folders collapse to the same config key', () => {
            // A kebab folder and an already-camel folder both resolve to `storeLocator`.
            expect(() =>
                generateBarrelByMode(
                    [
                        { name: 'store-locator', path: '../store-locator/config' },
                        { name: 'storeLocator', path: '../storeLocator/config' },
                    ],
                    CLIENT_MODE
                )
            ).toThrow(/collision.*storeLocator/i);
        });

        it('throws on a folder name that cannot form a valid config key', () => {
            // Folder names are authored by third-party extension vendors. A dot, a leading digit,
            // or an empty collapse would emit a barrel that fails to parse — fail fast, named.
            for (const name of ['my.ext', '123-ext', '--']) {
                expect(() => generateBarrelByMode([{ name, path: `../${name}/config` }], CLIENT_MODE)).toThrow(
                    /invalid config key/i
                );
            }
        });

        it('throws a hyphens-not-underscores error for an underscore-named folder', () => {
            // store_locator camelCases to itself (toCamelCase only splits on `-`), so it would
            // silently mismatch the PUBLIC__app__extension__storeLocator__* convention. The error
            // must name underscores specifically, not just the generic invalid-key message.
            expect(() =>
                generateBarrelByMode([{ name: 'store_locator', path: '../store_locator/config' }], CLIENT_MODE)
            ).toThrow(/underscore.*hyphen|use hyphens/i);
        });

        it('includes the license header and the auto-generation warning', () => {
            const content = generateBarrelByMode([], CLIENT_MODE);
            expect(content).toContain('Licensed under the Apache License, Version 2.0');
            expect(content).toContain('// NOTE: This file is auto-generated. Do not edit manually.');
            expect(content).toContain("// Run 'pnpm config:aggregate-extensions' to regenerate this file.");
        });
    });

    describe('filesystem integration', () => {
        let testDir: string;
        let dirs: TestDirs;

        beforeEach(async () => {
            testDir = join(tmpdir(), `test-extension-config-${Date.now()}-${Math.random().toString(36).slice(2)}`);
            const extensionsDir = join(testDir, 'src', 'extensions');
            dirs = { EXTENSIONS_DIR: extensionsDir, OUTPUT_DIR: join(extensionsDir, 'config') };
            await mkdir(extensionsDir, { recursive: true });
        });

        afterEach(async () => {
            await rm(testDir, { recursive: true, force: true });
        });

        describe('findExtensionsWithConfigByMode (client mode)', () => {
            it('finds only extensions that ship a config.ts, sorted by name', async () => {
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'store-locator');
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'bnpl');
                await mkdir(join(dirs.EXTENSIONS_DIR, 'no-config-ext', 'components'), { recursive: true });

                const found = await findExtensionsWithConfigByMode(dirs.EXTENSIONS_DIR, CLIENT_MODE);

                expect(found.map((e) => e.name)).toEqual(['bnpl', 'store-locator']);
                expect(found[0].path).toBe('../bnpl/config');
            });

            it('skips the generated config output directory and the locales directory', async () => {
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'bopis');
                // Siblings that are NOT extensions: the aggregator's own output and the locale barrel.
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'config');
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'locales');

                const found = await findExtensionsWithConfigByMode(dirs.EXTENSIONS_DIR, CLIENT_MODE);

                expect(found.map((e) => e.name)).toEqual(['bopis']);
            });

            it('returns an empty array when the extensions directory does not exist', async () => {
                expect(await findExtensionsWithConfigByMode(join(testDir, 'nonexistent'), CLIENT_MODE)).toEqual([]);
            });
        });

        describe('aggregateByMode (client mode)', () => {
            it('writes a barrel that re-exports each discovered config under its camelCase key', async () => {
                await writeExtensionConfig(
                    dirs.EXTENSIONS_DIR,
                    'loqate-address-verification',
                    'export default { apiKey: "", cacheTTL: 900000 };'
                );

                const result = await aggregateByMode({ dirs, silent: true }, CLIENT_MODE);

                expect(result.extensions).toEqual(['loqateAddressVerification']);
                const barrel = await readFile(join(dirs.OUTPUT_DIR, 'index.ts'), 'utf8');
                expect(barrel).toContain(
                    "import loqateAddressVerificationConfig from '../loqate-address-verification/config';"
                );
                expect(barrel).toContain('loqateAddressVerification: loqateAddressVerificationConfig,');
            });

            it('writes an empty barrel when no extension ships a config', async () => {
                const result = await aggregateByMode({ dirs, silent: true }, CLIENT_MODE);

                expect(result.extensions).toEqual([]);
                const barrel = await readFile(join(dirs.OUTPUT_DIR, 'index.ts'), 'utf8');
                expect(barrel).toContain('export default {};');
            });

            it('does not re-write the barrel when the content is already up to date', async () => {
                // The prestep runs on every `pnpm dev`; an unconditional write touches mtime and
                // the Vite watcher rebuilds, a self-triggered reload loop. A second run with no
                // change must leave the file untouched.
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'store-locator');

                await aggregateByMode({ dirs, silent: true }, CLIENT_MODE);
                const { mtimeMs: before } = await stat(join(dirs.OUTPUT_DIR, 'index.ts'));

                await aggregateByMode({ dirs, silent: true }, CLIENT_MODE);
                const { mtimeMs: after } = await stat(join(dirs.OUTPUT_DIR, 'index.ts'));

                expect(after).toBe(before);
            });

            // A config.ts is imported as a live module at build and server startup. Because
            // extensions are third-party, anything beyond a static object literal is a
            // supply-chain / secret-leak vector and must be rejected at discovery time.
            it('rejects a config.ts with a top-level import', async () => {
                await writeExtensionConfig(
                    dirs.EXTENSIONS_DIR,
                    'evil-import',
                    "import { execSync } from 'child_process';\nexecSync('id');\nexport default { apiKey: '' };"
                );
                await expect(aggregateByMode({ dirs, silent: true }, CLIENT_MODE)).rejects.toThrow(/static values/i);
            });

            it('rejects a config.ts whose value is a process.env read', async () => {
                await writeExtensionConfig(
                    dirs.EXTENSIONS_DIR,
                    'evil-env',
                    'export default { apiKey: process.env.STRIPE_SECRET_KEY };'
                );
                await expect(aggregateByMode({ dirs, silent: true }, CLIENT_MODE)).rejects.toThrow(/static values/i);
            });

            it('rejects a config.ts whose value is a function call', async () => {
                await writeExtensionConfig(
                    dirs.EXTENSIONS_DIR,
                    'evil-call',
                    "export default { token: fetchToken() };\nfunction fetchToken() { return 'x'; }"
                );
                await expect(aggregateByMode({ dirs, silent: true }, CLIENT_MODE)).rejects.toThrow(/static values/i);
            });

            it('rejects a config.ts that has no default export', async () => {
                // An empty `config.ts` (or one with only stray semicolons) parses without a
                // default declaration — the merged `app.extension.<key>` would be `undefined`
                // at runtime. Surface the missing default at discovery time with the file named.
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'no-default', ';;;');
                await expect(aggregateByMode({ dirs, silent: true }, CLIENT_MODE)).rejects.toThrow(
                    /no default export/i
                );
            });

            it('rejects a config.ts whose default object contains a spread', async () => {
                // A spread inside the default object isn't an `ObjectProperty` — even an inline
                // one widens the contract from "static keys" to "evaluate at import", which the
                // static-only rule exists to close.
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'evil-spread', 'export default { ...{ apiKey: "" } };');
                await expect(aggregateByMode({ dirs, silent: true }, CLIENT_MODE)).rejects.toThrow(
                    /spreads and methods/i
                );
            });

            it('accepts a config.ts of nested static values (strings, numbers, arrays, objects)', async () => {
                await writeExtensionConfig(
                    dirs.EXTENSIONS_DIR,
                    'good-static',
                    'export default { apiKey: "", cacheTTL: 900000, regions: ["us", "eu"], nested: { on: true } };'
                );
                const result = await aggregateByMode({ dirs, silent: true }, CLIENT_MODE);
                expect(result.extensions).toEqual(['goodStatic']);
            });
        });

        describe('aggregateByMode (server mode)', () => {
            it('writes a server-only barrel that re-exports each discovered server-config under its camelCase key', async () => {
                await writeExtensionServerConfig(
                    dirs.EXTENSIONS_DIR,
                    'loqate-address-verification',
                    'export default { scapiOverride: "", retryBudget: 3 };'
                );

                const result = await aggregateByMode({ dirs, silent: true }, SERVER_MODE);

                expect(result.extensions).toEqual(['loqateAddressVerification']);
                expect(result.filePath).toBe(join(dirs.OUTPUT_DIR, 'server.ts'));
                const barrel = await readFile(result.filePath, 'utf8');
                // The server barrel imports `server-config` (no extension), distinct from the
                // client barrel's `config` import. Drift here would make one mode pick up the
                // other's source file.
                expect(barrel).toContain(
                    "import loqateAddressVerificationConfig from '../loqate-address-verification/server-config';"
                );
                expect(barrel).toContain('loqateAddressVerification: loqateAddressVerificationConfig,');
                expect(barrel).toContain("// Run 'pnpm config:aggregate-extensions' to regenerate this file.");
                expect(barrel).toContain('app.serverExtension');
            });

            it('writes an empty server barrel when no extension ships a server-config', async () => {
                const result = await aggregateByMode({ dirs, silent: true }, SERVER_MODE);

                expect(result.extensions).toEqual([]);
                const barrel = await readFile(result.filePath, 'utf8');
                expect(barrel).toContain('export default {};');
                expect(barrel).toContain('Licensed under the Apache License, Version 2.0');
            });

            it('does not pick up client-side config.ts files', async () => {
                // The two modes must scan distinct source files. A client `config.ts` next to a
                // missing `server-config.ts` should produce an empty server barrel — leaking a
                // client-side default into `app.serverExtension` would be silent and unsafe.
                await writeExtensionConfig(
                    dirs.EXTENSIONS_DIR,
                    'client-only-ext',
                    'export default { publicFlag: true };'
                );

                const result = await aggregateByMode({ dirs, silent: true }, SERVER_MODE);

                expect(result.extensions).toEqual([]);
                const barrel = await readFile(result.filePath, 'utf8');
                expect(barrel).not.toContain('clientOnlyExt');
            });

            it('does not re-write the server barrel when content is up to date', async () => {
                await writeExtensionServerConfig(dirs.EXTENSIONS_DIR, 'store-locator');

                await aggregateByMode({ dirs, silent: true }, SERVER_MODE);
                const { mtimeMs: before } = await stat(join(dirs.OUTPUT_DIR, 'server.ts'));

                await aggregateByMode({ dirs, silent: true }, SERVER_MODE);
                const { mtimeMs: after } = await stat(join(dirs.OUTPUT_DIR, 'server.ts'));

                expect(after).toBe(before);
            });

            it('rejects a server-config.ts that reads process.env (matches client static-only rule)', async () => {
                // A vendor-authored server-config.ts evaluated at server startup that does work
                // at module-eval time is the same supply-chain hazard the client rule guards
                // against. Symmetry across modes is the contract — same error wording, same
                // pointer to "move dynamic values to a route handler".
                await writeExtensionServerConfig(
                    dirs.EXTENSIONS_DIR,
                    'evil-server-env',
                    'export default { token: process.env.SECRET };'
                );
                await expect(aggregateByMode({ dirs, silent: true }, SERVER_MODE)).rejects.toThrow(/static values/i);
            });

            it('throws on cross-extension key collisions in server mode', async () => {
                await writeExtensionServerConfig(dirs.EXTENSIONS_DIR, 'store-locator', 'export default { a: 1 };');
                await writeExtensionServerConfig(dirs.EXTENSIONS_DIR, 'storeLocator', 'export default { b: 2 };');

                await expect(aggregateByMode({ dirs, silent: true }, SERVER_MODE)).rejects.toThrow(
                    /collision.*storeLocator/i
                );
            });

            it('client mode no longer picks up server-config.ts files', async () => {
                // Regression guard for the parametrized aggregator: the client and server scanners
                // must read distinct source files. If client mode silently included server-config
                // values in app.extension, those values would land in window.__APP_CONFIG__.
                await writeExtensionServerConfig(
                    dirs.EXTENSIONS_DIR,
                    'server-only-ext',
                    'export default { internal: true };'
                );

                const result = await aggregateByMode({ dirs, silent: true }, CLIENT_MODE);

                expect(result.extensions).toEqual([]);
                const barrel = await readFile(join(dirs.OUTPUT_DIR, 'index.ts'), 'utf8');
                expect(barrel).not.toContain('serverOnlyExt');
            });

            it('round-trips: an extension drops server-config.ts, the evaluated barrel exposes the defaults under the camelCase key', async () => {
                // Highest-altitude test-level proof of the new capability: dropping a
                // server-config.ts under src/extensions/<name>/ → running the prestep →
                // *importing* the generated barrel surfaces a default export whose shape
                // is exactly { <camelCaseName>: <authored object> }. This is what
                // config.server.ts gets when it imports the barrel and merges it into
                // app.serverExtension; everything downstream (getConfig(context),
                // window.__APP_CONFIG__ stripping, the build-time guard) hangs off this
                // round-trip producing the right values.
                await writeExtensionServerConfig(
                    dirs.EXTENSIONS_DIR,
                    'loqate-address-verification',
                    'export default { scapiOverride: "https://internal", retryBudget: 3, regions: ["us", "eu"] };'
                );

                const result = await aggregateByMode({ dirs, silent: true }, SERVER_MODE);

                // Dynamic import hits the same TS-aware loader vitest uses for source files,
                // so the relative `../<name>/server-config` import inside the generated barrel
                // resolves through the fixture tree we just wrote.
                const barrelModule = (await import(/* @vite-ignore */ result.filePath)) as {
                    default: Record<string, unknown>;
                };

                expect(barrelModule.default).toEqual({
                    loqateAddressVerification: {
                        scapiOverride: 'https://internal',
                        retryBudget: 3,
                        regions: ['us', 'eu'],
                    },
                });
            });

            it('client and server barrels can coexist in the same config/ output dir', async () => {
                // Both barrels live in src/extensions/config/ (index.ts and server.ts). They
                // must not stomp on each other's output and the discovery pass must skip the
                // generated config/ dir for both modes.
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'pub-ext', 'export default { pub: true };');
                await writeExtensionServerConfig(dirs.EXTENSIONS_DIR, 'srv-ext', 'export default { srv: true };');

                // The top-level `aggregateExtensionConfig` runs both modes via Promise.all in
                // one shot — this is what the `sfnext config aggregate-extensions` CLI calls,
                // so the test exercises the production path that ships, not just per-mode internals.
                const result = await aggregateExtensionConfig({ dirs, silent: true });

                const clientBarrel = await readFile(join(dirs.OUTPUT_DIR, 'index.ts'), 'utf8');
                const serverBarrel = await readFile(join(dirs.OUTPUT_DIR, 'server.ts'), 'utf8');

                expect(result.client.extensions).toEqual(['pubExt']);
                expect(result.server.extensions).toEqual(['srvExt']);
                expect(clientBarrel).toContain('pubExt');
                expect(clientBarrel).not.toContain('srvExt');
                expect(serverBarrel).toContain('srvExt');
                expect(serverBarrel).not.toContain('pubExt');
            });
        });
    });
});
