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
import {
    buildTargetRegistry,
    transformTargets,
    collectUITargetIds,
    validateTargetRegistry,
    type TargetContextProviderConfig,
    type TargetComponentRegistry,
} from '../extensibility/target-utils';
import path from 'path';
import type { ResolvedConfig } from 'vite';
import { logger } from '../logger';

// --- Vite Plugin --------------------------------------------------------------

export function transformTargetPlaceholderPlugin() {
    // Memoize the extension registry - build it once and reuse across all file transformations
    let componentRegistry: TargetComponentRegistry;
    let contextProviders: TargetContextProviderConfig[];
    let sourceDir: string;
    let isProduction = false;

    return {
        name: 'storefront-next:transform-target-placeholder',
        enforce: 'pre' as const, // run before Vite's default TS/JS transforms
        configResolved(config: ResolvedConfig) {
            // extract source directory from vite config
            sourceDir =
                config.resolve.alias.find((alias) => alias.find === '@')?.replacement ||
                path.resolve(__dirname, './src');
            isProduction = config.mode === 'production';
        },
        buildStart() {
            // Build the registry once at the start of the build
            ({ componentRegistry, contextProviders } = buildTargetRegistry(sourceDir, { isProduction }));

            // Validate that all registered targetIds have a corresponding <UITarget> in the template
            const declaredTargetIds = collectUITargetIds(sourceDir);
            const orphaned = validateTargetRegistry(componentRegistry, declaredTargetIds);
            if (orphaned.length > 0) {
                const lines = orphaned.map(
                    (o) => `  • "${o.targetId}" (extension: ${o.extension}, component: ${o.componentPath})`
                );
                throw new Error(
                    `[storefront-next] ${orphaned.length} extension component(s) target UITarget IDs that do not exist in the template:\n${lines.join(
                        '\n'
                    )}\n\nEither add a <UITarget targetId="..."> to the template or remove/disable the component in target-config.json.`
                );
            }
        },

        transform(code: string, id: string) {
            try {
                const transformedCode = transformTargets(code, componentRegistry, contextProviders);
                if (transformedCode) {
                    return {
                        code: transformedCode,
                        map: null,
                    };
                }
                return null;
            } catch (err: unknown) {
                logger.error(`UITarget replace ERROR in ${id}: ${err instanceof Error ? err.stack : String(err)}`);
                throw err;
            }
        },
    };
}
