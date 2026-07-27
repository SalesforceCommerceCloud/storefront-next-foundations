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
import { describe, it, expect, vi } from 'vitest';
import type { ViteDevServer, ResolvedConfig } from 'vite';
import { watchConfigFilesPlugin } from './watchConfigFiles';

const resolvedConfig = {
    resolve: {
        alias: [
            {
                find: '@',
                replacement: 'src',
            },
        ],
    },
} as unknown as ResolvedConfig;

describe('watchConfigFilesPlugin', () => {
    it('should use default src root when no @ alias is found', () => {
        // Arrange - config with no @ alias
        const configWithoutAlias = {
            resolve: {
                alias: [
                    {
                        find: 'other',
                        replacement: 'other-path',
                    },
                ],
            },
        } as unknown as ResolvedConfig;

        const add = vi.fn();
        const watcherOn = vi.fn();
        const restart = vi.fn();

        const fakeServer = {
            watcher: {
                add,
                on: watcherOn,
            },
            restart,
        } as unknown as ViteDevServer;

        // Act
        const plugin = watchConfigFilesPlugin();
        plugin.configResolved(configWithoutAlias);
        plugin.configureServer(fakeServer);

        // Assert - should use 'src' as default root
        expect(add).toHaveBeenCalledWith('src/extensions/**/target-config.json');
    });

    it('should add glob pattern and register event listeners', () => {
        // Arrange
        const add = vi.fn();
        const watcherOn = vi.fn();
        const restart = vi.fn();

        const fakeServer = {
            watcher: {
                add,
                on: watcherOn,
            },
            restart,
        } as unknown as ViteDevServer;

        // Act
        const plugin = watchConfigFilesPlugin();
        plugin.configResolved(resolvedConfig);
        plugin.configureServer(fakeServer);

        // Assert
        expect(add).toHaveBeenCalledWith('src/extensions/**/target-config.json');
        expect(watcherOn).toHaveBeenCalledWith('add', expect.any(Function));
        expect(watcherOn).toHaveBeenCalledWith('change', expect.any(Function));
        expect(watcherOn).toHaveBeenCalledWith('unlink', expect.any(Function));
    });

    it('should call server.restart() when target-config.json changes', () => {
        // Arrange
        const add = vi.fn();
        const restart = vi.fn();
        const handlers: Record<string, (file: string) => void> = {
            add: vi.fn(),
            change: vi.fn(),
            unlink: vi.fn(),
        };

        const watcher = {
            add,
            on(event: string, fn: (file: string) => void) {
                handlers[event] = fn;
            },
        };
        const fakeServer = {
            watcher,
            restart,
        } as unknown as ViteDevServer;

        // Act
        const plugin = watchConfigFilesPlugin();
        plugin.configResolved(resolvedConfig);
        plugin.configureServer(fakeServer);

        // Simulate change event for target-config.json
        handlers.change('/abs/path/src/extensions/foo/target-config.json');

        // Assert
        expect(restart).toHaveBeenCalled();
    });

    it('should not restart server for non-extension-config files', () => {
        // Arrange
        const add = vi.fn();
        const restart = vi.fn();
        const handlers: Record<string, (file: string) => void> = {
            add: vi.fn(),
            change: vi.fn(),
            unlink: vi.fn(),
        };

        const watcher = {
            add,
            on(event: string, fn: (file: string) => void) {
                handlers[event] = fn;
            },
        };
        const fakeServer = {
            watcher,
            restart,
        } as unknown as ViteDevServer;

        // Act
        const plugin = watchConfigFilesPlugin();
        plugin.configResolved(resolvedConfig);
        plugin.configureServer(fakeServer);

        // Simulate change event with irrelevant file
        handlers.change('/abs/path/somefile.txt');

        // Assert
        expect(restart).not.toHaveBeenCalled();
    });
});
