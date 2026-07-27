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
import type { LoaderFunctionArgs } from 'react-router';
import { getAuth } from '@/middlewares/auth.server';
import { hasUsableShopperSession } from '@/middlewares/auth.utils';
import { getWishlist } from '@/lib/api/wishlist.server';

/**
 * Loads wishlist product IDs for the current shopper so cart line wishlist UI matches
 * server state after refresh. Works for both guest and registered shoppers; SCAPI's
 * customer-product-list endpoints accept guest tokens.
 *
 * Composes `getWishlist` (which throws `NormalizedApiError` on failure) without catching.
 * Errors propagate to the cart route's `<Await errorElement={null}>` for silent
 * degradation (cart still renders; wishlist toggle defaults to "Add to wishlist" mode).
 *
 * Sessions without a valid access token or customerId return `[]` without calling SCAPI.
 */
export async function fetchWishlistProductIdsForCart(context: LoaderFunctionArgs['context']): Promise<string[]> {
    const session = getAuth(context);

    if (!hasUsableShopperSession(session)) {
        return [];
    }

    const { items } = await getWishlist(context, session.customerId);
    const wishlistItems = Array.isArray(items) ? items : [];
    return wishlistItems
        .map((item: { productId?: string }) => item.productId)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
}
