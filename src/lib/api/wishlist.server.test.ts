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
import { ApiError } from '@/scapi';
import { NormalizedApiError } from './normalized-api-error';
import { siteContext } from '@salesforce/storefront-next-runtime/site-context';
import { TrackingConsent } from '@/types/tracking-consent';
import { mockConfig } from '@/test-utils/config';
import {
    appendWishlistMergeFlag,
    captureGuestWishlistSnapshot,
    getOrCreateWishlist,
    getWishlist,
    loadWishlistPageData,
    mergeWishlist,
    type GuestWishlistSnapshot,
} from './wishlist.server';

const mockGetCustomerProductList = vi.fn();
const mockGetCustomerProductLists = vi.fn();
const mockCreateCustomerProductList = vi.fn();
const mockCreateCustomerProductListItem = vi.fn();
const mockDeleteCustomerProductList = vi.fn();
const mockLoggerError = vi.fn();
const mockLoggerWarn = vi.fn();
const mockLoggerInfo = vi.fn();
const mockGetAuth = vi.fn();

vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: vi.fn(() => ({
        shopperCustomers: {
            getCustomerProductList: mockGetCustomerProductList,
            getCustomerProductLists: mockGetCustomerProductLists,
            createCustomerProductList: mockCreateCustomerProductList,
            createCustomerProductListItem: mockCreateCustomerProductListItem,
            deleteCustomerProductList: mockDeleteCustomerProductList,
        },
    })),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        error: mockLoggerError,
        warn: mockLoggerWarn,
        info: mockLoggerInfo,
        debug: vi.fn(),
    })),
}));

vi.mock('@/middlewares/auth.server', () => ({
    getAuth: (...args: unknown[]) => mockGetAuth(...args),
}));

// setWishlistMergeCookie -> getCookieConfig -> resolveCookieDomain reads app config via
// getConfig(), as does the product fetcher (config.search.products.hits.limit). getConfig()
// throws when app config is absent from the router context, so provide the full mock config.
vi.mock('@salesforce/storefront-next-runtime/config', () => ({
    getConfig: vi.fn(() => mockConfig),
}));

const usableSession = {
    userType: 'guest' as const,
    customerId: 'cust-1',
    accessToken: 'tok',
    accessTokenExpiry: Date.now() + 60_000,
};

describe('getWishlist — list-search branch (no listId)', () => {
    const mockContext = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockLoggerError.mockClear();
    });

    test('returns the wish_list product list when present', async () => {
        const wishlist = {
            id: 'list-1',
            type: 'wish_list',
            customerProductListItems: [{ productId: 'sku-1', id: 'item-1' }],
        };
        mockGetCustomerProductLists.mockResolvedValue({ data: { data: [wishlist] } });

        const result = await getWishlist(mockContext, 'cust-1');

        expect(result.wishlist).toEqual(wishlist);
        expect(result.items).toEqual(wishlist.customerProductListItems);
        expect(result.id).toBe('list-1');
    });

    test('returns null shape when no wish_list type list is found (success path)', async () => {
        mockGetCustomerProductLists.mockResolvedValue({ data: { data: [{ id: 'other-1', type: 'gift_registry' }] } });

        const result = await getWishlist(mockContext, 'cust-1');

        expect(result).toEqual({ wishlist: null, items: [], id: null });
    });

    test('throws NormalizedApiError when API call fails with ApiError', async () => {
        const apiError = new ApiError({
            status: 401,
            statusText: 'Unauthorized',
            headers: new Headers(),
            body: { type: 'Unauthorized', title: 'Unauthorized', detail: 'Invalid credentials' },
            rawBody: JSON.stringify({ detail: 'Invalid credentials' }),
            url: 'https://api.example.com/customers/cust-1/product-lists',
            method: 'GET',
        });
        mockGetCustomerProductLists.mockRejectedValue(apiError);

        await expect(getWishlist(mockContext, 'cust-1')).rejects.toThrow(NormalizedApiError);
        await expect(getWishlist(mockContext, 'cust-1')).rejects.toMatchObject({ status: 401 });
    });

    test('throws NormalizedApiError when API call fails with non-API error', async () => {
        mockGetCustomerProductLists.mockRejectedValue(new TypeError('Network failure'));

        await expect(getWishlist(mockContext, 'cust-1')).rejects.toThrow(NormalizedApiError);
        await expect(getWishlist(mockContext, 'cust-1')).rejects.toThrow('Network failure');
    });

    test('logs operation context when API call fails', async () => {
        mockGetCustomerProductLists.mockRejectedValue(new Error('boom'));

        await getWishlist(mockContext, 'cust-1').catch(() => {});

        expect(mockLoggerError).toHaveBeenCalledWith(
            'shopperCustomers.getCustomerProductLists failed',
            expect.objectContaining({ customerId: 'cust-1' })
        );
    });
});

