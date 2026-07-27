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
import { describe, expect, test, vi, beforeEach } from 'vitest';

vi.mock('node:fs', () => ({
    default: { existsSync: vi.fn() },
}));

const mockJitiImport = vi.fn();

vi.mock('jiti', () => ({
    createJiti: vi.fn(() => ({
        import: mockJitiImport,
    })),
}));

import { loadConfig } from './load-config';

describe('loadConfig', () => {
    beforeEach(() => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        mockJitiImport.mockReset();
    });

    test('should throw when config file does not exist', async () => {
        await expect(loadConfig()).rejects.toThrow('config.server.ts is required but not found');
    });

    test('should return the full config object including app, metadata, and runtime', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);

        const fullConfig = {
            metadata: { projectName: 'Test', projectSlug: 'test' },
            runtime: { ssrOnly: ['server.js'] },
            app: {
                url: {
                    prefix: '/:siteId/:localeId',
                    excludeRoutes: ['/resource/**'],
                },
                someOtherSetting: 'value',
            },
        };

        mockJitiImport.mockResolvedValue({ default: fullConfig });

        const result = await loadConfig();

        expect(result).toEqual(fullConfig);
        expect(result.app).toEqual(fullConfig.app);
        expect(result.metadata).toEqual(fullConfig.metadata);
        expect(result.runtime).toEqual(fullConfig.runtime);
    });

    test('should return empty config when config exists but has no content', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        mockJitiImport.mockResolvedValue({ default: {} });

        const result = await loadConfig();

        expect(result).toEqual({});
    });

    test('should support destructuring app from result', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);

        const appConfig = { commerce: { api: { clientId: 'test' } } };
        mockJitiImport.mockResolvedValue({ default: { app: appConfig } });

        const { app } = await loadConfig();

        expect(app).toEqual(appConfig);
    });
});
