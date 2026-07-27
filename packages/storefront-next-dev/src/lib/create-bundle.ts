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

import fs from 'fs-extra';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { createBundle } from '../bundle';
import { buildMrtConfig } from '../config';
import { getDefaultBuildDir, getMrtConfig, getDefaultMessage } from '../utils';
import { logger } from '../logger';

const gzip = promisify(zlib.gzip);

export interface CreateBundleOptions {
    projectDirectory: string;
    buildDirectory?: string;
    outputDirectory?: string;
    message?: string;
    projectSlug?: string;
}

/**
 * Create a bundle and save it to disk without pushing to Managed Runtime
 */
export async function createBundleCommand(options: CreateBundleOptions): Promise<void> {
    // Validate project directory exists
    if (!fs.existsSync(options.projectDirectory)) {
        throw new Error(`Project directory "${options.projectDirectory}" does not exist!`);
    }

    // Get MRT configuration
    const mrtConfig = getMrtConfig(options.projectDirectory);
    const projectSlug = options.projectSlug ?? mrtConfig.defaultMrtProject;
    if (!projectSlug || projectSlug.trim() === '') {
        throw new Error('Project slug could not be determined from CLI, .env, or package.json');
    }

    // Set default build directory and validate it exists
    const buildDirectory = options.buildDirectory ?? getDefaultBuildDir(options.projectDirectory);
    if (!fs.existsSync(buildDirectory)) {
        throw new Error(`Build directory "${buildDirectory}" does not exist!`);
    }

    // Set default output directory
    const outputDirectory = options.outputDirectory ?? path.join(options.projectDirectory, '.bundle');
    await fs.ensureDir(outputDirectory);

    // Set default message
    const message = options.message ?? getDefaultMessage(options.projectDirectory);

    // Build SSR configuration for MRT bundle
    const config = await buildMrtConfig(buildDirectory, options.projectDirectory);

    logger.info(`Creating bundle for project: ${projectSlug}`);
    logger.info(`Build directory: ${buildDirectory}`);
    logger.info(`Output directory: ${outputDirectory}`);

    // Create bundle
    const bundle = await createBundle({
        message,
        ssr_parameters: config.ssrParameters,
        ssr_only: config.ssrOnly,
        ssr_shared: config.ssrShared,
        buildDirectory,
        projectDirectory: options.projectDirectory,
        projectSlug,
    });

    // Save bundle data to files
    const bundleTgzPath = path.join(outputDirectory, 'bundle.tgz');
    const bundleJsonPath = path.join(outputDirectory, 'bundle.json');

    // Decode base64 data and compress as tgz file
    const bundleData = Buffer.from(bundle.data, 'base64');
    const compressedData = await gzip(bundleData);
    await fs.writeFile(bundleTgzPath, compressedData);

    // Save bundle metadata as JSON (excluding the large base64 data)
    const bundleMetadata = {
        message: bundle.message,
        encoding: bundle.encoding,
        ssr_parameters: bundle.ssr_parameters,
        ssr_only: bundle.ssr_only,
        ssr_shared: bundle.ssr_shared,
        bundle_metadata: bundle.bundle_metadata,
        // Include data size for reference
        data_size: bundleData.length,
    };
    await fs.writeJson(bundleJsonPath, bundleMetadata, { spaces: 2 });

    logger.info(`Bundle created successfully!`);
    logger.info(`Bundle tgz file: ${bundleTgzPath}`);
    logger.info(`Bundle metadata: ${bundleJsonPath}`);
    logger.info(`Uncompressed size: ${(bundleData.length / 1024 / 1024).toFixed(2)} MB`);
    logger.info(`Compressed size: ${(compressedData.length / 1024 / 1024).toFixed(2)} MB`);
}