describe('getWishlist — listId-direct branch', () => {
    const mockContext = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockLoggerError.mockClear();
    });

    test('returns the wishlist when fetched directly by listId', async () => {
        const wishlist = {
            id: 'list-1',
            type: 'wish_list',
            customerProductListItems: [{ productId: 'sku-1', id: 'item-1' }],
        };
        mockGetCustomerProductList.mockResolvedValue({ data: wishlist });

        const result = await getWishlist(mockContext, 'cust-1', 'list-1');

        expect(result.wishlist).toEqual(wishlist);
        expect(result.items).toEqual(wishlist.customerProductListItems);
        expect(result.id).toBe('list-1');
        expect(mockGetCustomerProductLists).not.toHaveBeenCalled();
    });

    test('throws NormalizedApiError when listId-direct API call fails with ApiError', async () => {
        const apiError = new ApiError({
            status: 404,
            statusText: 'Not Found',
            headers: new Headers(),
            body: { type: 'Not Found', title: 'Not Found', detail: 'Wishlist not found' },
            rawBody: JSON.stringify({ detail: 'Wishlist not found' }),
            url: 'https://api.example.com/customers/cust-1/product-lists/list-1',
            method: 'GET',
        });
        mockGetCustomerProductList.mockRejectedValue(apiError);

        await expect(getWishlist(mockContext, 'cust-1', 'list-1')).rejects.toThrow(NormalizedApiError);
        await expect(getWishlist(mockContext, 'cust-1', 'list-1')).rejects.toMatchObject({ status: 404 });
    });

    test('throws NormalizedApiError when listId-direct API call fails with non-API error', async () => {
        mockGetCustomerProductList.mockRejectedValue(new TypeError('Network failure'));

        await expect(getWishlist(mockContext, 'cust-1', 'list-1')).rejects.toThrow(NormalizedApiError);
        await expect(getWishlist(mockContext, 'cust-1', 'list-1')).rejects.toThrow('Network failure');
    });

    test('logs operation context when listId-direct API call fails', async () => {
        mockGetCustomerProductList.mockRejectedValue(new Error('boom'));

        await getWishlist(mockContext, 'cust-1', 'list-1').catch(() => {});

        expect(mockLoggerError).toHaveBeenCalledWith(
            'shopperCustomers.getCustomerProductList failed',
            expect.objectContaining({ customerId: 'cust-1', listId: 'list-1' })
        );
    });
});

