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
import { describe, test, expect, vi, beforeEach } from 'vitest';

const mockInitialize = vi.hoisted(() => vi.fn());
const mockApplyMiddleware = vi.hoisted(() => vi.fn());
const mockPluginNames = vi.hoisted(() => ({ value: [] as string[] }));
const mockLogger = vi.hoisted(() => ({
    info: vi.fn(),
    warn: vi.fn(),
}));
const mockGetLogger = vi.hoisted(() => vi.fn(() => mockLogger));

vi.mock('@salesforce/b2c-tooling-sdk/plugins', () => ({
    B2CPluginManager: class MockB2CPluginManager {
        initialize = mockInitialize;
        applyMiddleware = mockApplyMiddleware;
        get pluginNames() {
            return mockPluginNames.value;
        }
    },
}));

vi.mock('@salesforce/b2c-tooling-sdk/logging', () => ({
    getLogger: mockGetLogger,
}));

describe('initializePlugins', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        mockPluginNames.value = [];
    });

    async function loadModule() {
        const mod = await import('./cli-plugins.js');
        return mod.initializePlugins;
    }

    test('initializes B2CPluginManager and applies middleware', async () => {
        const initializePlugins = await loadModule();
        await initializePlugins();

        expect(mockInitialize).toHaveBeenCalledOnce();
        expect(mockApplyMiddleware).toHaveBeenCalledOnce();
    });

    test('logs loaded plugin names when plugins are found', async () => {
        mockPluginNames.value = ['plugin-a', 'plugin-b'];
        const initializePlugins = await loadModule();
        await initializePlugins();

        expect(mockLogger.info).toHaveBeenCalledWith('Loaded 2 plugin(s): plugin-a, plugin-b');
    });

    test('does not log when no plugins are found', async () => {
        const initializePlugins = await loadModule();
        await initializePlugins();

        expect(mockLogger.info).not.toHaveBeenCalled();
    });

    test('skips initialization on subsequent calls', async () => {
        const initializePlugins = await loadModule();
        await initializePlugins();
        await initializePlugins();

        expect(mockInitialize).toHaveBeenCalledOnce();
    });

    test('warns and continues when initialization fails with Error', async () => {
        mockInitialize.mockRejectedValueOnce(new Error('sdk boom'));
        const initializePlugins = await loadModule();
        await initializePlugins();

        expect(mockLogger.warn).toHaveBeenCalledWith('Plugin initialization failed: sdk boom');
    });

    test('warns and continues when initialization fails with non-Error', async () => {
        mockInitialize.mockRejectedValueOnce('string error');
        const initializePlugins = await loadModule();
        await initializePlugins();

        expect(mockLogger.warn).toHaveBeenCalledWith('Plugin initialization failed: string error');
    });

    test('silently ignores when logger also fails in error handler', async () => {
        mockInitialize.mockRejectedValueOnce(new Error('init fail'));
        mockGetLogger
            .mockImplementationOnce(() => mockLogger)
            .mockImplementationOnce(() => {
                throw new Error('logger fail');
            });
        const initializePlugins = await loadModule();

        // Should not throw
        await initializePlugins();
    });
});
