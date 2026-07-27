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
import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { CartItemAddToWishlistButton } from './cart-item-add-to-wishlist-button';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import type { EnrichedProductItem } from '@/lib/product/product-utils';

const { t } = getTranslation();

const { mockToggleWishlist, mockIsItemInWishlist } = vi.hoisted(() => ({
    mockToggleWishlist: vi.fn().mockResolvedValue(undefined),
    mockIsItemInWishlist: vi.fn().mockReturnValue(false),
}));

vi.mock('@/hooks/use-wishlist', () => ({
    useWishlist: (_options?: { initialProductIds?: readonly string[] }) => ({
        wishlist: [],
        isLoading: false,
        pendingOperation: null,
        isItemInWishlist: mockIsItemInWishlist,
        toggleWishlist: mockToggleWishlist,
    }),
}));

const baseProduct = {
    itemId: 'line-1',
    productId: 'sku-1',
    productName: 'Test Product',
    quantity: 1,
} as EnrichedProductItem;

function renderButton(product: EnrichedProductItem) {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: (
                    <AllProvidersWrapper>
                        <CartItemAddToWishlistButton product={product} />
                    </AllProvidersWrapper>
                ),
            },
        ],
        { initialEntries: ['/'] }
    );
    return render(<RouterProvider router={router} />);
}

describe('CartItemAddToWishlistButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsItemInWishlist.mockReturnValue(false);
    });

    test('renders nothing when product id cannot be resolved', () => {
        renderButton({ itemId: 'x', quantity: 1 } as EnrichedProductItem);
        expect(screen.queryByTestId('cart-add-wishlist-x')).not.toBeInTheDocument();
        expect(screen.queryByText(t('product:addToWishlist'))).not.toBeInTheDocument();
    });

    test('renders Add to Wishlist and calls toggle on click', () => {
        renderButton(baseProduct);
        fireEvent.click(screen.getByRole('button', { name: t('product:addToWishlist') }));
        expect(mockToggleWishlist).toHaveBeenCalledWith(
            expect.objectContaining({ productId: 'sku-1', productName: 'Test Product' }),
            undefined,
            'cart'
        );
    });

    test('renders Remove from wishlist when already in wishlist', () => {
        mockIsItemInWishlist.mockReturnValue(true);
        renderButton(baseProduct);
        expect(screen.getByTestId('cart-remove-wishlist-line-1')).toHaveTextContent(t('product:removeFromWishlist'));
        expect(screen.queryByRole('button', { name: t('product:addToWishlist') })).not.toBeInTheDocument();
    });
});
