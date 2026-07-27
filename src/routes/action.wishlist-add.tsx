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
import type { Route } from './+types/action.wishlist-add';
import { type ShopperCustomers } from '@/scapi';
import { data } from 'react-router';
import { getAuth } from '@/middlewares/auth.server';
import { createApiClients } from '@/lib/api-clients.server';
import { getOrCreateWishlist, getWishlist, type WishlistActionResponse } from '@/lib/api/wishlist.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';

type CustomerProductList = ShopperCustomers.schemas['CustomerProductList'];
type CustomerProductListItem = ShopperCustomers.schemas['CustomerProductListItem'];

/**
 * Add a product to the customer's wishlist. Works for both guest (gcid) and
 * registered (rcid) sessions — SCAPI's product-list endpoints accept either
 * shopper token type, so the only requirement is a valid customerId on the session.
 */
async function addToWishlist(
    context: Route.ActionArgs['context'],
    productId: string
): Promise<WishlistActionResponse & { productList?: CustomerProductList }> {
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

        // Get or create the wishlist
        // getOrCreateWishlist guarantees a wishlist with a valid id, or throws.
        const wishlist = await getOrCreateWishlist(context, customerId);

        const listId = wishlist.id;
        if (!listId) {
            return {
                success: false,
                error: createActionError({ error: new Error('Wishlist is missing an id') }),
            };
        }

        // The wishlist object already contains all items — no additional API call needed.
        const wishlistItems = wishlist.customerProductListItems ?? [];
        const existingItem = wishlistItems.find((item: CustomerProductListItem) => item.productId === productId);
        if (existingItem) {
            return {
                success: true, // Still success, just informational
                productList: wishlist,
                alreadyInWishlist: true,
            };
        }

        // Add the product to the wishlist using createCustomerProductListItem
        await clients.shopperCustomers.createCustomerProductListItem({
            params: {
                path: {
                    customerId,
                    listId,
                },
            },
            body: {
                productId,
                quantity: 1,
                type: 'product',
                public: false, // Required by API
                priority: 1, // Required by API
            },
        });

        // Fetch the updated wishlist using getWishlist
        // Since we just successfully added to it, the wishlist must exist
        const { wishlist: updatedList } = await getWishlist(context, customerId, listId);

        return {
            success: true,
            productList: updatedList ?? undefined,
            alreadyInWishlist: false,
        };
    } catch (error) {
        return { success: false, error: createActionError({ error }) };
    }
}

/**
 * Server action to add a product to the wishlist
 */
export async function action({
    request,
    context,
}: Route.ActionArgs): Promise<ReturnType<typeof data<WishlistActionResponse>>> {
    const logger = getLogger(context);

    if (request.method !== 'POST') {
        logger.warn('WishlistAdd: method not allowed', { method: request.method });
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
        const rawProductId = formData.get('productId');
        const productId = typeof rawProductId === 'string' ? rawProductId.trim() : '';

        if (!productId) {
            logger.warn('WishlistAdd: missing productId');
            return data(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'productId is required' }),
                },
                { status: 400 }
            );
        }

        // Basic validation: productId should be a non-empty string
        if (productId.length === 0 || productId.length > 100) {
            logger.warn('WishlistAdd: invalid productId', { productId });
            return data(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'productId is required' }),
                },
                { status: 400 }
            );
        }

        logger.debug('WishlistAdd: starting', { productId });

        const result = await addToWishlist(context, productId);

        if (result.success) {
            logger.info('WishlistAdd: succeeded', { productId, alreadyInWishlist: result.alreadyInWishlist });
            return data(result);
        }

        logger.warn('WishlistAdd: operation returned failure', { productId, error: result.error });
        return data(result, { status: 500 });
    } catch (error) {
        logger.error('WishlistAdd: failed', { error });
        return data({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
