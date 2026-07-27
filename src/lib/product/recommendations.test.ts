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

import { describe, expect, test, vi } from 'vitest';
import { getEnabledRecommendationTypes } from './recommendations';

vi.mock('@/lib/api/search.server');
vi.mock('@salesforce/storefront-next-runtime/config', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        getConfig: () => ({
            global: {
                recommendations: {
                    search_limit: {
                        youMightLike: 8,
                        completeLook: 12,
                        recentlyViewed: 6,
                    },
                    types: {
                        'you-may-also-like': {
                            enabled: true,
                            priority: 1,
                            sort: 'best-matches',
                            titleKey: 'product.recommendations.youMightAlsoLike',
                        },
                        'complete-the-look': {
                            enabled: true,
                            priority: 2,
                            sort: 'price-low-to-high',
                            titleKey: 'product.recommendations.completeTheLook',
                        },
                        'recently-viewed': {
                            enabled: false,
                            priority: 3,
                            sort: 'most-popular',
                            titleKey: 'product.recommendations.recentlyViewed',
                        },
                    },
                },
            },
        }),
    };
});

describe('getEnabledRecommendationTypes', () => {
    test('returns enabled recommendation types in priority order', () => {
        const enabledTypes = getEnabledRecommendationTypes();
        expect(enabledTypes).toEqual(['you-may-also-like', 'complete-the-look']);
    });
});
