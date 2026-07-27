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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineConfig, type BaseConfig } from './schema';
import type { Site } from './types';

type TestApp = {
    commerce: {
        api: {
            clientId: string;
            organizationId: string;
            shortCode: string;
        };
        sites: Site[];
    };
    defaultSiteId: string;
};

type TestConfig = BaseConfig<TestApp>;

const minimalConfig: TestConfig = {
    metadata: { projectName: 'Test', projectSlug: 'test' },
    app: {
        commerce: {
            api: {
                clientId: 'test-client',
                organizationId: 'test-org',
                shortCode: 'test-short',
            },
            sites: [
                {
                    id: 'test-site',
                    defaultLocale: 'en-US',
                    defaultCurrency: 'USD',
                    supportedLocales: [{ id: 'en-US', preferredCurrency: 'USD' }],
                    supportedCurrencies: ['USD'],
                },
            ],
        },
        defaultSiteId: 'test-site',
    },
};

const getCleanEnv = () =>
    Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PUBLIC__')));

describe('defineConfig', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = process.env;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should return config with structure preserved when no env overrides', () => {
        process.env = getCleanEnv();
        const result = defineConfig(minimalConfig);
        expect(result).toEqual(minimalConfig);
    });

    it('should merge PUBLIC__ environment variable overrides', () => {
        process.env = {
            ...getCleanEnv(),
            PUBLIC__app__commerce__api__clientId: 'overridden-client',
        };
        const result = defineConfig(minimalConfig);
        expect(result.app.commerce.api.clientId).toBe('overridden-client');
    });

    it('should preserve all config sections', () => {
        process.env = getCleanEnv();
        const config = defineConfig(minimalConfig);
        expect(config.metadata).toBeDefined();
        expect(config.app).toBeDefined();
        expect(config.app.commerce.api.clientId).toBe('test-client');
    });

    it('should accept extended config types via generic', () => {
        process.env = getCleanEnv();
        type AppConfig = TestApp & {
            pages: { home: { featuredCount: number } };
        };
        type ExtendedConfig = BaseConfig<AppConfig>;
        const extendedConfig: ExtendedConfig = {
            ...minimalConfig,
            app: {
                ...minimalConfig.app,
                pages: { home: { featuredCount: 10 } },
            },
        };
        const result = defineConfig<ExtendedConfig>(extendedConfig);
        expect(result.app.pages.home.featuredCount).toBe(10);
    });

    it('should respect protectedPaths option', () => {
        process.env = {
            ...getCleanEnv(),
            PUBLIC__app__commerce__api__clientId: 'ok',
        };
        expect(() => defineConfig(minimalConfig, { protectedPaths: ['app__commerce'] })).toThrow(
            'attempts to override protected config path'
        );
    });
});
