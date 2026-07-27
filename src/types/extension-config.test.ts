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
import config from '@/config/server';

// `app.extension` must come from the generated barrel (src/extensions/config/index.ts), not the
// sibling extension registry (src/extensions/config.json). A bare `./src/extensions/config`
// specifier resolves to the .json registry, silently shadowing the barrel — so app.extension
// would hold SFDC_EXT_* registry entries and every extension's config override would be dropped.
describe('app.extension wiring', () => {
    it('is the generated config barrel, not the config.json extension registry', () => {
        const extension = config.app.extension;
        expect(extension).toBeDefined();
        // The registry is shaped `{ extensions: { SFDC_EXT_*: {...} } }`; the barrel is a flat
        // map of camelCase extension keys. The presence of `extensions` means the wrong file won.
        expect(extension).not.toHaveProperty('extensions');
        expect(JSON.stringify(extension)).not.toContain('SFDC_EXT_');
    });
});
