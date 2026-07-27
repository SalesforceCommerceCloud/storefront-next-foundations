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
import { renderHook } from '@testing-library/react';
import { useSelectedVariations } from './use-selected-variations';
import type { ShopperProducts } from '@/scapi';

const mockUseSearchParams = vi.fn();
const mockUseNavigation = vi.fn();
vi.mock('react-router', () => ({
    href: (path: string) => path,
    useSearchParams: () => mockUseSearchParams(),
    useNavigation: () => mockUseNavigation(),
}));

const setSearchParams = (search: string) => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams(search)]);
};

const setPendingNavigation = (search: string | null) => {
    mockUseNavigation.mockReturnValue({
        state: search === null ? 'idle' : 'loading',
        location: search === null ? undefined : { search, pathname: '/', hash: '', state: null, key: 'k' },
    });
};

beforeEach(() => {
    setPendingNavigation(null);
});

type Product = ShopperProducts.schemas['Product'];

describe('useSelectedVariations', () => {
    test('returns empty object when product has no variationAttributes', () => {
        setSearchParams('');
        const product = { id: 'p1' } as Product;
        const { result } = renderHook(() => useSelectedVariations({ product }));
        expect(result.current).toEqual({});
    });

    test('reads URL params for non-child products', () => {
        setSearchParams('color=NAVY&size=040');
        const product = {
            id: 'p1',
            variationAttributes: [
                { id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] },
                { id: 'size', name: 'Size', values: [{ value: '040' }, { value: '042' }] },
            ],
        } as Product;
        const { result } = renderHook(() => useSelectedVariations({ product }));
        expect(result.current).toEqual({ color: 'NAVY', size: '040' });
    });

    test('reads nested URL params for child products', () => {
        setSearchParams('child-1=color%3DRED%26size%3DL&other=ignored');
        const product = {
            id: 'child-1',
            variationAttributes: [
                { id: 'color', name: 'Color', values: [{ value: 'RED' }, { value: 'BLUE' }] },
                { id: 'size', name: 'Size', values: [{ value: 'L' }, { value: 'M' }] },
            ],
        } as Product;
        const { result } = renderHook(() => useSelectedVariations({ product, isChildProduct: true }));
        expect(result.current).toEqual({ color: 'RED', size: 'L' });
    });

    test('falls back to product.variationValues when URL has no value', () => {
        setSearchParams('');
        const product = {
            id: 'p1',
            variationAttributes: [{ id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] }],
            variationValues: { color: 'NAVY' },
        } as unknown as Product;
        const { result } = renderHook(() => useSelectedVariations({ product }));
        expect(result.current).toEqual({ color: 'NAVY' });
    });

    test('URL params take precedence over product.variationValues', () => {
        setSearchParams('color=RED');
        const product = {
            id: 'p1',
            variationAttributes: [{ id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] }],
            variationValues: { color: 'NAVY' },
        } as unknown as Product;
        const { result } = renderHook(() => useSelectedVariations({ product }));
        expect(result.current).toEqual({ color: 'RED' });
    });

    test('falls back to representedProduct variant when product has no variationValues', () => {
        setSearchParams('');
        const product = {
            id: 'master-1',
            variationAttributes: [
                { id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] },
                { id: 'size', name: 'Size', values: [{ value: 'L' }, { value: 'M' }] },
            ],
            representedProduct: { id: 'variant-2' },
            variants: [
                { productId: 'variant-1', variationValues: { color: 'NAVY', size: 'L' }, orderable: true },
                { productId: 'variant-2', variationValues: { color: 'RED', size: 'M' }, orderable: true },
            ],
        } as unknown as Product;
        const { result } = renderHook(() => useSelectedVariations({ product }));
        expect(result.current).toEqual({ color: 'RED', size: 'M' });
    });

    test('falls back to first orderable variant for child products without defaults or representedProduct', () => {
        setSearchParams('');
        const product = {
            id: 'child-1',
            variationAttributes: [
                { id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] },
                { id: 'size', name: 'Size', values: [{ value: 'L' }, { value: 'M' }] },
            ],
            variants: [
                // First variant is unorderable — should be skipped
                { productId: 'v1', variationValues: { color: 'NAVY', size: 'L' }, orderable: false },
                { productId: 'v2', variationValues: { color: 'RED', size: 'M' }, orderable: true },
            ],
        } as unknown as Product;
        const { result } = renderHook(() => useSelectedVariations({ product, isChildProduct: true }));
        expect(result.current).toEqual({ color: 'RED', size: 'M' });
    });

    test('falls back to first variant when no variant is orderable for child products', () => {
        setSearchParams('');
        const product = {
            id: 'child-1',
            variationAttributes: [{ id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] }],
            variants: [
                { productId: 'v1', variationValues: { color: 'NAVY' }, orderable: false },
                { productId: 'v2', variationValues: { color: 'RED' }, orderable: false },
            ],
        } as unknown as Product;
        const { result } = renderHook(() => useSelectedVariations({ product, isChildProduct: true }));
        expect(result.current).toEqual({ color: 'NAVY' });
    });

    test('does not auto-select first orderable variant for non-child products', () => {
        setSearchParams('');
        const product = {
            id: 'master-1',
            variationAttributes: [
                { id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] },
                { id: 'size', name: 'Size', values: [{ value: 'L' }, { value: 'M' }] },
            ],
            variants: [{ productId: 'v1', variationValues: { color: 'NAVY', size: 'L' }, orderable: true }],
        } as unknown as Product;
        const { result } = renderHook(() => useSelectedVariations({ product }));
        // Master PDP intentionally leaves selection to the shopper
        expect(result.current).toEqual({});
    });

    test('auto-selects single-value attribute even for non-child products', () => {
        setSearchParams('');
        const product = {
            id: 'p1',
            variationAttributes: [{ id: 'color', name: 'Color', values: [{ value: 'NAVY' }] }],
        } as Product;
        const { result } = renderHook(() => useSelectedVariations({ product }));
        expect(result.current).toEqual({ color: 'NAVY' });
    });

    test('representedProduct takes precedence over first-orderable fallback', () => {
        setSearchParams('');
        const product = {
            id: 'child-1',
            variationAttributes: [{ id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] }],
            representedProduct: { id: 'variant-2' },
            variants: [
                // First orderable would pick NAVY, but representedProduct points to RED
                { productId: 'variant-1', variationValues: { color: 'NAVY' }, orderable: true },
                { productId: 'variant-2', variationValues: { color: 'RED' }, orderable: true },
            ],
        } as unknown as Product;
        const { result } = renderHook(() => useSelectedVariations({ product, isChildProduct: true }));
        expect(result.current).toEqual({ color: 'RED' });
    });

    describe('selectionsOverride (modal usage)', () => {
        test('uses override values instead of URL params when provided', () => {
            // URL has color=NAVY but override says RED — override wins.
            setSearchParams('color=NAVY&size=L');
            const product = {
                id: 'p1',
                variationAttributes: [
                    { id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] },
                    { id: 'size', name: 'Size', values: [{ value: 'M' }, { value: 'L' }] },
                ],
            } as Product;
            const { result } = renderHook(() =>
                useSelectedVariations({ product, selectionsOverride: { color: 'RED', size: 'M' } })
            );
            expect(result.current).toEqual({ color: 'RED', size: 'M' });
        });

        test('falls back to product defaults for attributes the override does not supply', () => {
            // Override provides color only; size should fall back to product.variationValues.
            setSearchParams('');
            const product = {
                id: 'p1',
                variationAttributes: [
                    { id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] },
                    { id: 'size', name: 'Size', values: [{ value: 'M' }, { value: 'L' }] },
                ],
                variationValues: { color: 'NAVY', size: 'L' },
            } as unknown as Product;
            const { result } = renderHook(() =>
                useSelectedVariations({ product, selectionsOverride: { color: 'RED' } })
            );
            expect(result.current).toEqual({ color: 'RED', size: 'L' });
        });

        test('ignores URL params for child products when override is provided', () => {
            // URL has child-1 nested params, but override should take precedence.
            setSearchParams('child-1=color%3DNAVY%26size%3DL');
            const product = {
                id: 'child-1',
                variationAttributes: [
                    { id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] },
                    { id: 'size', name: 'Size', values: [{ value: 'M' }, { value: 'L' }] },
                ],
            } as Product;
            const { result } = renderHook(() =>
                useSelectedVariations({
                    product,
                    isChildProduct: true,
                    selectionsOverride: { color: 'RED', size: 'M' },
                })
            );
            expect(result.current).toEqual({ color: 'RED', size: 'M' });
        });
    });

    describe('pending navigation (optimistic swatch activation)', () => {
        test('prefers pending navigation params over current URL', () => {
            // User clicked the RED swatch; the canonical URL is still color=NAVY until the
            // navigation settles. The hook should report RED so the swatch flips immediately.
            setSearchParams('color=NAVY');
            setPendingNavigation('color=RED');
            const product = {
                id: 'p1',
                variationAttributes: [{ id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] }],
            } as Product;
            const { result } = renderHook(() => useSelectedVariations({ product }));
            expect(result.current).toEqual({ color: 'RED' });
        });

        test('falls back to current URL when navigation is idle', () => {
            // Sanity check that the new branch only activates when navigation.location is set.
            setSearchParams('color=NAVY');
            setPendingNavigation(null);
            const product = {
                id: 'p1',
                variationAttributes: [{ id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] }],
            } as Product;
            const { result } = renderHook(() => useSelectedVariations({ product }));
            expect(result.current).toEqual({ color: 'NAVY' });
        });

        test('keeps optimistic value through the pid-sync second navigation', () => {
            // After the swatch click navigates to ?color=RED, useCurrentVariant syncs ?pid=...
            // The pending-nav target now carries both color and pid; color must remain RED.
            setSearchParams('color=NAVY');
            setPendingNavigation('color=RED&pid=newVariant');
            const product = {
                id: 'p1',
                variationAttributes: [{ id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] }],
            } as Product;
            const { result } = renderHook(() => useSelectedVariations({ product }));
            expect(result.current).toEqual({ color: 'RED' });
        });

        test('uses pending nav for nested child-product params', () => {
            setSearchParams('child-1=color%3DNAVY');
            setPendingNavigation('child-1=color%3DRED');
            const product = {
                id: 'child-1',
                variationAttributes: [{ id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] }],
            } as Product;
            const { result } = renderHook(() => useSelectedVariations({ product, isChildProduct: true }));
            expect(result.current).toEqual({ color: 'RED' });
        });

        test('selectionsOverride still wins over pending navigation', () => {
            // Modal/controlled contexts must not be perturbed by URL navigations.
            setSearchParams('color=NAVY');
            setPendingNavigation('color=RED');
            const product = {
                id: 'p1',
                variationAttributes: [
                    {
                        id: 'color',
                        name: 'Color',
                        values: [{ value: 'NAVY' }, { value: 'RED' }, { value: 'BLUE' }],
                    },
                ],
            } as Product;
            const { result } = renderHook(() =>
                useSelectedVariations({ product, selectionsOverride: { color: 'BLUE' } })
            );
            expect(result.current).toEqual({ color: 'BLUE' });
        });

        test('default fallbacks still apply for attributes the pending nav does not supply', () => {
            setSearchParams('');
            setPendingNavigation('color=RED');
            const product = {
                id: 'p1',
                variationAttributes: [
                    { id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] },
                    { id: 'size', name: 'Size', values: [{ value: 'L' }, { value: 'M' }] },
                ],
                variationValues: { color: 'NAVY', size: 'L' },
            } as unknown as Product;
            const { result } = renderHook(() => useSelectedVariations({ product }));
            // color comes from pending nav, size falls through to product default.
            expect(result.current).toEqual({ color: 'RED', size: 'L' });
        });
    });
});