describe('loadWishlistPageData', () => {
    const mockContext = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockLoggerError.mockClear();
        mockLoggerWarn.mockClear();
    });

    test('returns empty payload when session has no usable token', async () => {
        mockGetAuth.mockReturnValue({ userType: 'guest', customerId: 'cust-1' });

        const result = await loadWishlistPageData(mockContext);

        expect(result).toEqual({
            wishlist: null,
            items: [],
            productsByProductId: expect.any(Promise),
        });
        await expect(result.productsByProductId).resolves.toEqual({});
        expect(mockGetCustomerProductLists).not.toHaveBeenCalled();
    });

    test('returns empty payload when getWishlist returns no list', async () => {
        mockGetAuth.mockReturnValue(usableSession);
        mockGetCustomerProductLists.mockResolvedValue({ data: { data: [] } });

        const result = await loadWishlistPageData(mockContext);

        expect(result.wishlist).toBeNull();
        expect(result.items).toEqual([]);
        await expect(result.productsByProductId).resolves.toEqual({});
    });

    test('returns wishlist payload for a usable session', async () => {
        mockGetAuth.mockReturnValue(usableSession);
        const wishlist = {
            id: 'list-1',
            type: 'wish_list',
            customerProductListItems: [],
        };
        mockGetCustomerProductLists.mockResolvedValue({ data: { data: [wishlist] } });

        const result = await loadWishlistPageData(mockContext);

        expect(result.wishlist).toEqual(wishlist);
        expect(result.items).toEqual([]);
        await expect(result.productsByProductId).resolves.toEqual({});
    });

    test('returns empty payload and logs at warn level on 401 from SCAPI', async () => {
        mockGetAuth.mockReturnValue(usableSession);
        const apiError = new ApiError({
            status: 401,
            statusText: 'Unauthorized',
            headers: new Headers(),
            body: { type: 'Unauthorized', title: 'Unauthorized', detail: 'Invalid credentials' },
            rawBody: '{}',
            url: 'https://api.example.com',
            method: 'GET',
        });
        mockGetCustomerProductLists.mockRejectedValue(apiError);

        const result = await loadWishlistPageData(mockContext);

        expect(result.wishlist).toBeNull();
        expect(result.items).toEqual([]);
        expect(mockLoggerWarn).toHaveBeenCalledWith(
            'Wishlist: auth error, returning empty wishlist',
            expect.objectContaining({ status: 401 })
        );
    });

    test('rethrows non-401/403 errors so the route boundary surfaces them', async () => {
        mockGetAuth.mockReturnValue(usableSession);
        const apiError = new ApiError({
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers(),
            body: { type: 'ServiceUnavailable', title: 'Service Unavailable', detail: 'Try again later' },
            rawBody: '{}',
            url: 'https://api.example.com',
            method: 'GET',
        });
        mockGetCustomerProductLists.mockRejectedValue(apiError);

        await expect(loadWishlistPageData(mockContext)).rejects.toBeInstanceOf(NormalizedApiError);
        expect(mockLoggerError).toHaveBeenCalledWith(
            'Wishlist: failed to load wishlist',
            expect.objectContaining({ error: expect.any(NormalizedApiError) })
        );
    });
});

describe('captureGuestWishlistSnapshot', () => {
    const mockContext = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('returns null when session has no usable token', async () => {
        mockGetAuth.mockReturnValue({ userType: 'guest', customerId: 'guest-1' });

        const snapshot = await captureGuestWishlistSnapshot(mockContext);

        expect(snapshot).toBeNull();
        expect(mockGetCustomerProductLists).not.toHaveBeenCalled();
    });

    test('returns null for a registered session', async () => {
        mockGetAuth.mockReturnValue({ ...usableSession, userType: 'registered', customerId: 'reg-1' });

        const snapshot = await captureGuestWishlistSnapshot(mockContext);

        expect(snapshot).toBeNull();
    });

    test('returns null when the guest has no wishlist', async () => {
        mockGetAuth.mockReturnValue(usableSession);
        mockGetCustomerProductLists.mockResolvedValue({ data: { data: [] } });

        const snapshot = await captureGuestWishlistSnapshot(mockContext);

        expect(snapshot).toBeNull();
    });

    test('returns null when the guest wishlist is empty', async () => {
        mockGetAuth.mockReturnValue(usableSession);
        mockGetCustomerProductLists.mockResolvedValue({
            data: { data: [{ id: 'list-g', type: 'wish_list', customerProductListItems: [] }] },
        });

        const snapshot = await captureGuestWishlistSnapshot(mockContext);

        expect(snapshot).toBeNull();
    });

    test('returns the snapshot when the guest wishlist has items', async () => {
        mockGetAuth.mockReturnValue(usableSession);
        const items = [
            { productId: 'sku-1', id: 'item-1' },
            { productId: 'sku-2', id: 'item-2' },
        ];
        mockGetCustomerProductLists.mockResolvedValue({
            data: { data: [{ id: 'list-g', type: 'wish_list', customerProductListItems: items }] },
        });

        const snapshot = await captureGuestWishlistSnapshot(mockContext);

        expect(snapshot).toEqual({ guestCustomerId: 'cust-1', guestListId: 'list-g', items });
    });

    test('returns null when the read fails (does not throw)', async () => {
        mockGetAuth.mockReturnValue(usableSession);
        mockGetCustomerProductLists.mockRejectedValue(new Error('boom'));

        const snapshot = await captureGuestWishlistSnapshot(mockContext);

        expect(snapshot).toBeNull();
        expect(mockLoggerWarn).toHaveBeenCalledWith(
            'Wishlist: captureGuestWishlistSnapshot failed, skipping merge',
            expect.objectContaining({ error: expect.any(Error) })
        );
    });
});

