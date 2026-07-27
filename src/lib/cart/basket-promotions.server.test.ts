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
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ShopperBasketsV2 } from '@/scapi';
import { NormalizedApiError } from '@/lib/api/normalized-api-error';
import { fetchPromotionsByIds } from '@/lib/api/promotions.server';
import { createTestContext } from '@/lib/test-utils';
import { fetchPromotionsForBasket } from './basket-promotions.server';

vi.mock('@/lib/api/promotions.server', () => ({
    fetchPromotionsByIds: vi.fn(),
}));

describe('fetchPromotionsForBasket', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('returns empty record when no productItems are provided', async () => {
        const context = createTestContext();

        const result = await fetchPromotionsForBasket(context, []);

        expect(result).toEqual({});
        expect(fetchPromotionsByIds).not.toHaveBeenCalled();
    });

    test('returns empty record when productItems have no priceAdjustments', async () => {
        const context = createTestContext();
        const items = [{ itemId: 'i1', productId: 'p1', quantity: 1 }] as ShopperBasketsV2.schemas['ProductItem'][];

        const result = await fetchPromotionsForBasket(context, items);

        expect(result).toEqual({});
        expect(fetchPromotionsByIds).not.toHaveBeenCalled();
    });

    test('returns Record<promotionId, Promotion> for items with priceAdjustments', async () => {
        const context = createTestContext();
        const items = [
            {
                itemId: 'i1',
                productId: 'p1',
                quantity: 1,
                priceAdjustments: [{ promotionId: 'promo-1' }, { promotionId: 'promo-2' }],
            },
        ] as unknown as ShopperBasketsV2.schemas['ProductItem'][];
        vi.mocked(fetchPromotionsByIds).mockResolvedValue([
            { id: 'promo-1', name: 'Promo One' } as any,
            { id: 'promo-2', name: 'Promo Two' } as any,
        ]);

        const result = await fetchPromotionsForBasket(context, items);

        expect(result).toEqual({
            'promo-1': { id: 'promo-1', name: 'Promo One' },
            'promo-2': { id: 'promo-2', name: 'Promo Two' },
        });
    });

    test('deduplicates promotion IDs across multiple items', async () => {
        const context = createTestContext();
        const items = [
            {
                itemId: 'i1',
                productId: 'p1',
                quantity: 1,
                priceAdjustments: [{ promotionId: 'promo-1' }],
            },
            {
                itemId: 'i2',
                productId: 'p2',
                quantity: 1,
                priceAdjustments: [{ promotionId: 'promo-1' }, { promotionId: 'promo-2' }],
            },
        ] as unknown as ShopperBasketsV2.schemas['ProductItem'][];
        vi.mocked(fetchPromotionsByIds).mockResolvedValue([]);

        await fetchPromotionsForBasket(context, items);

        const calledIds = vi.mocked(fetchPromotionsByIds).mock.calls[0][1].slice().sort();
        expect(calledIds).toEqual(['promo-1', 'promo-2']);
    });

    test('collects promotion IDs from bonusDiscountLineItems (bonus-only basket)', async () => {
        const context = createTestContext();
        const items = [{ itemId: 'i1', productId: 'p1', quantity: 1 }] as ShopperBasketsV2.schemas['ProductItem'][];
        const bonusItems = [
            { id: 'b1', promotionId: 'bonus-promo' },
        ] as ShopperBasketsV2.schemas['BonusDiscountLineItem'][];
        vi.mocked(fetchPromotionsByIds).mockResolvedValue([
            { id: 'bonus-promo', name: 'Bonus Promo', calloutMsg: 'Buy one, get two' } as any,
        ]);

        const result = await fetchPromotionsForBasket(context, items, bonusItems);

        expect(vi.mocked(fetchPromotionsByIds).mock.calls[0][1]).toEqual(['bonus-promo']);
        expect(result).toEqual({
            'bonus-promo': { id: 'bonus-promo', name: 'Bonus Promo', calloutMsg: 'Buy one, get two' },
        });
    });

    test('deduplicates promotion IDs shared between priceAdjustments and bonusDiscountLineItems', async () => {
        const context = createTestContext();
        const items = [
            { itemId: 'i1', productId: 'p1', quantity: 1, priceAdjustments: [{ promotionId: 'promo-1' }] },
        ] as unknown as ShopperBasketsV2.schemas['ProductItem'][];
        const bonusItems = [
            { id: 'b1', promotionId: 'promo-1' },
            { id: 'b2', promotionId: 'bonus-promo' },
        ] as ShopperBasketsV2.schemas['BonusDiscountLineItem'][];
        vi.mocked(fetchPromotionsByIds).mockResolvedValue([]);

        await fetchPromotionsForBasket(context, items, bonusItems);

        const calledIds = vi.mocked(fetchPromotionsByIds).mock.calls[0][1].slice().sort();
        expect(calledIds).toEqual(['bonus-promo', 'promo-1']);
    });

    test('propagates NormalizedApiError when fetchPromotionsByIds rejects', async () => {
        const context = createTestContext();
        const items = [
            {
                itemId: 'i1',
                productId: 'p1',
                quantity: 1,
                priceAdjustments: [{ promotionId: 'promo-1' }],
            },
        ] as unknown as ShopperBasketsV2.schemas['ProductItem'][];
        const apiError = new NormalizedApiError(new TypeError('Network failure'));
        vi.mocked(fetchPromotionsByIds).mockRejectedValue(apiError);

        await expect(fetchPromotionsForBasket(context, items)).rejects.toBe(apiError);
    });
});
