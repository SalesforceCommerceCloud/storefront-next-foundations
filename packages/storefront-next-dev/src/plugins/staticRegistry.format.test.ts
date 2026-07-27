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
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const testDir = dirname(fileURLToPath(import.meta.url));

// Use the real memfs for reads, but make writes observable and force the file to exist.
vi.mock('fs', async () => {
    const memfs = await import('memfs');
    return {
        ...memfs.fs,
        writeFileSync: vi.fn(),
        existsSync: vi.fn().mockReturnValue(true),
    };
});

import { writeFileSync } from 'fs';
import { updateRegistryFile, generateRegistryCode, type ComponentInfo } from './staticRegistry';

const mockWriteFileSync = vi.mocked(writeFileSync);

// A path inside the package (resolved from this test file, not the cwd) so `createRequire(...)`
// resolves the project's real Prettier and its config. Prettier loaded this way uses the real
// filesystem (it bypasses the mocked `fs` above), so resolveConfig finds the repo `.prettierrc`.
const REPO_REGISTRY_PATH = resolve(testDir, 'static-registry.format-fixture.ts');

// A path with no reachable Prettier in any ancestor node_modules, so formatting falls back. Placed
// under the OS temp root rather than the repo tree, where no `node_modules` resolves `prettier`.
const NO_PRETTIER_PATH = resolve(tmpdir(), 'sfnext-static-registry-no-prettier', 'static-registry.ts');

const SCAFFOLD = `import { registry } from '@/lib/page-designer/registry';

// STATIC_REGISTRY_START
// Generated content will be inserted here by the static registry plugin
// STATIC_REGISTRY_END
`;

// A registration whose single-line form is 163 chars — well past any default printWidth — so a
// Prettier pass is forced to wrap it. Its presence verbatim in the output means no formatting ran.
const LONG_COMPONENT: ComponentInfo[] = [
    {
        id: 'Layout.productCarousel',
        filePath: '/repo/src/components/product-carousel/index.tsx',
        relativePath: '../../components/product-carousel/index',
        hasLoader: true,
        hasClientLoader: false,
        hasFallback: true,
    },
];

const LONG_SINGLE_LINE =
    "    targetRegistry.registerImporter('Layout.productCarousel', () => import('../../components/product-carousel/index'), { loader: 'loader', fallback: 'fallback' });";

describe('updateRegistryFile formatting', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vol.reset();
    });

    it('formats the written file with the project Prettier so over-width registrations are wrapped', async () => {
        vol.fromJSON({ [REPO_REGISTRY_PATH]: SCAFFOLD });
        const generatedCode = generateRegistryCode(LONG_COMPONENT, 'registry');
        expect(generatedCode).toContain(LONG_SINGLE_LINE);

        const changed = await updateRegistryFile(REPO_REGISTRY_PATH, generatedCode);

        expect(changed).toBe(true);
        const written = mockWriteFileSync.mock.calls[0][1] as string;
        expect(written).not.toContain(LONG_SINGLE_LINE);
        expect(written).toContain('registerImporter(');
        expect(written).not.toMatch(/ +\n/);
    });

    it('converges on a second run: an already-formatted file is left untouched (no HMR re-cascade)', async () => {
        vol.fromJSON({ [REPO_REGISTRY_PATH]: SCAFFOLD });
        const generatedCode = generateRegistryCode(LONG_COMPONENT, 'registry');

        await updateRegistryFile(REPO_REGISTRY_PATH, generatedCode);
        const formatted = mockWriteFileSync.mock.calls[0][1] as string;

        // Simulate the formatted file now on disk (the write above is mocked, so memfs is unchanged).
        vol.fromJSON({ [REPO_REGISTRY_PATH]: formatted });
        mockWriteFileSync.mockClear();

        const changed = await updateRegistryFile(REPO_REGISTRY_PATH, generatedCode);

        expect(changed).toBe(false);
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('falls back to unformatted content when the project has no Prettier', async () => {
        vol.fromJSON({ [NO_PRETTIER_PATH]: SCAFFOLD });
        const generatedCode = generateRegistryCode(LONG_COMPONENT, 'registry');

        const changed = await updateRegistryFile(NO_PRETTIER_PATH, generatedCode);

        expect(changed).toBe(true);
        const written = mockWriteFileSync.mock.calls[0][1] as string;
        expect(written).toContain(LONG_SINGLE_LINE);
    });

    it('does not re-warn about missing Prettier on a subsequent run (no per-save HMR spam)', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vol.fromJSON({ [NO_PRETTIER_PATH]: SCAFFOLD });
        const generatedCode = generateRegistryCode(LONG_COMPONENT, 'registry');
        const missingWarnCount = () =>
            warnSpy.mock.calls.filter((args) => String(args[1]).includes('Prettier not found in the project')).length;

        await updateRegistryFile(NO_PRETTIER_PATH, generatedCode);
        const afterFirst = missingWarnCount();
        await updateRegistryFile(NO_PRETTIER_PATH, generatedCode);
        const afterSecond = missingWarnCount();

        // The warning latches per process: whether or not an earlier test already tripped it, a
        // second identical run must add no further warning. That latch is what prevents the missing-
        // Prettier case from logging on every HMR save in dev.
        expect(afterSecond).toBe(afterFirst);
        warnSpy.mockRestore();
    });
});

describe('generateRegistryCode formatting hygiene', () => {
    it('emits no trailing whitespace for an empty registry', () => {
        expect(generateRegistryCode([], 'registry')).not.toMatch(/ +\n/);
    });

    it('emits no trailing whitespace for a populated registry', () => {
        expect(generateRegistryCode(LONG_COMPONENT, 'registry')).not.toMatch(/ +\n/);
    });

    // The generated file is exempted in the project's eslint config (like other generated
    // artifacts), so a blanket `/* eslint-disable */` would be a no-op directive that
    // `--report-unused-disable-directives` flags as an error. Don't reintroduce it.
    it('does not emit a blanket eslint-disable directive', () => {
        expect(generateRegistryCode([], 'registry')).not.toContain('/* eslint-disable */');
        expect(generateRegistryCode(LONG_COMPONENT, 'registry')).not.toContain('/* eslint-disable */');
    });
});
