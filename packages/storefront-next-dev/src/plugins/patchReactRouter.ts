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
import type { Plugin } from 'vite';

const VIRTUAL_MODULE_ID = '\0patched-react-router';
const MODULE_TO_PATCH = 'react-router';

/**
 * This plugin intercepts imports of 'react-router' and provides patched versions
 * of specific components (like Scripts) with custom logic.
 *
 * @returns {Plugin} A Vite plugin for patching react-router components
 */
export const patchReactRouterPlugin = (): Plugin => {
    let isTestMode = false;
    let isDevMode = false;

    return {
        name: 'storefront-next:patch-react-router',
        // must be enforce: 'pre'
        // otherwise the react-router plugin will resolve the module first
        // and we will not be able to enhance the module with our custom logic
        enforce: 'pre',
        config(_config, { mode }) {
            // Detect test mode to disable patching
            // Virtual module IDs with \0 prefix cause path resolution errors on Windows
            // when Vitest tries to resolve them with vi.importActual
            isTestMode = mode === 'test';
            // Detect dev mode to avoid duplicate React Router instances
            isDevMode = mode === 'development';
        },
        configEnvironment(name) {
            if (isTestMode) {
                return;
            }
            // Skip noExternal in dev mode to avoid duplicate React Router instances
            // This is acceptable because bundle config injection is only needed for
            // MRT production deployments, not local development
            if (isDevMode) {
                return;
            }
            if (name === 'ssr') {
                // By default, on dev mode, Vite does not process external modules like react-router
                // but we need to patch it, so we mark react-router as noExternal
                // so that it is included in the Vite plugin pipeline, and we can patch it
                return {
                    resolve: {
                        noExternal: ['react-router'],
                    },
                };
            }
        },
        resolveId(id, importer) {
            // Skip patching in test mode to avoid Windows path resolution errors
            // Skip patching in dev mode to avoid duplicate React Router instances
            if (isTestMode || isDevMode) {
                return null;
            }
            if (id === MODULE_TO_PATCH) {
                // In the virtual module, we need to import the same react-router module
                // and then re-export everything from it, and override a subset of the exports.
                // This following code is to make sure that the import from the virtual module
                // imports the same react-router module and not causing infinite loop.
                if (importer === VIRTUAL_MODULE_ID || importer?.includes('storefront-next-dev')) {
                    return null;
                }
                return VIRTUAL_MODULE_ID;
            }
            return null;
        },

        load(id) {
            // Skip patching in test mode
            // Skip patching in dev mode to avoid duplicate React Router instances
            if (isTestMode || isDevMode) {
                return null;
            }
            if (id === VIRTUAL_MODULE_ID) {
                const scriptsImportPath = '@salesforce/storefront-next-dev/react-router/Scripts';

                const code = `
                    export * from 'react-router';
                    export { Scripts } from '${scriptsImportPath}';
                `;
                return code;
            }
            return null;
        },
    };
};
