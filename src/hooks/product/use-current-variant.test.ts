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
import { useCurrentVariant } from './use-current-variant';
import type { ShopperProducts } from '@/scapi';

// Mock react-router so we can drive useSearchParams + observe setSearchParams calls.
let mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();
type NavState = { state: 'idle' | 'loading'; location: { pathname: string; search: string } | undefined };
let mockNavigationState: NavState = { state: 'idle', location: undefined };
vi.mock('react-router', () => ({
    href: (path: string) => path,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
    useNavigation: () => mockNavigationState,
}));

const setSearchParams = (search: string) => {
    mockSearchParams = new URLSearchParams(search);
};

const setPendingNavigation = (search: string | null) => {
    mockNavigationState =
        search === null
            ? { state: 'idle', location: undefined }
            : { state: 'loading', location: { pathname: '/', search } };
};

type Product = ShopperProducts.schemas['Product'];

const masterProduct: Product = {
    id: 'master-1',
    variationAttributes: [
        { id: 'color', name: 'Color', values: [{ value: 'NAVY' }, { value: 'RED' }] },
        { id: 'size', name: 'Size', values: [{ value: 'M' }, { value: 'L' }] },
    ],
    variants: [
        { productId: 'v1', variationValues: { color: 'NAVY', size: 'M' }, orderable: true },
        { productId: 'v2', variationValues: { color: 'RED', size: 'L' }, orderable: true },
    ],
} as unknown as Product;

describe('useCurrentVariant', () => {
    beforeEach(() => {
        mockSetSearchParams.mockClear();
        mockSearchParams = new URLSearchParams();
        setPendingNavigation(null);
    });

    describe('variant resolution', () => {
        test('returns the variant matching all currently selected attributes', () => {
            setSearchParams('color=RED&size=L');
            const { result } = renderHook(() => useCurrentVariant({ product: masterProduct }));
            expect(result.current?.productId).toBe('v2');
        });

        test('returns undefined when not enough attributes are selected to identify a variant', () => {
            setSearchParams('color=NAVY');
            const { result } = renderHook(() => useCurrentVariant({ product: masterProduct }));
            // color=NAVY alone matches one variant (v1) — exactly one match resolves.
            expect(result.current?.productId).toBe('v1');
        });

        test('returns undefined when no variant matches the current selection', () => {
            // color=NAVY + size=L: NAVY is on v1 (size=M), no NAVY+L variant exists → 0 matches.
            setSearchParams('color=NAVY&size=L');
            const { result } = renderHook(() => useCurrentVariant({ product: masterProduct }));
            expect(result.current).toBeUndefined();
        });
    });

    describe('selectionsOverride (modal usage)', () => {
        test('uses override values instead of URL params to resolve variant', () => {
            // URL says NAVY+M (would resolve to v1) — override says RED+L → v2.
            setSearchParams('color=NAVY&size=M');
            const { result } = renderHook(() =>
                useCurrentVariant({
                    product: masterProduct,
                    selectionsOverride: { color: 'RED', size: 'L' },
                })
            );
            expect(result.current?.productId).toBe('v2');
        });

        test('does NOT update the URL pid param when override is supplied (modal usage)', () => {
            // URL has no pid; selectionsOverride resolves a variant. The hook must not call
            // setSearchParams — that's the whole point of override mode (no URL pollution,
            // no route revalidation in the wrapping cart route).
            setSearchParams('');
            renderHook(() =>
                useCurrentVariant({
                    product: masterProduct,
                    selectionsOverride: { color: 'RED', size: 'L' },
                })
            );
            expect(mockSetSearchParams).not.toHaveBeenCalled();
        });
    });

    describe('URL pid update (PDP usage)', () => {
        test('writes the resolved variant id to the URL pid param when no override is supplied', () => {
            setSearchParams('color=RED&size=L');
            renderHook(() => useCurrentVariant({ product: masterProduct }));
            expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
            const [paramsArg] = mockSetSearchParams.mock.calls[0];
            expect((paramsArg as URLSearchParams).get('pid')).toBe('v2');
        });

        test('skips the URL update when isChildProduct is true', () => {
            setSearchParams('color=RED&size=L');
            renderHook(() => useCurrentVariant({ product: masterProduct, isChildProduct: true }));
            expect(mockSetSearchParams).not.toHaveBeenCalled();
        });

        test('skips the URL update when the current pid already matches', () => {
            setSearchParams('color=RED&size=L&pid=v2');
            renderHook(() => useCurrentVariant({ product: masterProduct }));
            expect(mockSetSearchParams).not.toHaveBeenCalled();
        });

        test('defers the pid sync while a swatch navigation is pending', () => {
            // Canonical URL is the old variant. The user just clicked the RED swatch and the
            // NavLink's nav to ?color=RED&size=L is in flight — useSelectedVariations has
            // optimistically flipped to RED/L, so currentVariant points at v2. If the effect
            // fired now, it would build a new URL from the canonical (color=NAVY) snapshot,
            // setSearchParams would supersede the in-flight nav, and the user's color choice
            // would be lost. The hook must wait until navigation settles.
            setSearchParams('color=NAVY&size=M&pid=v1');
            setPendingNavigation('color=RED&size=L');
            renderHook(() => useCurrentVariant({ product: masterProduct }));
            expect(mockSetSearchParams).not.toHaveBeenCalled();
        });
    });
});
