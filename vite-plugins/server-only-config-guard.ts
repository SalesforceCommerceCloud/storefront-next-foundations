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
import { perEnvironmentPlugin, type Plugin } from 'vite';

import { SERVER_ONLY_CONFIG_PATH_FRAGMENT, refersToServerOnlyBarrel } from './server-only-config-guard.matcher';

/**
 * Build-time guard for the server-only extension config barrel.
 *
 * Two layers, both active only in the client (non-`ssr`) Vite environment:
 *
 * 1. `resolveId` — fail fast the moment a client module tries to import the barrel.
 *    The error names the importer so a contributor sees the offending file path
 *    immediately, rather than chasing a runtime "where did this leak from?".
 *
 * 2. `generateBundle` — re-scan emitted client chunk code for the barrel's path
 *    fragment. Catches any indirect import (a re-export chain, a dynamic require)
 *    that slipped past `resolveId`. Belt-and-suspenders against the AC#4 contract:
 *    "The values do NOT appear on window.__APP_CONFIG__ in any environment".
 *
 * The runtime parallel — `extractClientConfig` in `src/lib/app-config-client.ts` —
 * keeps server-only values out of `window.__APP_CONFIG__`. This plugin closes the
 * earlier seam: even *importing* the barrel from a client module is a build error,
 * so a future refactor can't accidentally embed the values in a client bundle.
 *
 * Returns `undefined` (not the plugin) on the SSR environment, where the barrel is
 * a legitimate import (config.server.ts pulls it in).
 */
export function serverOnlyConfigGuard(): Plugin {
    return perEnvironmentPlugin('template:server-only-config-guard', (env) => {
        if (env.name === 'ssr') return;

        return {
            name: 'template:server-only-config-guard',
            enforce: 'pre',

            resolveId(source, importer) {
                if (!refersToServerOnlyBarrel(source)) return null;
                this.error(
                    `Client environment imported the server-only extension config barrel ` +
                        `(\`${source}\`) from \`${importer ?? 'unknown'}\`. ` +
                        `Values under app.serverExtension are stripped from window.__APP_CONFIG__ ` +
                        `and must never reach the client. Move the read to a server loader/action ` +
                        `(getConfig(context).serverExtension.<key>), or use process.env for true secrets.`
                );
            },

            generateBundle(_options, bundle) {
                for (const [fileName, asset] of Object.entries(bundle)) {
                    if (asset.type !== 'chunk') continue;
                    if (asset.code.includes(SERVER_ONLY_CONFIG_PATH_FRAGMENT)) {
                        this.error(
                            `Client chunk "${fileName}" references the server-only extension config ` +
                                `barrel ("${SERVER_ONLY_CONFIG_PATH_FRAGMENT}"). The resolveId guard ` +
                                `should have rejected the import upstream — verify no dynamic require ` +
                                `or re-export chain is pulling it in.`
                        );
                    }
                }
            },
        };
    });
}
