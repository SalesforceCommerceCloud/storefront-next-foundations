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

import { describe, test, expect } from 'vitest';
import { computeInitialVariationValues } from './initial-variation-values';
import type { ShopperProducts } from '@/scapi';

type Product = ShopperProducts.schemas['Product'];

describe('computeInitialVariationValues', () => {
    test('returns the product variationValues when present (variant product)', () => {
        const product = {
            id: 'v1',
            variationValues: { color: 'NAVY', size: 'M' },
        } as Product;
        expect(computeInitialVariationValues(product)).toEqual({ color: 'NAVY', size: 'M' });
    });

    test('falls back to representedProduct variant for masters with a merchant hint', () => {
        const product = {
            id: 'master-1',
            representedProduct: { id: 'variant-2' },
            variants: [
                { productId: 'variant-1', variationValues: { color: 'NAVY', size: 'L' }, orderable: true },
                { productId: 'variant-2', variationValues: { color: 'RED', size: 'M' }, orderable: true },
            ],
        } as unknown as Product;
        expect(computeInitialVariationValues(product)).toEqual({ color: 'RED', size: 'M' });
    });

    test('falls back to first orderable variant when no merchant hint exists', () => {
        const product = {
            id: 'master-1',
            variants: [
                { productId: 'variant-1', variationValues: { color: 'NAVY', size: 'L' }, orderable: false },
                { productId: 'variant-2', variationValues: { color: 'RED', size: 'M' }, orderable: true },
            ],
        } as unknown as Product;
        expect(computeInitialVariationValues(product)).toEqual({ color: 'RED', size: 'M' });
    });

    test('falls back to first variant when none are orderable', () => {
        const product = {
            id: 'master-1',
            variants: [
                { productId: 'variant-1', variationValues: { color: 'NAVY' }, orderable: false },
                { productId: 'variant-2', variationValues: { color: 'RED' }, orderable: false },
            ],
        } as unknown as Product;
        expect(computeInitialVariationValues(product)).toEqual({ color: 'NAVY' });
    });

    test('auto-selects single-value attributes when no variant fallback supplies a value', () => {
        const product = {
            id: 'master-1',
            variationAttributes: [
                { id: 'color', name: 'Color', values: [{ value: 'NAVY' }] },
                { id: 'size', name: 'Size', values: [{ value: 'M' }, { value: 'L' }] },
            ],
        } as unknown as Product;
        expect(computeInitialVariationValues(product)).toEqual({ color: 'NAVY' });
    });

    test('combines variant fallback with single-value attributes', () => {
        const product = {
            id: 'master-1',
            variationAttributes: [
                { id: 'width', name: 'Width', values: [{ value: 'REGULAR' }] },
                {
                    id: 'color',
                    name: 'Color',
                    values: [{ value: 'NAVY' }, { value: 'RED' }],
                },
            ],
            variants: [
                {
                    productId: 'variant-1',
                    variationValues: { color: 'NAVY', width: 'REGULAR' },
                    orderable: true,
                },
            ],
        } as unknown as Product;
        expect(computeInitialVariationValues(product)).toEqual({ color: 'NAVY', width: 'REGULAR' });
    });

    test('returns empty object when no variants and no single-value attributes exist', () => {
        const product = {
            id: 'master-1',
            variationAttributes: [{ id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] }],
        } as Product;
        expect(computeInitialVariationValues(product)).toEqual({});
    });
});
