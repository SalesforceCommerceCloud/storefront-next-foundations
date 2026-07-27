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
import { fetchSearchProducts } from '@/lib/api/search.server';
import { getLogger } from '@/lib/logger.server';
import { createTestContext } from '@/lib/test-utils';
import { fetchRuleBasedBonusProductsForBasket } from './rule-based-bonus.server';

vi.mock('@/lib/api/search.server', () => ({
    fetchSearchProducts: vi.fn(),
}));

const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
};
vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => mockLogger),
}));

const buildBli = (
    overrides: Partial<ShopperBasketsV2.schemas['BonusDiscountLineItem']> = {}
): ShopperBasketsV2.schemas['BonusDiscountLineItem'] => ({
    id: 'bli-1',
    promotionId: 'promo-1',
    maxBonusItems: 3,
    bonusProducts: [],
    ...overrides,
});

const buildBasket = (
    bonusDiscountLineItems: ShopperBasketsV2.schemas['BonusDiscountLineItem'][]
): ShopperBasketsV2.schemas['Basket'] =>
    ({
        basketId: 'basket-1',
        productItems: [],
        bonusDiscountLineItems,
    }) as ShopperBasketsV2.schemas['Basket'];

describe('fetchRuleBasedBonusProductsForBasket', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('returns empty record when basket is null', async () => {
        const context = createTestContext({ currency: 'USD' });
        const result = await fetchRuleBasedBonusProductsForBasket(context, null, 25);
        expect(result).toEqual({});
        expect(fetchSearchProducts).not.toHaveBeenCalled();
    });

    test('returns empty record when basket has no bonusDiscountLineItems', async () => {
        const context = createTestContext({ currency: 'USD' });
        const result = await fetchRuleBasedBonusProductsForBasket(context, buildBasket([]), 25);
        expect(result).toEqual({});
        expect(fetchSearchProducts).not.toHaveBeenCalled();
    });

    test('skips list-based BLIs (non-empty bonusProducts)', async () => {
        const context = createTestContext({ currency: 'USD' });
        const basket = buildBasket([
            buildBli({
                promotionId: 'list-promo',
                bonusProducts: [{ productId: 'p1', productName: 'P1' }],
            }),
        ]);

        const result = await fetchRuleBasedBonusProductsForBasket(context, basket, 25);

        expect(result).toEqual({});
        expect(fetchSearchProducts).not.toHaveBeenCalled();
    });

    test('skips BLIs without a promotionId', async () => {
        const context = createTestContext({ currency: 'USD' });
        const basket = buildBasket([buildBli({ promotionId: undefined, bonusProducts: [] })]);

        const result = await fetchRuleBasedBonusProductsForBasket(context, basket, 25);

        expect(result).toEqual({});
        expect(fetchSearchProducts).not.toHaveBeenCalled();
    });

    test('issues one productSearch per rule-based BLI with the documented refine shape', async () => {
        const context = createTestContext({ currency: 'USD' });
        const basket = buildBasket([
            buildBli({ promotionId: 'rb-1', bonusProducts: [] }),
            buildBli({ id: 'bli-2', promotionId: 'rb-2', bonusProducts: [] }),
        ]);
        vi.mocked(fetchSearchProducts).mockImplementation((_ctx, params) => {
            const refine = (params?.refine ?? []) as string[];
            const id = refine.find((r) => r.startsWith('pmid='))?.slice('pmid='.length);
            return Promise.resolve({ hits: [{ productId: `${id}-hit`, productName: `Hit for ${id}` }] } as any);
        });

        const result = await fetchRuleBasedBonusProductsForBasket(context, basket, 25);

        expect(fetchSearchProducts).toHaveBeenCalledTimes(2);
        expect(fetchSearchProducts).toHaveBeenCalledWith(
            context,
            expect.objectContaining({
                refine: ['pmid=rb-1', 'pmpt=bonus'],
                limit: 25,
            })
        );
        expect(fetchSearchProducts).toHaveBeenCalledWith(
            context,
            expect.objectContaining({
                refine: ['pmid=rb-2', 'pmpt=bonus'],
                limit: 25,
            })
        );

        expect(result['rb-1']).toEqual([{ productId: 'rb-1-hit', productName: 'Hit for rb-1' }]);
        expect(result['rb-2']).toEqual([{ productId: 'rb-2-hit', productName: 'Hit for rb-2' }]);
    });

    test('per-promotion error isolation: a failed search resolves to [] without rejecting the rest', async () => {
        const context = createTestContext({ currency: 'USD' });
        const basket = buildBasket([
            buildBli({ promotionId: 'good', bonusProducts: [] }),
            buildBli({ id: 'bli-2', promotionId: 'bad', bonusProducts: [] }),
        ]);
        vi.mocked(fetchSearchProducts).mockImplementation((_ctx, params) => {
            const refine = (params?.refine ?? []) as string[];
            if (refine.includes('pmid=bad')) {
                return Promise.reject(new Error('SCAPI down'));
            }
            return Promise.resolve({ hits: [{ productId: 'g-hit' }] } as any);
        });

        const result = await fetchRuleBasedBonusProductsForBasket(context, basket, 25);

        expect(result.good).toEqual([{ productId: 'g-hit' }]);
        expect(result.bad).toEqual([]);
    });

    test('returns [] for a promotion whose search produced no hits', async () => {
        const context = createTestContext({ currency: 'USD' });
        const basket = buildBasket([buildBli({ promotionId: 'empty', bonusProducts: [] })]);
        vi.mocked(fetchSearchProducts).mockResolvedValue({ hits: undefined } as any);

        const result = await fetchRuleBasedBonusProductsForBasket(context, basket, 25);

        expect(result.empty).toEqual([]);
    });

    test('fires searches in parallel — total wall-clock equals slowest, not the sum', async () => {
        const context = createTestContext({ currency: 'USD' });
        const basket = buildBasket([
            buildBli({ promotionId: 'a', bonusProducts: [] }),
            buildBli({ id: 'bli-2', promotionId: 'b', bonusProducts: [] }),
            buildBli({ id: 'bli-3', promotionId: 'c', bonusProducts: [] }),
        ]);
        let inFlight = 0;
        let maxInFlight = 0;
        vi.mocked(fetchSearchProducts).mockImplementation(async () => {
            inFlight++;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise((resolve) => setTimeout(resolve, 5));
            inFlight--;
            return { hits: [] } as any;
        });

        await fetchRuleBasedBonusProductsForBasket(context, basket, 25);

        // All three searches must overlap; if calls were sequential, max would be 1.
        expect(maxInFlight).toBe(3);
    });

    test('forwards the supplied limit to fetchSearchProducts', async () => {
        const context = createTestContext({ currency: 'USD' });
        const basket = buildBasket([buildBli({ promotionId: 'rb-1', bonusProducts: [] })]);
        vi.mocked(fetchSearchProducts).mockResolvedValue({ hits: [] } as any);

        await fetchRuleBasedBonusProductsForBasket(context, basket, 4);

        expect(fetchSearchProducts).toHaveBeenCalledWith(context, expect.objectContaining({ limit: 4 }));
    });

    test('mixed list-based + rule-based BLIs: only the rule-based ones drive a search', async () => {
        const context = createTestContext({ currency: 'USD' });
        const basket = buildBasket([
            buildBli({
                id: 'list-bli',
                promotionId: 'list-promo',
                bonusProducts: [{ productId: 'p1', productName: 'P1' }],
            }),
            buildBli({ id: 'rb-bli', promotionId: 'rb-promo', bonusProducts: [] }),
        ]);
        vi.mocked(fetchSearchProducts).mockResolvedValue({ hits: [{ productId: 'rb-hit' }] } as any);

        const result = await fetchRuleBasedBonusProductsForBasket(context, basket, 25);

        expect(fetchSearchProducts).toHaveBeenCalledTimes(1);
        expect(fetchSearchProducts).toHaveBeenCalledWith(
            context,
            expect.objectContaining({ refine: ['pmid=rb-promo', 'pmpt=bonus'] })
        );
        // The list-based BLI's promotionId must not appear in the result map.
        expect(Object.keys(result)).toEqual(['rb-promo']);
        expect(result['list-promo']).toBeUndefined();
    });

    test('logs a structured warning with promotionId and the underlying error on per-promotion failure', async () => {
        const context = createTestContext({ currency: 'USD' });
        const basket = buildBasket([buildBli({ promotionId: 'bad', bonusProducts: [] })]);
        const cause = new Error('SCAPI down');
        vi.mocked(fetchSearchProducts).mockRejectedValue(cause);

        await fetchRuleBasedBonusProductsForBasket(context, basket, 25);

        expect(getLogger).toHaveBeenCalledWith(context);
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith(
            'Cart rule-based bonus search failed',
            expect.objectContaining({ promotionId: 'bad', error: cause })
        );
    });
});
