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
import { loader } from './loaders';
import { fetchCategory } from '@/lib/api/categories.server';
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperExperience, ShopperProducts } from '@/scapi';

// Mock the fetchCategory function
vi.mock('@/lib/api/categories.server', () => ({
    fetchCategory: vi.fn(),
}));

const mockFetchCategory = vi.mocked(fetchCategory);

describe('PopularCategory loader', () => {
    let mockContext: LoaderFunctionArgs['context'];

    beforeEach(() => {
        vi.clearAllMocks();
        mockContext = {
            get: vi.fn(),
        } as any;
    });

    test('fetches category when categoryId is provided', async () => {
        const mockCategory: ShopperProducts.schemas['Category'] = {
            id: 'newarrivals',
            name: 'New Arrivals',
            pageDescription: 'Test description',
        };

        mockFetchCategory.mockResolvedValue(mockCategory);

        const componentData: ShopperExperience.schemas['Component'] = {
            id: 'component-1',
            typeId: 'Content.popularCategory',
            data: {
                category: 'newarrivals' as never,
            },
            regions: [],
        };

        const result = await loader({
            componentData,
            context: mockContext,
        });

        expect(mockFetchCategory).toHaveBeenCalledWith(mockContext, 'newarrivals', 0);
        expect(result).toEqual(mockCategory);
    });

    test('throws error when categoryId is missing', () => {
        const componentData: ShopperExperience.schemas['Component'] = {
            id: 'component-1',
            typeId: 'Content.popularCategory',
            data: {},
            regions: [],
        };

        expect(() => {
            void loader({
                componentData,
                context: mockContext,
            });
        }).toThrow('Category ID is required for PopularCategory component');
    });

    test('throws error when categoryId is not a string', () => {
        const componentData: ShopperExperience.schemas['Component'] = {
            id: 'component-1',
            typeId: 'Content.popularCategory',
            data: {
                category: 123 as never,
            },
            regions: [],
        };

        expect(() => {
            void loader({
                componentData,
                context: mockContext,
            });
        }).toThrow('Category ID is required for PopularCategory component');
    });

    test('throws error when categoryId is empty string', () => {
        const componentData: ShopperExperience.schemas['Component'] = {
            id: 'component-1',
            typeId: 'Content.popularCategory',
            data: {
                category: '' as never,
            },
            regions: [],
        };

        expect(() => {
            void loader({
                componentData,
                context: mockContext,
            });
        }).toThrow('Category ID is required for PopularCategory component');
    });
});
