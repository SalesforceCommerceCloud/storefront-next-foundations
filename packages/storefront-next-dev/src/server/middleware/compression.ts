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
import compression from 'compression';
import type { RequestHandler } from 'express';
import zlib from 'node:zlib';
import { logger } from '../../logger';

/**
 * Parse and validate COMPRESSION_LEVEL environment variable
 * @returns Valid compression level (0-9) or default compression level
 */
function getCompressionLevel(): number {
    const raw = process.env.COMPRESSION_LEVEL;
    const DEFAULT = zlib.constants.Z_DEFAULT_COMPRESSION;

    if (raw == null || raw.trim() === '') {
        return DEFAULT;
    }

    const level = Number(raw);

    const isValid = Number.isInteger(level) && level >= 0 && level <= 9;

    if (!isValid) {
        logger.warn(`[compression] Invalid COMPRESSION_LEVEL="${raw}". ` + `Using default (${DEFAULT}).`);
        return DEFAULT;
    }

    return level;
}

/**
 * Create compression middleware for gzip/brotli compression
 * Used in preview mode to optimize response sizes
 */
export function createCompressionMiddleware(): RequestHandler {
    const compressionLevel = getCompressionLevel();

    return compression({
        filter: (req, res) => {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression.filter(req, res);
        },
        // Compression level (0-9, higher = better compression but slower)
        // default is zlib.constants.Z_DEFAULT_COMPRESSION = -1
        level: compressionLevel,
    });
}
