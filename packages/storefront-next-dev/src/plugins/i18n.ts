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

export interface I18nPluginConfig {
    /**
     * Pattern to match locale module IDs. Must contain a capture group for the language code.
     *
     * @default /\/src\/locales\/([^/]+)\//
     */
    localePattern?: RegExp;
}

/**
 * Vite plugin that splits locale translation files into per-language chunks.
 *
 * Wraps any existing `manualChunks` configuration so that locale modules are
 * assigned to `locales-{lang}` chunks (e.g., `locales-en-GB`) while all other
 * module IDs are delegated to the user's original `manualChunks` function or object.
 *
 * @param config - Optional configuration for custom locale patterns
 * @returns A Vite plugin that configures locale-based code splitting
 */
export function i18nPlugin(config?: I18nPluginConfig): Plugin {
    const pattern = config?.localePattern ?? /\/src\/locales\/([^/]+)\//;

    return {
        name: 'storefront-next:i18n',
        apply: 'build',
        config(viteConfig) {
            const output = viteConfig.build?.rollupOptions?.output;
            if (Array.isArray(output)) return;

            const existingManualChunks = output?.manualChunks;

            return {
                build: {
                    rollupOptions: {
                        output: {
                            manualChunks(id, meta) {
                                const localeMatch = id.match(pattern);
                                if (localeMatch) {
                                    return `locales-${localeMatch[1]}`;
                                }

                                if (typeof existingManualChunks === 'function') {
                                    return existingManualChunks.call(this, id, meta);
                                }
                                if (existingManualChunks && typeof existingManualChunks === 'object') {
                                    for (const [name, ids] of Object.entries(existingManualChunks)) {
                                        if (ids.includes(id)) return name;
                                    }
                                }
                            },
                        },
                    },
                },
            };
        },
    };
}
