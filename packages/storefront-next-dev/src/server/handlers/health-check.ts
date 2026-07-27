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
import type { RequestHandler } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { logger } from '../../logger';

const DEFAULT_HEALTH_DESCRIPTION = 'storefront-next-dev server health';
const PACKAGE_JSON_NAME = 'package.json';
const RUNTIME_PACKAGE_NAME = '@salesforce/storefront-next-runtime';
const DEV_PACKAGE_NAME = '@salesforce/storefront-next-dev';
const BUILD_FOLDER_NAME = 'build';
const LOCAL_BUNDLE_ID = 'local';

export const HEALTH_ENDPOINT_PATH = '/sfdc-health';

type PackageMetadata = {
    name?: string;
    version?: string;
    description?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
};

type HealthCheckOptions = {
    projectDirectory: string;
    bundleId: string;
};

/**
 * Reads a package.json file and returns selected metadata.
 *
 * @param path - Absolute path to a package.json file
 * @returns Parsed metadata, or null if missing/unreadable
 *
 * @example
 * ```ts
 * const metadata = readPackageMetadata('/app/package.json');
 * console.log(metadata?.version);
 * ```
 */
function readPackageMetadata(path: string): PackageMetadata | null {
    // Print out the content of the path.cwd() + build folder here.
    if (!existsSync(path)) {
        return null;
    }

    try {
        const metadata = JSON.parse(readFileSync(path, 'utf8')) as PackageMetadata;
        return metadata;
    } catch (error) {
        logger.debug(`Health check: failed to parse package.json at ${path}`, error);
        return null;
    }
}

/**
 * Creates an Express handler that returns Health+JSON for the project.
 *
 * @param options - Handler options
 * @returns Express request handler for the health endpoint
 *
 * @example
 * ```ts
 * app.get(HEALTH_ENDPOINT_PATH, createHealthCheckHandler({
 *     projectDirectory: process.cwd(),
 *     bundleId: LOCAL_BUNDLE_ID,
 * }));
 * ```
 */
export function createHealthCheckHandler(options: HealthCheckOptions): RequestHandler {
    const { projectDirectory, bundleId } = options;
    const isLocalBundle = bundleId === LOCAL_BUNDLE_ID;
    const packageJsonPath = isLocalBundle
        ? resolve(projectDirectory, PACKAGE_JSON_NAME)
        : resolve(projectDirectory, BUILD_FOLDER_NAME, PACKAGE_JSON_NAME);
    const projectPackage = readPackageMetadata(packageJsonPath);
    const allDependencies = {
        ...projectPackage?.dependencies,
        ...projectPackage?.devDependencies,
    };
    const devVersion = allDependencies?.[DEV_PACKAGE_NAME];
    const runtimeVersion = allDependencies?.[RUNTIME_PACKAGE_NAME];
    const notes = [
        devVersion ? `Built using ${DEV_PACKAGE_NAME}@${devVersion}.` : null,
        runtimeVersion ? `Running ${RUNTIME_PACKAGE_NAME}@${runtimeVersion}.` : null,
    ].filter(Boolean) as string[];

    return (_req, res) => {
        const healthResponse: {
            status: 'pass' | 'warn' | 'fail';
            version?: string;
            bundleId?: string;
            description?: string;
            notes?: string[];
        } = {
            // TODO: Add support for configurable "checks" once available.
            status: 'pass',
            version: projectPackage?.version,
            bundleId,
            description: projectPackage?.description ?? DEFAULT_HEALTH_DESCRIPTION,
            notes: notes.length > 0 ? notes : undefined,
        };

        res.status(200).type('application/health+json').json(healthResponse);
    };
}
