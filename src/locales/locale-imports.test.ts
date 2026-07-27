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
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('locale-imports regression guard', () => {
    it('root.tsx should not statically import the all-locales barrel @/locales', () => {
        const rootPath = resolve(__dirname, '../root.tsx');
        const content = readFileSync(rootPath, 'utf-8');

        // Static import of @/locales pulls ALL locale JSON into the client bundle.
        // ErrorBoundary uses errorTranslations from the root loader instead.
        const hasStaticLocaleImport = /^\s*import\s+\S+\s+from\s+['"]@\/locales['"]/m.test(content);
        expect(hasStaticLocaleImport).toBe(false);
    });
});
