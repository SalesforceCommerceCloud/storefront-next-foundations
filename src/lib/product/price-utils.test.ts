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
import { describe, expect, test } from 'vitest';
import type { ShopperProducts } from '@/scapi';
import { hasPurchasablePrice, isAvailablePrice } from './price-utils';

type Product = ShopperProducts.schemas['Product'];
type Variant = ShopperProducts.schemas['Variant'];

describe('isAvailablePrice', () => {
    test('treats an explicit 0 as available', () => {
        expect(isAvailablePrice(0)).toBe(true);
    });

    test('treats a positive number as available', () => {
        expect(isAvailablePrice(29.99)).toBe(true);
    });

    test('treats a missing price (undefined/null) as unavailable', () => {
        expect(isAvailablePrice(undefined)).toBe(false);
        expect(isAvailablePrice(null)).toBe(false);
    });

    test('treats Infinity and NaN as unavailable', () => {
        expect(isAvailablePrice(Infinity)).toBe(false);
        expect(isAvailablePrice(Number.NaN)).toBe(false);
    });
});

describe('hasPurchasablePrice', () => {
    test('standard product with an explicit 0 price is purchasable', () => {
        const product = { id: 'p1', type: { item: true }, price: 0 } as Product;
        expect(hasPurchasablePrice(product)).toBe(true);
    });

    test('standard product with a positive price is purchasable', () => {
        const product = { id: 'p1', type: { item: true }, price: 19.99 } as Product;
        expect(hasPurchasablePrice(product)).toBe(true);
    });

    test('standard product with no price is not purchasable', () => {
        const product = { id: 'p1', type: { item: true } } as Product;
        expect(hasPurchasablePrice(product)).toBe(false);
    });

    test('master with at least one priced variant is purchasable when no variant selected', () => {
        const product = {
            id: 'm1',
            type: { master: true },
            variants: [{ productId: 'v1' }, { productId: 'v2', price: 25 }],
        } as Product;
        expect(hasPurchasablePrice(product)).toBe(true);
    });

    test('master with expanded variants but no priced variant is NOT purchasable, even if master.price is set', () => {
        // Regression: a `|| isAvailablePrice(product.price)` fallback used to let this case pass,
        // but the gate would then flip to disabled the moment the shopper picked any (unpriced)
        // variant. Once variants are expanded they're authoritative — the variant rule must win
        // so the gate doesn't flip-flop on selection.
        const product = {
            id: 'm1',
            type: { master: true },
            price: 29.99,
            variants: [{ productId: 'v1' }, { productId: 'v2' }],
        } as Product;
        expect(hasPurchasablePrice(product)).toBe(false);
    });

    test('master with no expanded variants array falls back to product.price (search-hit shape)', () => {
        // PLP search hits / partial projections often don't include a variants array. SCAPI
        // populates the master-level `price` as the min child price for those, so it's the only
        // signal we have at that point.
        const product = {
            id: 'm1',
            type: { master: true },
            price: 29.99,
        } as Product;
        expect(hasPurchasablePrice(product)).toBe(true);
    });

    test('master with no priced variant is not purchasable', () => {
        const product = {
            id: 'm1',
            type: { master: true },
            variants: [{ productId: 'v1' }, { productId: 'v2' }],
        } as Product;
        expect(hasPurchasablePrice(product)).toBe(false);
    });

    test('uses the selected variant price over the master', () => {
        const product = {
            id: 'm1',
            type: { master: true },
            variants: [{ productId: 'v1', price: 25 }, { productId: 'v2' }],
        } as Product;
        const pricedVariant = { productId: 'v1', price: 25 } as Variant;
        const unpricedVariant = { productId: 'v2' } as Variant;
        expect(hasPurchasablePrice(product, pricedVariant)).toBe(true);
        expect(hasPurchasablePrice(product, unpricedVariant)).toBe(false);
    });

    test('honors an explicit 0 on the selected variant', () => {
        const product = { id: 'm1', type: { master: true }, variants: [] } as unknown as Product;
        const freeVariant = { productId: 'v1', price: 0 } as Variant;
        expect(hasPurchasablePrice(product, freeVariant)).toBe(true);
    });

    test('bundle is purchasable only when it has a price', () => {
        const priced = { id: 'b1', type: { bundle: true }, price: 99 } as Product;
        const unpriced = { id: 'b1', type: { bundle: true } } as Product;
        expect(hasPurchasablePrice(priced)).toBe(true);
        expect(hasPurchasablePrice(unpriced)).toBe(false);
    });

    test('set is purchasable only when it has a (lowest-child) price', () => {
        const priced = { id: 's1', type: { set: true }, price: 49 } as Product;
        const unpriced = { id: 's1', type: { set: true } } as Product;
        expect(hasPurchasablePrice(priced)).toBe(true);
        expect(hasPurchasablePrice(unpriced)).toBe(false);
    });

    test('handles null/undefined product input', () => {
        expect(hasPurchasablePrice(null)).toBe(false);
        expect(hasPurchasablePrice(undefined)).toBe(false);
    });
});