describe('mergeWishlist', () => {
    const mockContext = {} as any;
    const registeredSession = {
        userType: 'registered' as const,
        customerId: 'reg-1',
        accessToken: 'tok',
        accessTokenExpiry: Date.now() + 60_000,
    };

    function snapshot(items: { productId?: string }[]): GuestWishlistSnapshot {
        return {
            guestCustomerId: 'guest-1',
            guestListId: 'list-g',
            items: items as GuestWishlistSnapshot['items'],
        };
    }

    function mockRegisteredList(items: { productId: string }[] = []) {
        const list = { id: 'list-r', type: 'wish_list', customerProductListItems: items };
        // getOrCreateWishlist calls getWishlist (no listId) which calls getCustomerProductLists
        mockGetCustomerProductLists.mockResolvedValue({ data: { data: [list] } });
        return list;
    }

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('skips when called without a registered session', async () => {
        mockGetAuth.mockReturnValue({
            userType: 'guest',
            customerId: 'guest-1',
            accessToken: 'tok',
            accessTokenExpiry: Date.now() + 60_000,
        });

        const result = await mergeWishlist(mockContext, snapshot([{ productId: 'sku-1' }]));

        expect(result).toEqual({
            merged: 0,
            skipped: 0,
            failed: 0,
            mergedProductIds: [],
            skippedProductIds: [],
            failedProductIds: [],
        });
        expect(mockCreateCustomerProductListItem).not.toHaveBeenCalled();
    });

    test('skips when guest and registered customerIds match (defensive guard)', async () => {
        mockGetAuth.mockReturnValue({ ...registeredSession, customerId: 'guest-1' });

        const result = await mergeWishlist(mockContext, snapshot([{ productId: 'sku-1' }]));

        expect(result).toEqual({
            merged: 0,
            skipped: 0,
            failed: 0,
            mergedProductIds: [],
            skippedProductIds: [],
            failedProductIds: [],
        });
        expect(mockGetCustomerProductLists).not.toHaveBeenCalled();
    });

    test('happy path: 3 items, no dupes, all merged', async () => {
        mockGetAuth.mockReturnValue(registeredSession);
        mockRegisteredList([]);
        mockCreateCustomerProductListItem.mockResolvedValue({});

        const result = await mergeWishlist(
            mockContext,
            snapshot([{ productId: 'sku-1' }, { productId: 'sku-2' }, { productId: 'sku-3' }])
        );

        expect(result).toEqual({
            merged: 3,
            skipped: 0,
            failed: 0,
            mergedProductIds: ['sku-1', 'sku-2', 'sku-3'],
            skippedProductIds: [],
            failedProductIds: [],
        });
        expect(mockCreateCustomerProductListItem).toHaveBeenCalledTimes(3);
        expect(mockDeleteCustomerProductList).not.toHaveBeenCalled();
    });

    test('dedup: skips items already in the registered list', async () => {
        mockGetAuth.mockReturnValue(registeredSession);
        mockRegisteredList([{ productId: 'sku-1' }]);
        mockCreateCustomerProductListItem.mockResolvedValue({});

        const result = await mergeWishlist(mockContext, snapshot([{ productId: 'sku-1' }, { productId: 'sku-2' }]));

        expect(result).toEqual({
            merged: 1,
            skipped: 1,
            failed: 0,
            mergedProductIds: ['sku-2'],
            skippedProductIds: ['sku-1'],
            failedProductIds: [],
        });
        expect(mockCreateCustomerProductListItem).toHaveBeenCalledTimes(1);
    });

    test('within-snapshot duplicates are skipped (not double-merged)', async () => {
        mockGetAuth.mockReturnValue(registeredSession);
        mockRegisteredList([]);
        mockCreateCustomerProductListItem.mockResolvedValue({});

        const result = await mergeWishlist(
            mockContext,
            snapshot([{ productId: 'sku-1' }, { productId: 'sku-1' }, { productId: 'sku-2' }])
        );

        expect(result).toEqual({
            merged: 2,
            skipped: 1,
            failed: 0,
            mergedProductIds: ['sku-1', 'sku-2'],
            skippedProductIds: ['sku-1'],
            failedProductIds: [],
        });
        expect(mockCreateCustomerProductListItem).toHaveBeenCalledTimes(2);
    });

    test('per-item failure: logs and counts as failed without aborting', async () => {
        mockGetAuth.mockReturnValue(registeredSession);
        mockRegisteredList([]);
        mockCreateCustomerProductListItem
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce(new Error('400 invalid product'))
            .mockResolvedValueOnce({});

        const result = await mergeWishlist(
            mockContext,
            snapshot([{ productId: 'sku-1' }, { productId: 'sku-bad' }, { productId: 'sku-3' }])
        );

        expect(result).toEqual({
            merged: 2,
            skipped: 0,
            failed: 1,
            mergedProductIds: ['sku-1', 'sku-3'],
            skippedProductIds: [],
            failedProductIds: ['sku-bad'],
        });
        expect(mockLoggerWarn).toHaveBeenCalledWith(
            'Wishlist: mergeWishlist failed to create item, skipping',
            expect.objectContaining({ productId: 'sku-bad' })
        );
    });

    test('merges in parallel chunks of 5 (chunk boundary respected)', async () => {
        mockGetAuth.mockReturnValue(registeredSession);
        mockRegisteredList([]);

        // Track in-flight count to confirm at most 5 calls run concurrently.
        let inFlight = 0;
        let maxInFlight = 0;
        mockCreateCustomerProductListItem.mockImplementation(async () => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise((resolve) => setTimeout(resolve, 0));
            inFlight -= 1;
            return {};
        });

        const items = Array.from({ length: 7 }, (_, i) => ({ productId: `sku-${i}` }));
        const result = await mergeWishlist(mockContext, snapshot(items));

        expect(result).toEqual({
            merged: 7,
            skipped: 0,
            failed: 0,
            mergedProductIds: ['sku-0', 'sku-1', 'sku-2', 'sku-3', 'sku-4', 'sku-5', 'sku-6'],
            skippedProductIds: [],
            failedProductIds: [],
        });
        expect(mockCreateCustomerProductListItem).toHaveBeenCalledTimes(7);
        expect(maxInFlight).toBeLessThanOrEqual(5);
        expect(maxInFlight).toBeGreaterThan(1); // Confirms parallelism actually happened.
    });

    test('empty snapshot is a noop, no SCAPI writes', async () => {
        mockGetAuth.mockReturnValue(registeredSession);

        const result = await mergeWishlist(mockContext, snapshot([]));

        expect(result).toEqual({
            merged: 0,
            skipped: 0,
            failed: 0,
            mergedProductIds: [],
            skippedProductIds: [],
            failedProductIds: [],
        });
        expect(mockGetCustomerProductLists).not.toHaveBeenCalled();
        expect(mockCreateCustomerProductListItem).not.toHaveBeenCalled();
    });

    test('items without productId are counted as failed', async () => {
        mockGetAuth.mockReturnValue(registeredSession);
        mockRegisteredList([]);

        const result = await mergeWishlist(mockContext, snapshot([{ productId: undefined as unknown as string }]));

        expect(result).toEqual({
            merged: 0,
            skipped: 0,
            failed: 1,
            mergedProductIds: [],
            skippedProductIds: [],
            failedProductIds: [],
        });
        expect(mockCreateCustomerProductListItem).not.toHaveBeenCalled();
    });

    test('does not attempt to delete the guest list', async () => {
        mockGetAuth.mockReturnValue(registeredSession);
        mockRegisteredList([]);
        mockCreateCustomerProductListItem.mockResolvedValue({});

        await mergeWishlist(mockContext, snapshot([{ productId: 'sku-1' }, { productId: 'sku-2' }]));

        expect(mockDeleteCustomerProductList).not.toHaveBeenCalled();
        expect(mockLoggerWarn).not.toHaveBeenCalledWith(
            expect.stringContaining('could not delete guest list'),
            expect.anything()
        );
    });
});

