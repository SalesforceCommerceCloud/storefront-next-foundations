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
import type { Plugin, Rollup } from 'vite';
import path from 'path';
import { toPosixPath } from '../utils/paths';

/**
 * Generates human-readable chunk file names for better debugging in production builds.
 *
 * Transforms Rollup's default hash-based chunk names into structured paths that reflect
 * the original source location, making it easier to identify and debug specific chunks.
 *
 * @param chunkInfo - Rollup's pre-rendered chunk information containing module IDs and metadata
 * @returns A formatted string pattern for the chunk filename with one of these formats:
 *   - `assets/(folder1)-(folder2)-filename.[hash].js` for source files in /src/
 *   - `assets/(package)-(pkg-name)-(subfolder)-filename.[hash].js` for node_modules
 *   - `assets/(chunk)-[name].[hash].js` as fallback for chunks without identifiable paths
 *
 * @example
 * // Source file: /src/components/ui/Button.tsx
 * // Output: assets/(components)-(ui)-Button.[hash].js
 *
 * @example
 * // Node module: /node_modules/@radix-ui/react-dialog/dist/index.js
 * // Output: assets/(package)-(@radix-ui)-(react-dialog)-(dist)-index.[hash].js
 */
export const readableChunkFileNames = (chunkInfo: Rollup.PreRenderedChunk) => {
    const moduleIds = chunkInfo.moduleIds;
    const defaultName = 'assets/(chunk)-[name].[hash].js';
    if (!moduleIds || moduleIds.length === 0) {
        return defaultName;
    }

    // Rollup moduleIds are in reverse order, the last moduleId is the one that was first in the source code
    const lastModuleId = moduleIds[moduleIds.length - 1];

    const getFileName = (pathname: string) => {
        const posixPath = toPosixPath(pathname);
        const parsed = path.posix.parse(posixPath);
        const withoutQuery = parsed.base.split('?')[0];
        return withoutQuery.replace(/\.(tsx?|jsx?|mjs|js)$/, '');
    };

    const cleanPath = (pathname: string) => {
        return pathname?.split('?')[0];
    };

    const normalizedModuleId = toPosixPath(lastModuleId);

    // Check if the module is from the application source code (under /src/ directory)
    // This generates chunk names based on the folder structure within src/
    // Example: src/components/ui/Button.tsx → assets/(components)-(ui)-Button.[hash].js
    if (normalizedModuleId.includes('/src/')) {
        const cleanedPath = toPosixPath(cleanPath(lastModuleId));
        const match = cleanedPath.match(/\/src\/(.+)$/);
        if (match) {
            const pathAfterSrc = match[1];
            const parts = pathAfterSrc.split('/');

            const fileName = getFileName(parts[parts.length - 1]);

            const folders = parts.slice(0, -1);

            const segments = folders.map((f) => `(${f})`).join('-');
            return `assets/${segments}-${fileName}.[hash].js`;
        }
    }

    // Check if the module is from an external package (under /node_modules/ directory)
    // This generates chunk names that include the package name and internal path
    // Example: node_modules/@radix-ui/react-dialog/dist/index.js → assets/(package)-(@radix-ui)-(react-dialog)-(dist)-index.[hash].js
    if (normalizedModuleId.includes('/node_modules/')) {
        const cleanedPath = toPosixPath(cleanPath(lastModuleId));

        const parts = cleanedPath.split('/node_modules/');
        const afterNodeModules = parts[parts.length - 1];

        const pathParts = afterNodeModules.split('/');

        // Handle scoped packages (@org/package)
        let packageName;
        let remainingPath;

        if (pathParts[0].startsWith('@')) {
            // Scoped package: @org/package/rest/of/path
            packageName = `${pathParts[0]}-${pathParts[1]}`;
            remainingPath = pathParts.slice(2);
        } else {
            // Regular package: package/rest/of/path
            packageName = pathParts[0];
            remainingPath = pathParts.slice(1);
        }

        const fileName = getFileName(remainingPath[remainingPath.length - 1]);

        const folders = remainingPath.slice(0, -1);

        const segments = ['package', packageName, ...folders].map((s) => `(${s})`).join('-');

        return `assets/${segments}-${fileName}.[hash].js`;
    }

    return defaultName;
};

/**
 * Vite plugin that configures Rollup to use human-readable chunk file names in production builds.
 *
 * Applies the `readableChunkFileNames` naming strategy to both code-split chunks and entry files,
 * making it easier to identify the source of specific chunks when debugging production builds.
 *
 * @returns A Vite plugin that configures chunk naming for the client build environment
 *
 * @example
 * // In vite.config.ts
 * export default defineConfig({
 *   plugins: [readableChunkFileNamesPlugin()]
 * })
 */
export const readableChunkFileNamesPlugin = (): Plugin => {
    return {
        name: 'storefront-next:readable-chunk-file-names',
        apply: 'build',
        config() {
            return {
                environments: {
                    client: {
                        build: {
                            rollupOptions: {
                                output: {
                                    chunkFileNames: readableChunkFileNames,
                                    entryFileNames: readableChunkFileNames,
                                },
                            },
                        },
                    },
                },
            };
        },
    };
};
