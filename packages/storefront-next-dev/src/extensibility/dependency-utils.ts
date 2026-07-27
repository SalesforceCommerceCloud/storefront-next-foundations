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

import type { ExtensionMeta } from './extension-config';

export type ExtensionConfig = {
    extensions: Record<string, ExtensionMeta>;
};

/**
 * Resolve full transitive dependency chain in topological order (dependencies first).
 * Example: resolveDependencies('BOPIS', config) → ['Store Locator', 'BOPIS']
 *
 * @param extensionKey - The extension key to resolve dependencies for
 * @param config - The extension configuration
 * @returns Array of extension keys in topological order (dependencies first, then the extension itself)
 */
export function resolveDependencies(extensionKey: string, config: ExtensionConfig): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    function visit(key: string): void {
        if (visited.has(key)) {
            return;
        }
        visited.add(key);

        const extension = config.extensions[key];
        if (!extension) {
            return;
        }

        // Visit dependencies first (recursively)
        const dependencies = extension.dependencies || [];
        for (const dep of dependencies) {
            visit(dep);
        }

        // Add this extension after its dependencies
        result.push(key);
    }

    visit(extensionKey);
    return result;
}

/**
 * Reverse lookup: find immediate extensions that depend on this one.
 * Example: getDependents('Store Locator', config) → ['BOPIS']
 *
 * @param extensionKey - The extension key to find dependents for
 * @param config - The extension configuration
 * @returns Array of extension keys that directly depend on this extension
 */
export function getDependents(extensionKey: string, config: ExtensionConfig): string[] {
    const dependents: string[] = [];

    for (const [key, extension] of Object.entries(config.extensions)) {
        const dependencies = extension.dependencies || [];
        if (dependencies.includes(extensionKey)) {
            dependents.push(key);
        }
    }

    return dependents;
}

/**
 * Resolve full transitive dependent chain in reverse topological order (dependents first).
 * Example: resolveDependents('Store Locator', config) → ['BOPIS', 'Store Locator']
 *
 * @param extensionKey - The extension key to resolve dependents for
 * @param config - The extension configuration
 * @returns Array of extension keys in reverse topological order (dependents first, then the extension itself)
 */
export function resolveDependents(extensionKey: string, config: ExtensionConfig): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    function visit(key: string): void {
        if (visited.has(key)) {
            return;
        }
        visited.add(key);

        // Find all extensions that depend on this one
        const dependents = getDependents(key, config);

        // Visit dependents first (recursively) - they need to be uninstalled before this
        for (const dep of dependents) {
            visit(dep);
        }

        // Add this extension after its dependents
        result.push(key);
    }

    visit(extensionKey);
    return result;
}

/**
 * Validate that no circular dependencies exist in the configuration.
 * Throws a descriptive error if a cycle is found.
 *
 * @param config - The extension configuration to validate
 * @throws Error if a circular dependency is detected
 */
export function validateNoCycles(config: ExtensionConfig): void {
    const visiting = new Set<string>(); // Currently in the DFS path
    const visited = new Set<string>(); // Completely processed

    function visit(key: string, path: string[]): void {
        if (visited.has(key)) {
            return;
        }

        if (visiting.has(key)) {
            // Found a cycle - construct the cycle path
            const cycleStart = path.indexOf(key);
            const cyclePath = [...path.slice(cycleStart), key];
            throw new Error(`Circular dependency detected: ${cyclePath.join(' -> ')}`);
        }

        visiting.add(key);
        path.push(key);

        const extension = config.extensions[key];
        if (extension) {
            const dependencies = extension.dependencies || [];
            for (const dep of dependencies) {
                visit(dep, path);
            }
        }

        path.pop();
        visiting.delete(key);
        visited.add(key);
    }

    // Check each extension as a starting point
    for (const key of Object.keys(config.extensions)) {
        visit(key, []);
    }
}

/**
 * Filter resolved dependencies to only those not yet installed.
 * Returns dependencies in topological order (install order).
 *
 * @param extensionKey - The extension key to check dependencies for
 * @param installedExtensions - Array of already installed extension keys
 * @param config - The extension configuration
 * @returns Array of missing extension keys in topological order (install order)
 */
export function getMissingDependencies(
    extensionKey: string,
    installedExtensions: string[],
    config: ExtensionConfig
): string[] {
    const allDependencies = resolveDependencies(extensionKey, config);
    const installedSet = new Set(installedExtensions);

    // Filter out already installed extensions, maintaining topological order
    return allDependencies.filter((key) => !installedSet.has(key));
}

/**
 * Resolve dependencies for multiple extensions, merging and deduplicating the results.
 * Returns all dependencies in topological order.
 *
 * @param extensionKeys - Array of extension keys to resolve dependencies for
 * @param config - The extension configuration
 * @returns Array of all extension keys in topological order (dependencies first)
 */
export function resolveDependenciesForMultiple(extensionKeys: string[], config: ExtensionConfig): string[] {
    const allDeps = new Set<string>();
    const result: string[] = [];

    // Resolve dependencies for each extension
    for (const key of extensionKeys) {
        const deps = resolveDependencies(key, config);
        for (const dep of deps) {
            if (!allDeps.has(dep)) {
                allDeps.add(dep);
                result.push(dep);
            }
        }
    }

    return result;
}

/**
 * Resolve dependents for multiple extensions, merging and deduplicating the results.
 * Returns all dependents in reverse topological order (uninstall order).
 *
 * @param extensionKeys - Array of extension keys to resolve dependents for
 * @param config - The extension configuration
 * @returns Array of all extension keys in reverse topological order (dependents first)
 */
export function resolveDependentsForMultiple(extensionKeys: string[], config: ExtensionConfig): string[] {
    const allDeps = new Set<string>();
    const result: string[] = [];

    // Resolve dependents for each extension
    for (const key of extensionKeys) {
        const deps = resolveDependents(key, config);
        for (const dep of deps) {
            if (!allDeps.has(dep)) {
                allDeps.add(dep);
                result.push(dep);
            }
        }
    }

    return result;
}
