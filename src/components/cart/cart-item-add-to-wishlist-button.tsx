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
import { type ReactElement } from 'react';
import type { ShopperSearch } from '@/scapi';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/hooks/use-wishlist';
import type { EnrichedProductItem } from '@/lib/product/product-utils';

interface CartItemAddToWishlistButtonProps {
    product: EnrichedProductItem;
    /** Product IDs in the shopper wishlist from the cart loader (hydrates after refresh). */
    wishlistProductIds?: readonly string[];
    className?: string;
}

function toWishlistSearchHit(product: EnrichedProductItem): ShopperSearch.schemas['ProductSearchHit'] | null {
    const productId = product.productId ?? product.id;
    if (!productId || typeof productId !== 'string') {
        return null;
    }
    const productName = product.productName ?? product.name;
    return { productId, productName: productName ?? undefined };
}

/**
 * Link-style control that adds or removes the cart line's product from the shopper wishlist
 * via the same SCAPI-backed actions as the PDP wishlist control (persisted for signed-in customers).
 */
export function CartItemAddToWishlistButton({
    product,
    wishlistProductIds,
    className = '',
}: CartItemAddToWishlistButtonProps): ReactElement | null {
    const { t } = useTranslation('product');
    const { toggleWishlist, isItemInWishlist, isLoading, pendingOperation } = useWishlist({
        initialProductIds: wishlistProductIds,
    });

    const hit = toWishlistSearchHit(product);

    const inWishlist = hit ? isItemInWishlist(hit) : false;

    const isRemoveMode = (inWishlist && pendingOperation !== 'add') || pendingOperation === 'remove';

    if (!hit || !product.itemId) {
        return null;
    }

    if (isRemoveMode) {
        return (
            <Button
                type="button"
                variant="link"
                size="sm"
                disabled={isLoading}
                className={`text-sm font-medium leading-5 text-primary cursor-pointer hover:no-underline ${className}`}
                data-testid={`cart-remove-wishlist-${product.itemId}`}
                aria-label={t('removeFromWishlist')}
                aria-busy={isLoading}
                onClick={() => {
                    void toggleWishlist(hit, undefined, 'cart');
                }}>
                {isLoading && pendingOperation === 'remove' ? t('removingFromWishlist') : t('removeFromWishlist')}
            </Button>
        );
    }

    return (
        <Button
            type="button"
            variant="link"
            size="sm"
            disabled={isLoading}
            className={`text-xs cursor-pointer hover:no-underline ${className}`}
            data-testid={`cart-add-wishlist-${product.itemId}`}
            aria-label={t('addToWishlist')}
            aria-busy={isLoading}
            onClick={() => {
                void toggleWishlist(hit, undefined, 'cart');
            }}>
            {isLoading && pendingOperation === 'add' ? t('addingToWishlist') : t('addToWishlist')}
        </Button>
    );
}