describe('appendWishlistMergeFlag', () => {
    const mockContext = {
        get: (key: any) => {
            if (key === siteContext) {
                return { site: { id: 'RefArch' } };
            }
            return undefined;
        },
    } as any;

    beforeEach(() => {
        // Set up tracking consent to allow cookie generation
        mockGetAuth.mockReturnValue({
            trackingConsent: TrackingConsent.Accepted,
            userType: 'registered',
        });
    });

    test('returns url unchanged and no cookie when nothing was merged or failed', () => {
        const result1 = appendWishlistMergeFlag(mockContext, '/account/wishlist', {
            merged: 0,
            skipped: 0,
            failed: 0,
            mergedProductIds: [],
            skippedProductIds: [],
            failedProductIds: [],
        });
        expect(result1.url).toBe('/account/wishlist');
        expect(result1.setCookie).toBe('');

        const result2 = appendWishlistMergeFlag(mockContext, '/foo?x=1', {
            merged: 0,
            skipped: 5,
            failed: 0,
            mergedProductIds: [],
            skippedProductIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
            failedProductIds: [],
        });
        expect(result2.url).toBe('/foo?x=1');
        expect(result2.setCookie).toBe('');
    });

    test('appends ?wishlistMerge=success and sets cookie on a clean merge', () => {
        const result = appendWishlistMergeFlag(mockContext, '/account/wishlist', {
            merged: 3,
            skipped: 0,
            failed: 0,
            mergedProductIds: ['p1', 'p2', 'p3'],
            skippedProductIds: [],
            failedProductIds: [],
        });
        expect(result.url).toBe('/account/wishlist?wishlistMerge=success');
        expect(result.setCookie).toContain('wishlist_merge');
        expect(result.setCookie).toContain('Max-Age=60');
    });

    test('appends &wishlistMerge=success when the URL already has a query string', () => {
        const result = appendWishlistMergeFlag(mockContext, '/foo?x=1', {
            merged: 1,
            skipped: 0,
            failed: 0,
            mergedProductIds: ['p1'],
            skippedProductIds: [],
            failedProductIds: [],
        });
        expect(result.url).toBe('/foo?x=1&wishlistMerge=success');
        expect(result.setCookie).toContain('wishlist_merge');
    });

    test('appends ?wishlistMerge=partial when any item failed', () => {
        const result1 = appendWishlistMergeFlag(mockContext, '/account/wishlist', {
            merged: 2,
            skipped: 0,
            failed: 1,
            mergedProductIds: ['p1', 'p2'],
            skippedProductIds: [],
            failedProductIds: ['p3'],
        });
        expect(result1.url).toBe('/account/wishlist?wishlistMerge=partial');
        expect(result1.setCookie).toContain('wishlist_merge');

        const result2 = appendWishlistMergeFlag(mockContext, '/account/wishlist', {
            merged: 0,
            skipped: 0,
            failed: 1,
            mergedProductIds: [],
            skippedProductIds: [],
            failedProductIds: ['p1'],
        });
        expect(result2.url).toBe('/account/wishlist?wishlistMerge=partial');
        expect(result2.setCookie).toContain('wishlist_merge');
    });
});

