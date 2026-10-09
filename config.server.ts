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

import { defineConfig } from '@salesforce/storefront-next-runtime/config';
import baseConfig, { protectedConfigPaths } from './config.server.base';

export default defineConfig(
    {
        ...baseConfig,
        app: {
            ...baseConfig?.app,
            commerce: {
                ...baseConfig?.app?.commerce,
                sites: [
                    {
                        id: 'Foundations',
                        defaultLocale: 'en-US',
                        defaultCurrency: 'USD',
                        supportedLocales: [
                            { id: 'default', preferredCurrency: 'USD' },
                            { id: 'en-US', preferredCurrency: 'USD' },
                        ],
                        supportedCurrencies: ['USD'],
                    },
                ],
            },
            defaultSiteId: 'Foundations',
            siteAliasMap: { Foundations: 'Foundations' },
        },
    },
    { protectedPaths: protectedConfigPaths }
);
