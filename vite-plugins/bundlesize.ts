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
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { perEnvironmentPlugin } from 'vite';
import bundlesizeRollup from 'vite-plugin-bundlesize';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

/**
 * Per-environment bundle-size enforcement. Limits come from `package.json#bundlesize`
 * (split into `server` and `client` lists).
 *
 * Env vars:
 * - BUNDLES_SIZE_CHECK: when truthy, activates the check (any value)
 *   Example: BUNDLES_SIZE_CHECK=true
 */
export function bundlesize() {
    return perEnvironmentPlugin('bundlesize', (env) => {
        if (!process.env.BUNDLES_SIZE_CHECK) return;
        const config = packageJson.bundlesize ?? {};
        const limits =
            env.name === 'ssr'
                ? (config.server ?? [{ name: '**/*', limit: '5 mB' }])
                : (config.client ?? [{ name: '**/*', limit: '50 kB' }]);
        return bundlesizeRollup({ outputFile: `./build/${env.name}-bundlemeta.json`, limits });
    });
}
