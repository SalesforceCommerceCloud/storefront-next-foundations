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
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NormalizedApiError } from '@/lib/api/normalized-api-error';
import { getAuth } from '@/middlewares/auth.server';
import { getWishlist } from '@/lib/api/wishlist.server';
import { createTestContext } from '@/lib/test-utils';
import { fetchWishlistProductIdsForCart } from './cart-wishlist.server';

vi.mock('@/middlewares/auth.server', () => ({
    getAuth: vi.fn(),
}));

vi.mock('@/lib/api/wishlist.server', () => ({
    getWishlist: vi.fn(),
}));

describe('fetchWishlistProductIdsForCart', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('returns [] for session without an access token', async () => {
        vi.mocked(getAuth).mockReturnValue({ userType: 'guest', customerId: 'guest-1' } as any);
        const context = createTestContext();

        const result = await fetchWishlistProductIdsForCart(context);

        expect(result).toEqual([]);
        expect(getWishlist).not.toHaveBeenCalled();
    });

    test('returns guest wishlist product IDs when guest session is usable', async () => {
        vi.mocked(getAuth).mockReturnValue({
            userType: 'guest',
            customerId: 'guest-1',
            accessToken: 'tok',
            accessTokenExpiry: Date.now() + 60_000,
        } as any);
        vi.mocked(getWishlist).mockResolvedValue({
            wishlist: { id: 'list-g', listId: 'list-g' } as any,
            items: [{ productId: 'sku-g1', id: 'item-1' } as any],
            id: 'list-g',
        });
        const context = createTestContext();

        const result = await fetchWishlistProductIdsForCart(context);

        expect(result).toEqual(['sku-g1']);
        expect(getWishlist).toHaveBeenCalledWith(context, 'guest-1');
    });

    test('returns [] when registered user has no customerId', async () => {
        vi.mocked(getAuth).mockReturnValue({
            userType: 'registered',
            customerId: undefined,
            accessToken: 'tok',
            accessTokenExpiry: Date.now() + 60_000,
        } as any);
        const context = createTestContext();

        const result = await fetchWishlistProductIdsForCart(context);

        expect(result).toEqual([]);
        expect(getWishlist).not.toHaveBeenCalled();
    });

    test('returns [] when registered user access token has expired', async () => {
        vi.mocked(getAuth).mockReturnValue({
            userType: 'registered',
            customerId: 'cust-1',
            accessToken: 'tok',
            accessTokenExpiry: Date.now() - 1_000,
        } as any);
        const context = createTestContext();

        const result = await fetchWishlistProductIdsForCart(context);

        expect(result).toEqual([]);
        expect(getWishlist).not.toHaveBeenCalled();
    });

    test('returns product IDs for registered user with wishlist items', async () => {
        vi.mocked(getAuth).mockReturnValue({
            userType: 'registered',
            customerId: 'cust-1',
            accessToken: 'tok',
            accessTokenExpiry: Date.now() + 60_000,
        } as any);
        vi.mocked(getWishlist).mockResolvedValue({
            wishlist: { id: 'list-1', listId: 'list-1' } as any,
            items: [
                { productId: 'sku-1', id: 'item-1' } as any,
                { productId: 'sku-2', id: 'item-2' } as any,
                { productId: '', id: 'item-3' } as any,
                { productId: '   ', id: 'item-4' } as any,
                { id: 'item-5' } as any,
            ],
            id: 'list-1',
        });
        const context = createTestContext();

        const result = await fetchWishlistProductIdsForCart(context);

        expect(result).toEqual(['sku-1', 'sku-2']);
    });

    test('returns [] when getWishlist returns empty items', async () => {
        vi.mocked(getAuth).mockReturnValue({
            userType: 'registered',
            customerId: 'cust-1',
            accessToken: 'tok',
            accessTokenExpiry: Date.now() + 60_000,
        } as any);
        vi.mocked(getWishlist).mockResolvedValue({ wishlist: null, items: [], id: null });
        const context = createTestContext();

        const result = await fetchWishlistProductIdsForCart(context);

        expect(result).toEqual([]);
    });

    test('propagates NormalizedApiError when getWishlist rejects (no swallowing)', async () => {
        vi.mocked(getAuth).mockReturnValue({
            userType: 'registered',
            customerId: 'cust-1',
            accessToken: 'tok',
            accessTokenExpiry: Date.now() + 60_000,
        } as any);
        const apiError = new NormalizedApiError(new TypeError('Network failure'));
        vi.mocked(getWishlist).mockRejectedValue(apiError);
        const context = createTestContext();

        await expect(fetchWishlistProductIdsForCart(context)).rejects.toBe(apiError);
    });
});
