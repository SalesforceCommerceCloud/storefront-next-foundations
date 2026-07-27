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
import { fetchCategories } from '@/lib/api/categories.server';
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperExperience, ShopperProducts } from '@/scapi';

vi.mock('@/lib/api/categories.server', () => ({
    fetchCategories: vi.fn(),
}));

const mockFetchCategories = vi.mocked(fetchCategories);

describe('PopularCategories loader', () => {
    let mockContext: LoaderFunctionArgs['context'];

    beforeEach(() => {
        vi.clearAllMocks();
        mockContext = { get: vi.fn() } as any;
    });

    test('loader is a callable function, not an object wrapper', () => {
        expect(typeof loader).toBe('function');
    });

    test('fetches categories using parentId from componentData', async () => {
        const mockCategories: ShopperProducts.schemas['Category'][] = [
            { id: 'mens', name: 'Mens' },
            { id: 'womens', name: 'Womens' },
        ];
        mockFetchCategories.mockResolvedValue(mockCategories);

        const componentData: ShopperExperience.schemas['Component'] = {
            id: 'component-1',
            typeId: 'odyssey_base.popularCategories',
            data: { parentId: 'mens' } as never,
            regions: [],
        };

        const result = await loader({ componentData, context: mockContext });

        expect(mockFetchCategories).toHaveBeenCalledWith(mockContext, 'mens', 1);
        expect(result).toEqual(mockCategories);
    });

    test('defaults parentId to root when not set in componentData', async () => {
        mockFetchCategories.mockResolvedValue([]);

        const componentData: ShopperExperience.schemas['Component'] = {
            id: 'component-1',
            typeId: 'odyssey_base.popularCategories',
            data: {},
            regions: [],
        };

        await loader({ componentData, context: mockContext });

        expect(mockFetchCategories).toHaveBeenCalledWith(mockContext, 'root', 1);
    });

    test('defaults parentId to root when componentData has no data property', async () => {
        mockFetchCategories.mockResolvedValue([]);

        const componentData: ShopperExperience.schemas['Component'] = {
            id: 'component-1',
            typeId: 'odyssey_base.popularCategories',
            regions: [],
        };

        await loader({ componentData, context: mockContext });

        expect(mockFetchCategories).toHaveBeenCalledWith(mockContext, 'root', 1);
    });

    test('always fetches with depth level 1', async () => {
        mockFetchCategories.mockResolvedValue([]);

        await loader({
            componentData: { id: 'c', typeId: 't', data: { parentId: 'womens' } as never, regions: [] },
            context: mockContext,
        });

        expect(mockFetchCategories).toHaveBeenCalledWith(expect.anything(), expect.anything(), 1);
    });
});
