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
import type { Route } from './+types/action.wishlist-remove';
import { type ShopperCustomers } from '@/scapi';
import { data } from 'react-router';
import { getAuth } from '@/middlewares/auth.server';
import { createApiClients } from '@/lib/api-clients.server';
import { getWishlist, type WishlistActionResponse } from '@/lib/api/wishlist.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';

type CustomerProductList = ShopperCustomers.schemas['CustomerProductList'];
type CustomerProductListItem = ShopperCustomers.schemas['CustomerProductListItem'];

/**
 * Remove a product from the customer's wishlist
 *
 * This action supports both itemId and productId parameters because different pages
 * have access to different identifiers:
 * - Product list pages (e.g., search results, category pages) have product IDs but not wishlist item IDs
 * - Wishlist page has access to wishlist item IDs, which allows for more efficient direct deletion
 *
 * @param context - The action function context
 * @param itemId - The wishlist item ID (preferred for direct deletion when available)
 * @param productId - The product ID (fallback when itemId is not available, requires lookup)
 */
async function removeFromWishlist(
    context: Route.ActionArgs['context'],
    itemId?: string,
    productId?: string
): Promise<WishlistActionResponse & { productList?: CustomerProductList }> {
    // Validate that at least one identifier is provided
    if (!itemId && !productId) {
        return {
            success: false,
            error: createActionError({
                code: ErrorCode.REQUIRED_FIELD,
                message: 'Either productId or itemId is required',
            }),
        };
    }

    const session = getAuth(context);
    if (!session.customerId) {
        return {
            success: false,
            error: createActionError({ code: ErrorCode.NOT_AUTHENTICATED, message: 'Session expired' }),
        };
    }

    try {
        const customerId = session.customerId;
        const clients = createApiClients(context);

        const { wishlist, items, id: listId } = await getWishlist(context, customerId);

        if (!wishlist) {
            return {
                success: false,
                error: createActionError({ code: ErrorCode.NOT_FOUND, message: 'Wishlist not found' }),
            };
        }

        if (!listId) {
            return {
                success: false,
                error: createActionError({ code: ErrorCode.NOT_FOUND, message: 'Wishlist ID not found' }),
            };
        }

        // Determine the itemId to use for deletion
        let wishlistItemId: string | undefined = itemId;

        // If itemId not provided, we need to look it up using productId
        //
        // Note: The SFCC deleteCustomerProductListItem API requires an itemId (the unique identifier
        // of the wishlist item), not a productId. We look through the items we already have from
        // getWishlist() to find the item that matches the productId, then extract its itemId to
        // perform the deletion.
        if (!wishlistItemId && productId) {
            const wishlistItem = items.find((item: CustomerProductListItem) => item.productId === productId);

            if (!wishlistItem || !wishlistItem.id) {
                return {
                    success: false,
                    error: createActionError({ code: ErrorCode.NOT_FOUND, message: 'Item not found in wishlist' }),
                };
            }

            wishlistItemId = wishlistItem.id;
        }

        // This should never happen due to early validation, but TypeScript needs this check
        if (!wishlistItemId) {
            return {
                success: false,
                error: createActionError({ code: ErrorCode.NOT_FOUND, message: 'Item not found in wishlist' }),
            };
        }

        // Remove the item from the wishlist using deleteCustomerProductListItem
        // Note: The deleteCustomerProductListItem API returns a 204 No Content response with no data,
        // so we need to refetch the wishlist to get the updated state and return it to the caller
        await clients.shopperCustomers.deleteCustomerProductListItem({
            params: {
                path: {
                    customerId,
                    listId,
                    itemId: wishlistItemId,
                },
            },
        });

        // Fetch the updated wishlist to return it
        const { wishlist: updatedList } = await getWishlist(context, customerId, listId);

        return {
            success: true,
            productList: updatedList ?? undefined,
        };
    } catch (error) {
        return { success: false, error: createActionError({ error }) };
    }
}

/**
 * Server action to remove a product from the wishlist
 */
export async function action({
    request,
    context,
}: Route.ActionArgs): Promise<ReturnType<typeof data<WishlistActionResponse>>> {
    const logger = getLogger(context);

    if (request.method !== 'POST') {
        logger.warn('WishlistRemove: method not allowed', { method: request.method });
        return data(
            {
                success: false,
                error: createActionError({
                    code: ErrorCode.METHOD_NOT_ALLOWED,
                    message: `Expected POST, got ${request.method}`,
                }),
            },
            { status: 405 }
        );
    }

    try {
        const formData = await request.formData();

        // Extract both itemId and productId (at least one is required)
        const rawItemId = formData.get('itemId');
        const itemId = typeof rawItemId === 'string' ? rawItemId.trim() : undefined;

        const rawProductId = formData.get('productId');
        const productId = typeof rawProductId === 'string' ? rawProductId.trim() : undefined;

        // Validate that at least one identifier is provided
        if (!itemId && !productId) {
            logger.warn('WishlistRemove: missing both itemId and productId');
            return data(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.REQUIRED_FIELD,
                        message: 'Either productId or itemId is required',
                    }),
                },
                { status: 400 }
            );
        }

        // Basic validation: IDs should be non-empty strings within reasonable length
        if (
            (itemId && (itemId.length === 0 || itemId.length > 100)) ||
            (productId && (productId.length === 0 || productId.length > 100))
        ) {
            logger.warn('WishlistRemove: invalid ID length', { itemId, productId });
            return data(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.REQUIRED_FIELD,
                        message: 'Either productId or itemId is required',
                    }),
                },
                { status: 400 }
            );
        }

        logger.debug('WishlistRemove: starting', { itemId, productId });

        const result = await removeFromWishlist(context, itemId, productId);

        if (result.success) {
            logger.info('WishlistRemove: succeeded', { itemId, productId });
            return data(result);
        }

        logger.warn('WishlistRemove: operation returned failure', { itemId, productId, error: result.error });
        return data(result, { status: 500 });
    } catch (error) {
        logger.error('WishlistRemove: failed', { error });
        return data({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
