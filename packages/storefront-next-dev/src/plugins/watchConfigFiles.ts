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
import type { ViteDevServer, ResolvedConfig } from 'vite';
import path from 'path';
import { logger } from '../logger';

export const watchConfigFilesPlugin = () => {
    let viteConfig: ResolvedConfig;
    return {
        name: 'storefront-next:watch-config-files',
        configResolved(config: ResolvedConfig) {
            viteConfig = config;
        },
        configureServer(server: ViteDevServer) {
            const aliases = viteConfig.resolve.alias;
            const root = Object.values(aliases).find((alias) => alias.find === '@')?.replacement || 'src';
            // Use path.posix.join to ensure forward slashes for glob patterns (required even on Windows)
            const glob = path.posix.join(root, 'extensions', '**', 'target-config.json');
            server.watcher.add(glob);

            const onChange = (file: string) => {
                if (file.endsWith('target-config.json')) {
                    logger.debug(`🔁 target-config.json changed: ${file}`);
                    void server.restart();
                }
            };

            server.watcher.on('add', onChange);
            server.watcher.on('change', onChange);
            server.watcher.on('unlink', onChange);
        },
    };
};
