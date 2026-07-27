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
import { resolve } from 'path';
import { importTypescript } from '../server/ts-import';
import { logger } from '../logger';

/**
 * Adapter configuration with event toggles
 * Event toggles are a dynamic map - any event name can be toggled
 */
export interface AdapterConfig {
    enabled?: boolean;
    eventToggles?: Record<string, boolean>;
}

/**
 * Expected structure of engagement config from config.server.ts
 */
export interface EngagementConfig {
    adapters?: Record<string, AdapterConfig>;
}

/**
 * Load the engagement config from config.server.ts
 */
export async function loadEngagementConfig(projectRoot: string, configPath: string): Promise<EngagementConfig | null> {
    const absoluteConfigPath = resolve(projectRoot, configPath);

    try {
        // Load through jiti (via importTypescript), the same TS-aware loader used by every
        // other config loader in the SDK. This plugin runs in plain Node during a production
        // build (Rollup `buildStart`), where a native `import()` cannot resolve TypeScript's
        // extensionless relative imports (e.g. `./src/types/tracking-consent`) and throws
        // ERR_MODULE_NOT_FOUND. jiti transpiles the TS and resolves tsconfig path aliases.
        const configModule = await importTypescript<{ default?: { app?: { engagement?: EngagementConfig } } }>(
            absoluteConfigPath,
            { projectDirectory: projectRoot }
        );
        const config = configModule.default;

        logger.debug(`📄 Loaded config from ${configPath}`);

        // Navigate to engagement config
        const engagement = config?.app?.engagement;

        if (!engagement) {
            logger.debug(`⚠️  No engagement config found in ${configPath}`);
            return null;
        }

        return engagement;
    } catch (error) {
        // Config might not exist or have import errors - this is non-fatal
        logger.warn(`⚠️  Could not load config from ${configPath}: ${(error as Error).message}`);
        return null;
    }
}
