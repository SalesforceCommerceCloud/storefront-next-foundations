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
import type { DevEnvironment, Plugin, ViteDevServer } from 'vite';

// Inline sourcemap prefix produced by Vite's `genSourceMapUrl()`.
// This is the only format Vite emits — it always uses base64 encoding.
const INLINE_SOURCEMAP_PREFIX = '//# sourceMappingURL=data:application/json;base64,';

/**
 * Vite plugin that fixes SSR sourcemap `sources` to use full module paths
 * instead of bare basenames.
 *
 * **Problem:** When the React Router `v8_viteEnvironmentApi` future flag is
 * enabled, SSR modules are evaluated by Vite's Environment API module runner.
 * Vite's `ssrTransform` generates inline sourcemaps with
 * `sources: [path.basename(url)]` (e.g., `"search.tsx"` or `"index.tsx"`).
 * V8's debugger cannot resolve bare basenames back to files on disk, so
 * Chrome DevTools (via `--inspect`) displays the wrong source file content
 * when pausing at breakpoints — even for files with unique names.
 *
 * **Why `fetchModule`:** A Vite transform plugin cannot fix this because
 * `ssrTransform` runs *after* the plugin transform pipeline and overwrites
 * `map.sources` with `[path.basename(url)]`. The only viable interception
 * point is `fetchModule` — the public API method on `DevEnvironment` that
 * returns the final transformed code (with inline sourcemaps already embedded)
 * to the module runner.
 *
 * **Removable:** If Vite updates `ssrTransform` to use full paths instead of
 * `path.basename()`, this plugin can be deleted with no other changes.
 *
 * Only active in development mode (`configureServer` does not run in build).
 */
export function ssrSourcemapFixPlugin(): Plugin {
    return {
        name: 'storefront-next:ssr-sourcemap-fix',
        configureServer(server: ViteDevServer) {
            const ssrEnv: DevEnvironment | undefined = server.environments.ssr;
            if (!ssrEnv) return;

            const originalFetchModule = ssrEnv.fetchModule.bind(ssrEnv);

            ssrEnv.fetchModule = async (
                id: string,
                importer?: string,
                options?: { cached?: boolean; startOffset?: number }
            ) => {
                const result = await originalFetchModule(id, importer, options);

                // Only patch inlined modules (not externalized or cached ones)
                if (!result || 'externalize' in result || 'cache' in result || !('code' in result)) {
                    return result;
                }

                const smIndex = result.code.lastIndexOf(INLINE_SOURCEMAP_PREFIX);
                if (smIndex === -1) {
                    return result;
                }

                try {
                    const base64Start = smIndex + INLINE_SOURCEMAP_PREFIX.length;
                    const base64End = result.code.indexOf('\n', base64Start);
                    const base64Data =
                        base64End === -1
                            ? result.code.slice(base64Start).trim()
                            : result.code.slice(base64Start, base64End).trim();

                    const mapJson = JSON.parse(Buffer.from(base64Data, 'base64').toString('utf-8'));

                    if (!mapJson.sources || !Array.isArray(mapJson.sources)) {
                        return result;
                    }

                    // Use the absolute file path from the fetch result.
                    // `file` is the on-disk path; `id` is the module graph identifier.
                    // For virtual modules both may be null/empty — in that case we skip patching.
                    const fileId = result.file || result.id;
                    if (!fileId) {
                        return result;
                    }

                    // ssrTransform always produces exactly one source entry. If a future
                    // transform produces multiple sources, bail out — replacing every entry
                    // with the same fileId would corrupt the sourcemap.
                    if (mapJson.sources.length !== 1) {
                        return result;
                    }

                    // A bare basename has no path separator. Vite normalizes all
                    // paths to forward slashes, so checking for '/' is sufficient
                    // on all platforms.
                    const source: string | null = mapJson.sources[0];
                    if (!source || source.includes('/')) {
                        return result;
                    }

                    mapJson.sources = [fileId];

                    const patchedBase64 = Buffer.from(JSON.stringify(mapJson)).toString('base64');
                    result.code =
                        result.code.slice(0, base64Start) +
                        patchedBase64 +
                        (base64End === -1 ? '' : result.code.slice(base64End));
                } catch {
                    // Decoding or patching failed — return the original result unchanged.
                }

                return result;
            };
        },
    };
}
