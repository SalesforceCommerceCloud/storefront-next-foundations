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

import path from 'node:path';
import fs from 'node:fs';
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { toPosixPath } from '../utils/paths';

/**
 * File extensions to search when detecting ejected entry files.
 * Matches React Router's `entryExts` in its findEntry function.
 */
const ENTRY_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.mts'];

/**
 * Query parameter appended to imports of ejected entry files within the
 * generated composition code. This creates a distinct module ID so Vite
 * treats it as a separate module from the one we intercept in `load`,
 * breaking what would otherwise be a circular import.
 *
 * Vite natively handles query parameters on file imports — it strips the
 * query for filesystem access but keeps it in the module ID for deduplication.
 */
const PASSTHROUGH_QUERY = '?platform-passthrough';

/**
 * Finds a user-ejected entry file in the app directory.
 * Returns the absolute path if found, undefined otherwise.
 */
function findUserEntry(appDirectory: string, basename: string): string | undefined {
    for (const ext of ENTRY_EXTENSIONS) {
        const filePath = path.resolve(appDirectory, basename + ext);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    return undefined;
}

/**
 * Generates the virtual module code for the composed server entry.
 *
 * The generated module imports the app's entry (user-ejected or SDK default),
 * passes it through composeServerEntry(), and re-exports all ServerEntryModule
 * fields. This ensures platform features are always applied.
 */
function generateServerEntryCode(appEntryImportPath: string): string {
    const importPath = JSON.stringify(toPosixPath(appEntryImportPath));
    return `
import * as _app from ${importPath};
import { composeServerEntry } from '@salesforce/storefront-next-dev/entry/server';

const _composed = composeServerEntry(_app);

// Forward all named exports from the app entry so that any future
// React Router exports are passed through without requiring a plugin update.
// Explicit exports below take precedence over star re-exports per ESM spec.
export * from ${importPath};

// Override with composed versions for exports the platform layer enhances.
export default _composed.default;
export const handleDataRequest = _composed.handleDataRequest;
export const handleError = _composed.handleError;
export const instrumentations = _composed.instrumentations;
export const streamTimeout = _composed.streamTimeout;
`.trim();
}

/**
 * Generates the virtual module code for the composed client entry.
 *
 * Imports the platform client setup as a side-effect (runs before the app entry),
 * then re-exports everything from the app's client entry.
 */
function generateClientEntryCode(appEntryImportPath: string): string {
    return `
import '@salesforce/storefront-next-dev/entry/client';
export * from ${JSON.stringify(toPosixPath(appEntryImportPath))};
`.trim();
}

interface ReactRouterPluginContext {
    reactRouterConfig: {
        appDirectory: string;
        buildDirectory: string;
    };
    entryClientFilePath: string;
    entryServerFilePath: string;
}

/**
 * Vite plugin that composes platform-level features into React Router entry files.
 *
 * This plugin uses the `load` hook to replace entry file contents with generated
 * composition code, while preserving the original file path as the module ID.
 * This is critical because React Router's post-build manifest lookup uses the
 * original entry file paths to find built chunks — changing the module ID (via
 * `resolveId`) would break that lookup.
 *
 * The plugin supports two modes:
 * - **Non-ejected:** No entry files in the app directory. The generated code
 *   imports SDK default entries from `@salesforce/storefront-next-dev/entry/defaults/`.
 * - **Ejected:** Customer has created their own entry file(s). The generated code
 *   imports the customer's file (with a `?platform-passthrough` query to avoid
 *   circular imports) and wraps it with the platform layer.
 *
 * In both cases, the platform composition layer is always present. New platform
 * features ship via `npm update` by modifying the composition functions, without
 * changes to the plugin or customer code.
 */
export function platformEntryPlugin(): Plugin {
    let isTestMode = false;
    let serverEntryFilePath: string | undefined;
    let clientEntryFilePath: string | undefined;
    let appDirectory: string | undefined;
    let userServerEntryPath: string | undefined;
    let userClientEntryPath: string | undefined;

    return {
        name: 'storefront-next:platform-entry',
        enforce: 'pre',

        config(_config, { mode }) {
            isTestMode = mode === 'test';
        },

        configResolved(config: ResolvedConfig) {
            if (isTestMode) return;

            // @ts-expect-error: react-router plugin context is not typed
            const ctx: ReactRouterPluginContext | undefined = config.__reactRouterPluginContext;
            if (!ctx) return;

            appDirectory = ctx.reactRouterConfig.appDirectory;
            serverEntryFilePath = ctx.entryServerFilePath;
            clientEntryFilePath = ctx.entryClientFilePath;

            // Detect whether the user has ejected entry files and store the paths
            userServerEntryPath = findUserEntry(appDirectory, 'entry.server');
            userClientEntryPath = findUserEntry(appDirectory, 'entry.client');
        },

        load(id) {
            if (isTestMode || !serverEntryFilePath || !clientEntryFilePath || !appDirectory) return null;

            // Skip passthrough imports — these have the ?platform-passthrough query
            // and should load the real file content from disk. Vite handles this
            // natively by stripping the query for filesystem access.
            if (id.includes(PASSTHROUGH_QUERY)) return null;

            // Strip any existing query parameters for path comparison, but only
            // for matching — we still return null for IDs with unexpected queries.
            const idWithoutQuery = id.split('?')[0];

            if (path.normalize(idWithoutQuery) === path.normalize(serverEntryFilePath)) {
                // Always use the passthrough query on the original entry file path.
                // This ensures imports within the entry file (e.g., @react-router/node,
                // isbot) resolve in the app's dependency context, not the SDK's.
                // For ejected entries, this points to the user's file.
                // For non-ejected entries, this points to React Router's default.
                const appEntryPath = userServerEntryPath
                    ? userServerEntryPath + PASSTHROUGH_QUERY
                    : serverEntryFilePath + PASSTHROUGH_QUERY;

                return generateServerEntryCode(appEntryPath);
            }

            if (path.normalize(idWithoutQuery) === path.normalize(clientEntryFilePath)) {
                const appEntryPath = userClientEntryPath
                    ? userClientEntryPath + PASSTHROUGH_QUERY
                    : clientEntryFilePath + PASSTHROUGH_QUERY;

                return generateClientEntryCode(appEntryPath);
            }

            return null;
        },

        configureServer(server: ViteDevServer) {
            if (isTestMode || !appDirectory) return;

            // Capture as local const so TypeScript narrows the type in the callback
            const appDir = appDirectory;

            // Watch for creation/deletion of entry files in the app directory.
            // When a user ejects or un-ejects an entry file, restart the dev server
            // so the load hook re-evaluates which entry to import.
            const watcher = server.watcher;

            const checkEntryChange = (filePath: string) => {
                const relative = path.relative(appDir, filePath);
                const basename = path.basename(relative, path.extname(relative));
                const dir = path.dirname(relative);

                // Only react to entry files directly in the app directory (not nested)
                if (dir !== '.' || (basename !== 'entry.server' && basename !== 'entry.client')) {
                    return;
                }

                const ext = path.extname(relative);
                if (!ENTRY_EXTENSIONS.includes(ext)) return;

                // Recheck ejection status
                const nowHasServer = findUserEntry(appDir, 'entry.server') !== undefined;
                const nowHasClient = findUserEntry(appDir, 'entry.client') !== undefined;

                const hadUserServerEntry = userServerEntryPath !== undefined;
                const hadUserClientEntry = userClientEntryPath !== undefined;
                if (nowHasServer !== hadUserServerEntry || nowHasClient !== hadUserClientEntry) {
                    void server.restart();
                }
            };

            watcher.on('add', checkEntryChange);
            watcher.on('unlink', checkEntryChange);
        },
    };
}
