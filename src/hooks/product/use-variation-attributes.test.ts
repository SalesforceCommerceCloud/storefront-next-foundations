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

/**
 * useVariationAttributes Hook Tests
 *
 * Tests the useVariationAttributes hook functionality including variation attribute
 * processing, URL generation, image swatch handling, and orderability checks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVariationAttributes } from './use-variation-attributes';
import { useSelectedVariations } from './use-selected-variations';
import { useLocation } from 'react-router';
import { findImageGroupBy } from '@/lib/product/image-groups-utils';
import type { ShopperProducts } from '@/scapi';

vi.mock('react-router', () => ({
    href: (path: string) => path,
    useLocation: vi.fn(),
}));

vi.mock('./use-selected-variations', () => ({
    useSelectedVariations: vi.fn(),
}));

vi.mock('@/lib/product/image-groups-utils', () => ({
    findImageGroupBy: vi.fn(),
}));

const createMockProduct = (
    variationAttributes?: ShopperProducts.schemas['VariationAttribute'][],
    variants?: ShopperProducts.schemas['Variant'][],
    imageGroups?: ShopperProducts.schemas['ImageGroup'][]
): ShopperProducts.schemas['Product'] => {
    return {
        id: 'test-product-id',
        name: 'Test Product',
        variationAttributes,
        variants,
        imageGroups,
    } as ShopperProducts.schemas['Product'];
};

const createMockVariationAttribute = (
    id: string,
    name: string,
    values: Array<{ name: string; value: string; orderable?: boolean }>
): ShopperProducts.schemas['VariationAttribute'] => {
    return {
        id,
        name,
        values,
    } as ShopperProducts.schemas['VariationAttribute'];
};

const createMockVariant = (
    variationValues: Record<string, string>,
    orderable: boolean = true
): ShopperProducts.schemas['Variant'] => {
    return {
        productId: 'variant-id',
        variationValues,
        orderable,
    } as ShopperProducts.schemas['Variant'];
};

describe('useVariationAttributes', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useLocation).mockReturnValue({
            pathname: '/product/test-product-id',
            search: '',
        } as any);

        vi.mocked(useSelectedVariations).mockReturnValue({});
    });

    describe('empty states', () => {
        it('should return empty array when product has no variation attributes', () => {
            const product = createMockProduct();

            const { result } = renderHook(() => useVariationAttributes({ product }));

            expect(result.current).toEqual([]);
        });

        it('should return empty array when product has no id', () => {
            const product = createMockProduct([
                createMockVariationAttribute('color', 'Color', [{ name: 'Red', value: 'RED' }]),
            ]);

            (product as any).id = undefined;

            const { result } = renderHook(() => useVariationAttributes({ product }));

            expect(result.current).toEqual([]);
        });
    });

    describe('variation attribute processing', () => {
        it('should process variation attributes correctly', () => {
            const product = createMockProduct([
                createMockVariationAttribute('color', 'Color', [
                    { name: 'Red', value: 'RED' },
                    { name: 'Blue', value: 'BLUE' },
                ]),
            ]);

            const { result } = renderHook(() => useVariationAttributes({ product }));

            expect(result.current).toHaveLength(1);
            expect(result.current[0].id).toBe('color');
            expect(result.current[0].name).toBe('Color');
            expect(result.current[0].values).toHaveLength(2);
        });

        it('should handle multiple variation attributes', () => {
            const product = createMockProduct([
                createMockVariationAttribute('color', 'Color', [{ name: 'Red', value: 'RED' }]),
                createMockVariationAttribute('size', 'Size', [
                    { name: 'Small', value: 'S' },
                    { name: 'Large', value: 'L' },
                ]),
            ]);

            const { result } = renderHook(() => useVariationAttributes({ product }));

            expect(result.current).toHaveLength(2);
            expect(result.current[0].id).toBe('color');
            expect(result.current[1].id).toBe('size');
        });
    });

    describe('selected value detection', () => {
        it('should detect selected value from URL parameters', () => {
            const product = createMockProduct([
                createMockVariationAttribute('color', 'Color', [
                    { name: 'Red', value: 'RED' },
                    { name: 'Blue', value: 'BLUE' },
                ]),
            ]);

            vi.mocked(useSelectedVariations).mockReturnValue({ color: 'RED' });

            const { result } = renderHook(() => useVariationAttributes({ product }));

            expect(result.current[0].selectedValue.value).toBe('RED');
            expect(result.current[0].selectedValue.name).toBe('Red');
            expect(result.current[0].values[0].selected).toBe(true);
            expect(result.current[0].values[1].selected).toBe(false);
        });

        it('should handle no selected value', () => {
            const product = createMockProduct([
                createMockVariationAttribute('color', 'Color', [{ name: 'Red', value: 'RED' }]),
            ]);

            vi.mocked(useSelectedVariations).mockReturnValue({});

            const { result } = renderHook(() => useVariationAttributes({ product }));

            expect(result.current[0].selectedValue.value).toBeUndefined();
            expect(result.current[0].selectedValue.name).toBeUndefined();
            expect(result.current[0].values[0].selected).toBe(false);
        });
    });

    describe('URL generation', () => {
        it('should generate correct hrefs for variation values', () => {
            const product = createMockProduct([
                createMockVariationAttribute('color', 'Color', [{ name: 'Red', value: 'RED' }]),
            ]);

            vi.mocked(useLocation).mockReturnValue({
                pathname: '/product/test-product-id',
                search: '',
            } as any);

            const { result } = renderHook(() => useVariationAttributes({ product }));

            expect(result.current[0].values[0].href).toContain('color=RED');
        });

        it('should preserve existing URL parameters when building hrefs', () => {
            const product = createMockProduct([
                createMockVariationAttribute('size', 'Size', [{ name: 'Large', value: 'L' }]),
            ]);

            vi.mocked(useLocation).mockReturnValue({
                pathname: '/product/test-product-id',
                search: '?color=RED',
            } as any);

            vi.mocked(useSelectedVariations).mockReturnValue({ color: 'RED' });

            const { result } = renderHook(() => useVariationAttributes({ product }));

            expect(result.current[0].values[0].href).toContain('color=RED');
            expect(result.current[0].values[0].href).toContain('size=L');
        });

        it('should handle child product URL parameters', () => {
            const product = createMockProduct([
                createMockVariationAttribute('color', 'Color', [{ name: 'Red', value: 'RED' }]),
            ]);

            vi.mocked(useLocation).mockReturnValue({
                pathname: '/product/test-product-id',
                search: `?test-product-id=color%3DRED`,
            } as any);

            vi.mocked(useSelectedVariations).mockReturnValue({ color: 'RED' });

            const { result } = renderHook(() => useVariationAttributes({ product, isChildProduct: true }));

            expect(result.current[0].values[0].href).toContain('test-product-id');
        });
    });

    describe('image swatch handling', () => {
        it('should find swatch images for color attributes', () => {
            const mockImage = {
                link: 'https://example.com/swatch.jpg',
                alt: 'Red Swatch',
            } as ShopperProducts.schemas['Image'];

            const mockImageGroup = {
                viewType: 'swatch',
                images: [mockImage],
            } as ShopperProducts.schemas['ImageGroup'];

            const product = createMockProduct(
                [createMockVariationAttribute('color', 'Color', [{ name: 'Red', value: 'RED' }])],
                undefined,
                [mockImageGroup]
            );

            vi.mocked(findImageGroupBy).mockReturnValue(mockImageGroup);

            const { result } = renderHook(() => useVariationAttributes({ product }));

            expect(findImageGroupBy).toHaveBeenCalledWith(
                [mockImageGroup],
                expect.objectContaining({
                    viewType: 'swatch',
                    selectedVariationAttributes: { color: 'RED' },
                })
            );
            expect(result.current[0].values[0].image).toBe(mockImage);
        });

        it('should not find swatch images for non-color attributes', () => {
            const product = createMockProduct([
                createMockVariationAttribute('size', 'Size', [{ name: 'Large', value: 'L' }]),
            ]);

            const { result } = renderHook(() => useVariationAttributes({ product }));

            expect(findImageGroupBy).not.toHaveBeenCalled();
            expect(result.current[0].values[0].image).toBeUndefined();
        });
    });

    describe('orderability checks', () => {
        it('should mark values as orderable when variants exist', () => {
            const product = createMockProduct(
                [createMockVariationAttribute('color', 'Color', [{ name: 'Red', value: 'RED' }])],
                [createMockVariant({ color: 'RED' }, true)]
            );

            const { result } = renderHook(() => useVariationAttributes({ product }));

            expect(result.current[0].values[0].orderable).toBe(true);
            expect(result.current[0].values[0].disabled).toBe(false);
        });

        it('should mark values as not orderable when no matching variants', () => {
            const product = createMockProduct(
                [
                    createMockVariationAttribute('color', 'Color', [
                        { name: 'Red', value: 'RED' },
                        { name: 'Blue', value: 'BLUE' },
                    ]),
                ],
                [createMockVariant({ color: 'RED' }, true)]
            );

            const { result } = renderHook(() => useVariationAttributes({ product }));

            expect(result.current[0].values[0].orderable).toBe(true); // RED has variant
            expect(result.current[0].values[1].orderable).toBe(false); // BLUE has no variant
            expect(result.current[0].values[1].disabled).toBe(true);
        });

        it('should mark values as orderable when product has no variants', () => {
            const product = createMockProduct([
                createMockVariationAttribute('color', 'Color', [{ name: 'Red', value: 'RED' }]),
            ]);

            const { result } = renderHook(() => useVariationAttributes({ product }));

            expect(result.current[0].values[0].orderable).toBe(true);
        });

        it('should check orderability with combined variation parameters', () => {
            const product = createMockProduct(
                [
                    createMockVariationAttribute('color', 'Color', [{ name: 'Red', value: 'RED' }]),
                    createMockVariationAttribute('size', 'Size', [{ name: 'Large', value: 'L' }]),
                ],
                [
                    createMockVariant({ color: 'RED', size: 'L' }, true),
                    createMockVariant({ color: 'RED', size: 'M' }, true),
                ]
            );

            vi.mocked(useSelectedVariations).mockReturnValue({ color: 'RED' });

            const { result } = renderHook(() => useVariationAttributes({ product }));

            // Size L should be orderable because there's a variant with color=RED and size=L
            expect(result.current[1].values[0].orderable).toBe(true);
        });
    });

    describe('value name fallback', () => {
        it('should use value as name when name is missing', () => {
            const product = createMockProduct([
                createMockVariationAttribute('color', 'Color', [{ name: '', value: 'RED' }]),
            ]);

            const { result } = renderHook(() => useVariationAttributes({ product }));

            expect(result.current[0].values[0].name).toBe('RED');
        });
    });
});
