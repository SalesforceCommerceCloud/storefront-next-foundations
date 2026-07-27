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
import { config as loadDotenv } from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Load environment variables from .env file.
 * This must happen before any configuration initialization.
 * Developers and CI maintain their own .env file (gitignored).
 */
export function loadEnvironmentFiles(): void {
    const envPath = join(process.cwd(), '.env');

    if (!existsSync(envPath)) {
        if (process.env.CI) {
            return;
        }
        const samplePath = join(process.cwd(), '.env.sample');
        const hint = existsSync(samplePath)
            ? `A sample file exists — copy it to get started:\n\n  cp .env.sample .env\n\nThen edit .env with your environment-specific values.`
            : `Create a .env file with at least BASE_URL and SITE_ID. See the README for details.`;
        throw new Error(
            `.env file not found at ${envPath}\n\nThe E2E test runner requires a .env file for configuration (base URL, site ID, credentials, etc.).\n${hint}\n`
        );
    }

    const result = loadDotenv({ path: envPath });
    if (result.error) {
        throw new Error(`Failed to load .env file at ${envPath}: ${result.error.message}`);
    }
}

/**
 * Strongly-typed snapshot of the environment variables relevant to the CLI.
 *
 * Reading through this interface instead of scattering `process.env.FOO`
 * throughout the codebase makes the data flow explicit and testable.
 */
export interface EnvironmentConfig {
    baseUrl?: string;
    siteId: string;
    storefrontDevPort: string;
    storefrontAppPath: string;
    testMode?: string;
    codeceptAi: boolean;
    verbose: boolean;
    debug?: string;
    tsNodeProject: string;
    startDevServer: boolean;
    headless: boolean;
    ci: boolean;
}

/**
 * Read the current environment into a typed config object.
 *
 * This is a pure read — it never mutates `process.env`.
 */
export function getEnvironmentConfig(): EnvironmentConfig {
    return {
        baseUrl: process.env.BASE_URL,
        siteId: process.env.SITE_ID || 'RefArchGlobal',
        storefrontDevPort: process.env.STOREFRONT_DEV_PORT || '5173',
        storefrontAppPath: process.env.STOREFRONT_APP_PATH || '..',
        testMode: process.env.TEST_MODE,
        codeceptAi: process.env.CODECEPT_AI === 'true',
        verbose: process.env.VERBOSE === 'true',
        debug: process.env.DEBUG,
        tsNodeProject: process.env.TS_NODE_PROJECT || 'tsconfig.codecept.json',
        startDevServer: process.env.START_DEV_SERVER === 'true',
        headless: process.env.HEADLESS !== 'false', // default true unless explicitly 'false'
        ci: process.env.CI === 'true',
    };
}

/**
 * Apply a set of key-value pairs to `process.env` in one controlled call.
 *
 * Only keys with non-`undefined` values are written, so callers can safely
 * spread partial overrides without accidentally unsetting variables.
 *
 * @example
 * ```ts
 * applyEnvironmentConfig({
 *     BASE_URL: 'http://localhost:5173',
 *     TEST_MODE: 'local',
 *     START_DEV_SERVER: 'true',
 * });
 * ```
 */
export function applyEnvironmentConfig(overrides: Record<string, string | undefined>): void {
    for (const [key, value] of Object.entries(overrides)) {
        if (value !== undefined) {
            process.env[key] = value;
        }
    }
}
