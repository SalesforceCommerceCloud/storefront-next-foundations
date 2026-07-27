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
import type { Plugin, ResolvedConfig } from 'vite';
import { existsSync } from 'fs';
import { resolve } from 'path';

/** Source filename for the middleware registry (project source). */
const MIDDLEWARE_REGISTRY_SOURCE_FILE = 'middleware-registry.ts';

/** Subdirectory under build output where the compiled registry is written (must match server/index.ts expectations). */
const SERVER_OUT_SUBDIR = 'server';

/**
 * Vite plugin that builds the middleware registry file for production.
 *
 * This plugin reads the template's middleware registry from the app's server directory
 * (e.g. `src/server/middleware-registry.ts` when appDirectory is `./src`) and compiles it
 * into the build output's server directory so the production server (Managed Runtime)
 * can load the custom Express middlewares.
 *
 * Compilation uses tsdown (single TypeScript file → ESM) instead of a full Vite build.
 * Paths are derived from the React Router plugin context (appDirectory, buildDirectory)
 * when available; there are no env vars for these paths in this package.
 *
 * If the middleware registry file does not exist, the plugin silently skips the build step.
 *
 * @returns {Plugin} A Vite plugin that compiles the middleware registry for production
 *
 * @example
 * // In vite.config.ts
 * export default defineConfig({
 *   plugins: [
 *     buildMiddlewareRegistryPlugin()
 *   ]
 * })
 */
export const buildMiddlewareRegistryPlugin = (): Plugin => {
    let resolvedConfig: ResolvedConfig;
    let buildDirectory: string;
    /** App source directory (e.g. 'src' or './src') from React Router config. */
    let appDirectory: string;

    return {
        name: 'storefront-next:build-middleware-registry',
        apply: 'build',

        configResolved(config) {
            resolvedConfig = config;
            // React Router plugin context: appDirectory (e.g. './src') and buildDirectory (e.g. 'build') — no env vars in this package for these paths
            // @ts-expect-error: react-router plugin context is not typed
            const rr = config.__reactRouterPluginContext?.reactRouterConfig ?? {};
            buildDirectory = rr.buildDirectory ?? resolve(config.root, 'build');
            appDirectory = rr.appDirectory ?? 'src';
        },

        buildApp: {
            order: 'post',
            handler: async () => {
                const projectRoot = resolvedConfig.root;
                const middlewareRegistryPath = resolve(
                    projectRoot,
                    appDirectory,
                    SERVER_OUT_SUBDIR,
                    MIDDLEWARE_REGISTRY_SOURCE_FILE
                );

                if (!existsSync(middlewareRegistryPath)) {
                    return;
                }

                const { build } = await import('tsdown');
                const serverOutDir = resolve(projectRoot, buildDirectory, SERVER_OUT_SUBDIR);
                const entryName = MIDDLEWARE_REGISTRY_SOURCE_FILE.replace(/\.ts$/, '');

                await build({
                    cwd: projectRoot,
                    entry: { [entryName]: middlewareRegistryPath },
                    outDir: serverOutDir,
                    format: ['esm'],
                    platform: 'node',
                    outExtensions: () => ({ js: '.mjs', dts: '.d.ts' }),
                    dts: false,
                    clean: false,
                    hash: false,
                    noExternal: [/.*/],
                    external: [/^node:/],
                });
            },
        },
    };
};
