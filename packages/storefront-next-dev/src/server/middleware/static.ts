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
import express, { type RequestHandler } from 'express';
import path from 'path';
import { getBundlePath } from '../../utils/paths';
import { logger } from '../../logger';

/**
 * Create static file serving middleware for client assets
 * Serves files from build/client at /mobify/bundle/{BUNDLE_ID}/client/
 */
export function createStaticMiddleware(bundleId: string, projectDirectory: string): RequestHandler {
    const bundlePath = getBundlePath(bundleId);
    const clientBuildDir = path.join(projectDirectory, 'build', 'client');

    logger.info(`Serving static assets from ${clientBuildDir} at ${bundlePath}`);

    return express.static(clientBuildDir, {
        setHeaders: (res) => {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('x-local-static-cache-control', '1');
        },
    });
}
