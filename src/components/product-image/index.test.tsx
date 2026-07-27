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
import { describe, test, expect, vi, type Mock } from 'vitest';
import { render } from '@testing-library/react';
import { type ShopperSearch } from '@/scapi';
import { useDynamicImageContext } from '@/providers/dynamic-image';
import { ProductImageContainer } from './index';

vi.mock('@/components/link', () => ({
    Link: ({ children, to, ...props }: any) => (
        <a href={to} {...props}>
            {children}
        </a>
    ),
}));

vi.mock('@/lib/product/product-utils', async (importOriginal) => {
    const original = await importOriginal<object>();
    return {
        ...original,
        getImagesForColor: vi.fn(() => [
            {
                link: 'https://example.com/default1.jpg',
                disBaseLink: 'https://example.com/default1.jpg',
                alt: 'Default Image 1',
            },
            {
                link: 'https://example.com/default2.jpg',
                disBaseLink: 'https://example.com/default2.jpg',
                alt: 'Default Image 2',
            },
        ]),
    };
});

vi.mock('@/providers/dynamic-image', () => ({
    useDynamicImageContext: vi.fn().mockReturnValue(null),
}));

vi.mock('./product-image', () => ({
    ProductImage: ({ src, alt }: any) => <img src={src} alt={alt} data-testid="product-image" />,
}));

const mockProduct: ShopperSearch.schemas['ProductSearchHit'] = {
    productId: 'test-product',
    productName: 'Test Product',
    price: 99.99,
    variationAttributes: [
        {
            id: 'color',
            values: [
                { value: 'navy', name: 'Navy' },
                { value: 'red', name: 'Red' },
                { value: 'blue', name: 'Blue' },
                { value: 'black', name: 'Black' },
            ],
        },
    ],
};

describe('ProductImageContainer Dynamic Image Context Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useDynamicImageContext as Mock).mockReturnValue(null);
    });

    test('calls addSource with product image URL when context is available', async () => {
        const mockAddSource = vi.fn();
        (useDynamicImageContext as Mock).mockReturnValue({
            addSource: mockAddSource,
            hasSource: vi.fn(),
        });

        const { getImagesForColor } = await import('@/lib/product/product-utils');
        render(<ProductImageContainer product={mockProduct} />);

        expect(mockAddSource).toHaveBeenCalledWith('https://example.com/default1.jpg');
        expect(getImagesForColor).toHaveBeenCalledWith(mockProduct, null, 'medium');
    });

    test('does not fail when no context is available', async () => {
        const { getImagesForColor } = await import('@/lib/product/product-utils');
        render(<ProductImageContainer product={mockProduct} />);
        expect(getImagesForColor).toHaveBeenCalledWith(mockProduct, null, 'medium');
    });

    test('does not call addSource when currentImageUrl is undefined', async () => {
        const mockAddSource = vi.fn();
        (useDynamicImageContext as Mock).mockReturnValue({
            addSource: mockAddSource,
            hasSource: vi.fn(),
        });

        const { getImagesForColor } = await import('@/lib/product/product-utils');
        vi.mocked(getImagesForColor).mockReturnValueOnce([]);

        render(<ProductImageContainer product={mockProduct} />);

        expect(mockAddSource).not.toHaveBeenCalled();
    });

    test('falls back to product.image when getImagesForColor returns empty array', async () => {
        const mockAddSource = vi.fn();
        (useDynamicImageContext as Mock).mockReturnValue({
            addSource: mockAddSource,
            hasSource: vi.fn(),
        });

        const { getImagesForColor } = await import('@/lib/product/product-utils');
        vi.mocked(getImagesForColor).mockReturnValueOnce([]);

        const productWithFallbackImage = {
            ...mockProduct,
            image: {
                link: 'https://example.com/fallback.jpg',
                disBaseLink: 'https://example.com/fallback-dis.jpg',
                alt: 'Fallback Image',
            },
        };

        render(<ProductImageContainer product={productWithFallbackImage} />);

        expect(getImagesForColor).toHaveBeenCalled();
        expect(mockAddSource).toHaveBeenCalledWith('https://example.com/fallback-dis.jpg');
    });
});
