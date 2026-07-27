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

/**
 * Local Development Setup Utilities
 *
 * This module handles the special case of setting up a storefront project
 * when cloned from a local monorepo (file:// URL) instead of GitHub.
 *
 * It addresses:
 * 1. workspace:* dependencies that need to be converted to file: references
 * 2. Vite config patches needed to prevent "duplicate React instances" errors
 *    with file-linked packages
 *
 * Usage:
 *   npx @salesforce/storefront-next-dev prepare-local -d ./my-storefront -s /path/to/monorepo/packages
 */

import path from 'path';
import fs from 'fs-extra';
import prompts from 'prompts';
import { logger } from './logger';

export interface PrepareLocalOptions {
    projectDirectory: string;
    sourcePackagesDir?: string;
    defaults?: boolean;
}

/**
 * Prepares a cloned template for standalone use outside the monorepo.
 * Prompts user for local package paths and replaces workspace:* dependencies with file: references.
 */
export async function prepareForLocalDev(options: PrepareLocalOptions): Promise<void> {
    const { projectDirectory, sourcePackagesDir, defaults } = options;
    const packageJsonPath = path.join(projectDirectory, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
        throw new Error(`package.json not found in ${projectDirectory}`);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Find all workspace:* dependencies
    const workspaceDeps: Array<{ pkg: string; depType: string }> = [];
    for (const depType of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
        const deps = packageJson[depType];
        if (!deps) continue;

        for (const [pkg, version] of Object.entries(deps)) {
            if (typeof version === 'string' && version.startsWith('workspace:')) {
                workspaceDeps.push({ pkg, depType });
            }
        }
    }

    if (workspaceDeps.length === 0) {
        logger.info('No workspace:* dependencies found. Project is ready for standalone use.');
        return;
    }

    logger.info('\n🔗 Found workspace dependencies that need to be linked to local packages:\n');
    for (const { pkg } of workspaceDeps) {
        logger.info(`   • ${pkg}`);
    }
    logger.info('');

    // Default path suggestions based on package name
    const defaultPaths: Record<string, string> = {};
    if (sourcePackagesDir) {
        defaultPaths['@salesforce/storefront-next-dev'] = path.resolve(sourcePackagesDir, 'storefront-next-dev');
        defaultPaths['@salesforce/storefront-next-runtime'] = path.resolve(
            sourcePackagesDir,
            'storefront-next-runtime'
        );
    }

    const resolvedPaths: Record<string, string> = {};

    // Prompt for each workspace dependency
    for (const { pkg } of workspaceDeps) {
        if (resolvedPaths[pkg]) continue; // Skip if already resolved (same pkg in multiple depTypes)

        const defaultPath = defaultPaths[pkg] || '';
        const defaultExists = defaultPath && fs.existsSync(defaultPath);

        let localPath: string | undefined;
        if (defaults && defaultExists) {
            localPath = defaultPath;
        } else if (defaults) {
            logger.warn(`Skipping ${pkg} - default path not found: ${defaultPath}`);
        } else {
            ({ localPath } = await prompts({
                type: 'text',
                name: 'localPath',
                message: `📦 Path to ${pkg}:`,
                initial: defaultExists ? defaultPath : '',
                validate: (value: string) => {
                    if (!value) return 'Path is required';
                    if (!fs.existsSync(value)) return `Directory not found: ${value}`;
                    if (!fs.existsSync(path.join(value, 'package.json'))) {
                        return `No package.json found in: ${value}`;
                    }
                    return true;
                },
            }));
        }

        if (!localPath) {
            logger.warn(`Skipping ${pkg} - no path provided`);
            continue;
        }

        resolvedPaths[pkg] = localPath;
    }

    // Apply the resolved paths
    let modified = false;
    for (const depType of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
        const deps = packageJson[depType];
        if (!deps) continue;

        for (const [pkg, version] of Object.entries(deps)) {
            if (typeof version === 'string' && version.startsWith('workspace:')) {
                const localPath = resolvedPaths[pkg];
                if (localPath) {
                    const fileRef = `file:${localPath}`;
                    logger.info(`Linked ${pkg} → ${fileRef}`);
                    deps[pkg] = fileRef;
                    modified = true;
                } else {
                    logger.warn(`Removing unresolved workspace dependency: ${pkg}`);
                    delete deps[pkg];
                    modified = true;
                }
            }
        }
    }

    // Remove volta.extends (monorepo-specific)
    if (packageJson.volta?.extends) {
        delete packageJson.volta.extends;
        if (Object.keys(packageJson.volta).length === 0) {
            delete packageJson.volta;
        }
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`);
        logger.info('package.json updated with local package links');

        // Patch vite.config.ts to fix "HydratedRouter" errors with file-linked packages
        const linkedPackages = Object.keys(resolvedPaths);
        patchViteConfigForLinkedPackages(projectDirectory, linkedPackages);
    }
}

/**
 * Patches vite.config.ts to fix "You must render this element inside a <HydratedRouter>" errors
 * that occur when using file: linked packages.
 *
 * The fix adds:
 * 1. resolve.dedupe for react, react-dom, react-router (helps with non-linked duplicates)
 * 2. ssr.noExternal for file-linked packages (key fix - bundles them so they use host's dependencies)
 *
 * When packages are in ssr.noExternal, Vite bundles them during SSR instead of externalizing.
 * During bundling, their imports resolve through the host project's node_modules,
 * ensuring all code uses the same react-router instance with the same context.
 */
function patchViteConfigForLinkedPackages(projectDirectory: string, linkedPackages: string[]): void {
    const viteConfigPath = path.join(projectDirectory, 'vite.config.ts');

    if (!fs.existsSync(viteConfigPath)) {
        logger.warn('vite.config.ts not found, skipping patch for file-linked packages');
        return;
    }

    if (linkedPackages.length === 0) {
        return;
    }

    let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
    let modified = false;

    // Add resolve.dedupe if not present
    // prevents duplicate imports from monorepo packages
    if (!viteConfig.includes('dedupe:')) {
        // Find existing resolve: block or create one
        const resolveBlockRegex = /resolve:\s*\{/;
        const resolveMatch = viteConfig.match(resolveBlockRegex);

        if (resolveMatch && resolveMatch.index !== undefined) {
            // Add dedupe to existing resolve block
            const insertPos = resolveMatch.index + resolveMatch[0].length;
            const dedupeBlock = `
            // Deduplicates packages to prevent context issues with file-linked packages
            dedupe: ['react', 'react-dom', 'react-router'],`;
            viteConfig = viteConfig.slice(0, insertPos) + dedupeBlock + viteConfig.slice(insertPos);
            modified = true;
        }
    }

    // Add ssr.noExternal for file-linked packages
    // Tells Vite to bundle file-linked packages during SSR instead of externalizing
    // fixes issue where generated project would conflict regarding import paths
    const packageList = linkedPackages.map((p) => `'${p}'`).join(', ');
    const ssrNoExternalRegex = /ssr:\s*\{[^}]*noExternal:/;

    if (ssrNoExternalRegex.test(viteConfig)) {
        // ssr.noExternal exists - need to merge packages into the array
        // Match the noExternal array and add our packages if not already present
        const noExternalArrayRegex = /noExternal:\s*\[([^\]]*)\]/;
        const noExternalMatch = viteConfig.match(noExternalArrayRegex);
        if (noExternalMatch) {
            const existingPackages = noExternalMatch[1];
            const packagesToAdd = linkedPackages.filter((p) => !existingPackages.includes(p));
            if (packagesToAdd.length > 0) {
                const newPackageList = packagesToAdd.map((p) => `'${p}'`).join(', ');
                const newArray = existingPackages.trim()
                    ? `[${existingPackages.trim()}, ${newPackageList}]`
                    : `[${newPackageList}]`;
                viteConfig = viteConfig.replace(noExternalArrayRegex, `noExternal: ${newArray}`);
                modified = true;
            }
        }
    } else {
        // Check if ssr: block exists
        const ssrBlockRegex = /ssr:\s*\{/;
        const ssrMatch = viteConfig.match(ssrBlockRegex);

        if (ssrMatch && ssrMatch.index !== undefined) {
            // Add noExternal to existing ssr block
            const insertPos = ssrMatch.index + ssrMatch[0].length;
            const noExternalBlock = `
            // Bundle file-linked packages so they use host project's dependencies
            // This prevents "You must render this element inside a <HydratedRouter>" errors
            noExternal: [${packageList}],`;
            viteConfig = viteConfig.slice(0, insertPos) + noExternalBlock + viteConfig.slice(insertPos);
            modified = true;
        } else {
            // No ssr block - add one after return {
            const returnBlockRegex = /return\s*\{/;
            const returnMatch = viteConfig.match(returnBlockRegex);

            if (returnMatch && returnMatch.index !== undefined) {
                const insertPos = returnMatch.index + returnMatch[0].length;
                const ssrBlock = `
        // SSR config for file-linked packages
        ssr: {
            // Bundle file-linked packages so they use host project's dependencies
            // This prevents "You must render this element inside a <HydratedRouter>" errors
            noExternal: [${packageList}],
            target: 'node',
        },`;
                viteConfig = viteConfig.slice(0, insertPos) + ssrBlock + viteConfig.slice(insertPos);
                modified = true;
            }
        }
    }

    if (modified) {
        fs.writeFileSync(viteConfigPath, viteConfig);
        logger.info('vite.config.ts patched for file-linked packages (ssr.noExternal + resolve.dedupe)');
    } else {
        logger.info('vite.config.ts already configured for file-linked packages');
    }
}