describe('getOrCreateWishlist — create branch', () => {
    const mockContext = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('fast path: returns the POST body without re-fetching when id is present', async () => {
        // No existing list: getCustomerProductLists returns empty.
        mockGetCustomerProductLists.mockResolvedValueOnce({ data: { data: [] } });

        const created = { id: 'list-new', type: 'wish_list', customerProductListItems: [] };
        mockCreateCustomerProductList.mockResolvedValue({ data: created });

        const result = await getOrCreateWishlist(mockContext, 'cust-1');

        expect(result).toEqual(created);
        expect(mockCreateCustomerProductList).toHaveBeenCalledTimes(1);
        // Only the initial lookup before create — no second GET after the POST.
        expect(mockGetCustomerProductLists).toHaveBeenCalledTimes(1);
        expect(mockLoggerWarn).not.toHaveBeenCalled();
    });

    test('fallback path: waits for index, re-fetches when POST returns no id', async () => {
        vi.useFakeTimers();
        try {
            // No existing list: initial lookup empty.
            // After the create, the post-sleep GET returns the indexed list.
            const created = { id: 'list-indexed', type: 'wish_list', customerProductListItems: [] };
            mockGetCustomerProductLists
                .mockResolvedValueOnce({ data: { data: [] } })
                .mockResolvedValueOnce({ data: { data: [created] } });

            // POST resolves with a body that lacks id (the schema-anomaly we're guarding against).
            mockCreateCustomerProductList.mockResolvedValue({ data: { type: 'wish_list' } });

            const promise = getOrCreateWishlist(mockContext, 'cust-1');
            await vi.advanceTimersByTimeAsync(1500);
            const result = await promise;

            expect(result).toEqual(created);
            expect(mockCreateCustomerProductList).toHaveBeenCalledTimes(1);
            expect(mockGetCustomerProductLists).toHaveBeenCalledTimes(2);
            expect(mockLoggerWarn).toHaveBeenCalledWith(
                'Wishlist: createCustomerProductList returned without an id, waiting for index propagation',
                expect.objectContaining({ customerId: 'cust-1' })
            );
        } finally {
            vi.useRealTimers();
        }
    });
});
