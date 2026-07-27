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
import fs from 'node:fs';
import path from 'node:path';
import type { BaseConfig } from './schema';

/**
 * Dynamically imports `config.server.ts` from the project root (CWD) and returns
 * the full configuration object. This runs at route discovery time under vite-node
 * (typegen, dev, build), which handles the TS transformation.
 *
 * Uses jiti to transpile TypeScript on the fly, which works regardless of whether
 * the caller runs under vite-node, a plain Node process, or any other runtime.
 * This avoids the fragile assumption that vite-node will intercept dynamic imports
 * from pre-compiled npm packages (it won't — Vite externalizes node_modules).
 *
 * Returns the full config including `metadata`, `runtime`, and `app` sections.
 * Callers that only need `app` can destructure: `const { app } = await loadConfig()`.
 *
 * - If the config file is missing, throws with a clear message.
 * - If the config file exists but fails to import, throws with the original error as cause.
 *
 * @returns The full configuration object.
 * @throws If `config.server.ts` is not found or fails to import.
 */
export async function loadConfig<T extends BaseConfig = BaseConfig>(): Promise<T> {
    const configPath = path.resolve(process.cwd(), 'config.server.ts');

    if (!fs.existsSync(configPath)) {
        throw new Error(
            `[storefront-next-runtime] config.server.ts is required but not found at ${configPath}. ` +
                `Create this file with defineConfig() to configure your storefront application.`
        );
    }

    try {
        const { createJiti } = await import('jiti');

        const jiti = createJiti(import.meta.url, {
            fsCache: false,
            interopDefault: true,
        });

        const mod = await jiti.import(configPath);
        const config = (mod as Record<string, unknown>).default ?? mod;
        return config as T;
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
            `[storefront-next-runtime] Found config.server.ts at ${configPath} but failed to import it.\n${reason}`,
            {
                cause: error,
            }
        );
    }
}
