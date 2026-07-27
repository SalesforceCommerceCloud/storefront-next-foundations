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

import { B2CPluginManager } from '@salesforce/b2c-tooling-sdk/plugins';
import { getLogger } from '@salesforce/b2c-tooling-sdk/logging';

let manager: B2CPluginManager | undefined;
let initialized = false;

/**
 * Initializes the b2c-cli plugin system.
 *
 * Discovers plugins installed via `b2c plugins:install`, invokes their hooks,
 * and registers middleware and config sources with the global registries.
 * All failures are non-fatal — the CLI continues to work without plugin support.
 */
export async function initializePlugins(): Promise<void> {
    if (initialized) return;
    initialized = true;

    try {
        const logger = getLogger();
        manager = new B2CPluginManager({ logger });
        await manager.initialize();
        manager.applyMiddleware();

        if (manager.pluginNames.length > 0) {
            logger.info(`Loaded ${manager.pluginNames.length} plugin(s): ${manager.pluginNames.join(', ')}`);
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        try {
            getLogger().warn(`Plugin initialization failed: ${message}`);
        } catch {
            // Logger not available — silently ignore
        }
        manager = undefined;
    }
}
