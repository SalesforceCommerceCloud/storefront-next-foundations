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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RouterContextProvider } from 'react-router';

vi.mock('@/lib/product/recommendations.server', () => ({
    fetchProductRecommendations: vi.fn().mockResolvedValue({ recs: [] }),
}));

describe('product-recommendations component loader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('threads recommenderName + currency from componentData', async () => {
        const { loader } = await import('./loader');
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        const request = new Request('http://localhost/');
        await loader({
            componentData: {
                id: 'comp-1',
                typeId: 'productRecommendations',
                data: { recommenderName: 'home-top-revenue-for-category', currency: 'USD', type: 'recommender' },
            },
            context: new RouterContextProvider(),
            request,
        });
        expect(fetchProductRecommendations).toHaveBeenCalledWith(
            { context: {}, request },
            expect.objectContaining({ name: 'home-top-revenue-for-category', currency: 'USD' })
        );
    });

    it('routes type=zone via args', async () => {
        const { loader } = await import('./loader');
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        const request = new Request('http://localhost/');
        await loader({
            componentData: {
                id: 'comp-2',
                typeId: 'productRecommendations',
                data: { recommenderName: 'home-zone', type: 'zone' },
            },
            context: new RouterContextProvider(),
            request,
        });
        expect(fetchProductRecommendations).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ args: expect.objectContaining({ type: 'zone' }) })
        );
    });

    it('omits currency when not present in componentData', async () => {
        const { loader } = await import('./loader');
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        await loader({
            componentData: { id: 'comp-3', typeId: 'productRecommendations', data: { recommenderName: 'home' } },
            context: new RouterContextProvider(),
            request: new Request('http://localhost/'),
        });
        const call = (fetchProductRecommendations as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];
        expect(call.currency).toBeUndefined();
    });

    it('returns {} when recommenderName is missing', async () => {
        const { loader } = await import('./loader');
        const { fetchProductRecommendations } = await import('@/lib/product/recommendations.server');
        const result = await loader({
            componentData: { id: 'comp-4', typeId: 'productRecommendations', data: {} },
            context: new RouterContextProvider(),
            request: new Request('http://localhost/'),
        });
        expect(result).toEqual({});
        expect(fetchProductRecommendations).not.toHaveBeenCalled();
    });
});
