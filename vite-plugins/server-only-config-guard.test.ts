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
import { describe, it, expect } from 'vitest';
import { refersToServerOnlyBarrel, SERVER_ONLY_CONFIG_PATH_FRAGMENT } from './server-only-config-guard.matcher';

describe('refersToServerOnlyBarrel', () => {
    it('matches every fingerprint of the server-only barrel module id', () => {
        // Plain alias, .ts variant, absolute path, query suffix, virtual import — all the
        // shapes Vite/Rollup can hand to a `resolveId` hook for the same module. A miss on
        // any of these means a dynamic require or re-export chain could bypass the guard.
        for (const id of [
            '@/extensions/config/server',
            '@/extensions/config/server.ts',
            '/abs/src/extensions/config/server',
            '/abs/src/extensions/config/server.ts',
            '/abs/src/extensions/config/server.ts?import',
            '/abs/src/extensions/config/server.tsx', // would be wrong file but still triggers (defense in depth)
            // Relative parent-rooted form a client file under src/ would write directly. The
            // specifier has no `/src/` prefix because it's relative to the importer's
            // directory, not the project root — this used to slip past a stricter
            // `/src/extensions/config/server` anchor.
            '../../extensions/config/server',
            '../../extensions/config/server.ts',
            '../extensions/config/server',
        ]) {
            expect(refersToServerOnlyBarrel(id)).toBe(true);
        }
    });

    it('normalizes Windows-style backslashes', () => {
        // Rollup hands ids in OS-native form on Windows agents. Without normalization the
        // guard would silently miss every barrel import on Windows builds.
        expect(refersToServerOnlyBarrel('C:\\proj\\src\\extensions\\config\\server.ts')).toBe(true);
    });

    it('does not match unrelated modules', () => {
        // Most importantly: must NOT fire on the client barrel (`src/extensions/config/index.ts`),
        // on the registry json next to it, or on any sibling extension config — those are
        // legitimate client imports.
        for (const id of [
            '@/extensions/config/index',
            '@/extensions/config/index.ts',
            '@/extensions/config/config.json',
            'react',
            '/abs/src/extensions/loqate-address-verification/config.ts',
            '/abs/src/extensions/loqate-address-verification/server-config.ts', // source file, not the barrel
        ]) {
            expect(refersToServerOnlyBarrel(id)).toBe(false);
        }
    });

    it('exposes the path fragment as a constant for the bundle-scan layer', () => {
        // The generateBundle hook scans emitted client chunk code for this exact substring;
        // exporting it ensures the resolveId match and the bundle scan can't drift apart.
        expect(SERVER_ONLY_CONFIG_PATH_FRAGMENT).toBe('src/extensions/config/server');
    });
});
