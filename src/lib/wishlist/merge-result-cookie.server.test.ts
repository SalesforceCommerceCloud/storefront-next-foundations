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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setWishlistMergeCookie } from './merge-result-cookie.server';
import { WISHLIST_MERGE_COOKIE_NAME } from './constants';
import type { WishlistMergeResult } from '@/lib/api/wishlist.server';
import type { RouterContextProvider } from 'react-router';
import { siteContext } from '@salesforce/storefront-next-runtime/site-context';

// Mock getCookieNameWithSiteId and getCookieConfig
vi.mock('@/lib/cookie-utils.server', () => ({
    getCookieNameWithSiteId: vi.fn((name: string) => `${name}_RefArch`),
    getCookieConfig: vi.fn((options, context) => {
        const site = context.get(siteContext)?.site;
        return {
            ...options,
            ...(site?.cookies?.domain && { domain: site.cookies.domain }),
        };
    }),
}));

describe('setWishlistMergeCookie', () => {
    const mockResult: WishlistMergeResult = {
        merged: 2,
        skipped: 1,
        failed: 0,
        mergedProductIds: ['product1', 'product2'],
        skippedProductIds: ['product3'],
        failedProductIds: [],
    };

    let mockContext: RouterContextProvider;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('uses the shared WISHLIST_MERGE_COOKIE_NAME constant', () => {
        // Verify constant hasn't drifted from expected value
        expect(WISHLIST_MERGE_COOKIE_NAME).toBe('wishlist_merge');
    });

    it('generates cookie without Domain attribute when site.cookies.domain is not set', () => {
        mockContext = {
            get: vi.fn((key) => {
                if (key === siteContext) {
                    return {
                        site: { id: 'RefArch', cookies: {} },
                        locale: { id: 'en-US', preferredCurrency: 'USD' },
                        currency: 'USD',
                    };
                }
                return undefined;
            }),
        } as unknown as RouterContextProvider;

        const setCookie = setWishlistMergeCookie(mockContext, mockResult);

        // Should include cookie name, value, Max-Age, Path, SameSite
        expect(setCookie).toContain('wishlist_merge_RefArch=');
        expect(setCookie).toContain('Max-Age=60');
        expect(setCookie).toContain('Path=/');
        expect(setCookie).toContain('SameSite=lax');

        // Should NOT include Domain attribute
        expect(setCookie).not.toContain('Domain=');
    });

    it('generates cookie with Domain attribute when site.cookies.domain is set', () => {
        mockContext = {
            get: vi.fn((key) => {
                if (key === siteContext) {
                    return {
                        site: { id: 'RefArch', cookies: { domain: '.example.com' } },
                        locale: { id: 'en-US', preferredCurrency: 'USD' },
                        currency: 'USD',
                    };
                }
                return undefined;
            }),
        } as unknown as RouterContextProvider;

        const setCookie = setWishlistMergeCookie(mockContext, mockResult);

        // Should include cookie name, value, Max-Age, Path, SameSite, Domain
        expect(setCookie).toContain('wishlist_merge_RefArch=');
        expect(setCookie).toContain('Max-Age=60');
        expect(setCookie).toContain('Path=/');
        expect(setCookie).toContain('SameSite=lax');
        expect(setCookie).toContain('Domain=.example.com');
    });

    it('encodes merge result data in cookie value', () => {
        mockContext = {
            get: vi.fn((key) => {
                if (key === siteContext) {
                    return {
                        site: { id: 'RefArch', cookies: {} },
                        locale: { id: 'en-US', preferredCurrency: 'USD' },
                        currency: 'USD',
                    };
                }
                return undefined;
            }),
        } as unknown as RouterContextProvider;

        const setCookie = setWishlistMergeCookie(mockContext, mockResult);

        // Extract the cookie value (between = and first ;)
        const match = setCookie.match(/wishlist_merge_RefArch=([^;]+)/);
        expect(match).toBeTruthy();
        if (!match) throw new Error('Cookie value not found');

        const encodedValue = match[1];
        const decodedValue = decodeURIComponent(encodedValue);
        const parsedData = JSON.parse(decodedValue);

        // Should contain counts and mergedProductIds (capped)
        expect(parsedData).toEqual({
            merged: 2,
            skipped: 1,
            failed: 0,
            mergedProductIds: ['product1', 'product2'],
        });
    });

    it('caps mergedProductIds at 50 items', () => {
        mockContext = {
            get: vi.fn((key) => {
                if (key === siteContext) {
                    return {
                        site: { id: 'RefArch', cookies: {} },
                        locale: { id: 'en-US', preferredCurrency: 'USD' },
                        currency: 'USD',
                    };
                }
                return undefined;
            }),
        } as unknown as RouterContextProvider;

        const largeResult: WishlistMergeResult = {
            merged: 100,
            skipped: 0,
            failed: 0,
            mergedProductIds: Array.from({ length: 100 }, (_, i) => `product${i}`),
            skippedProductIds: [],
            failedProductIds: [],
        };

        const setCookie = setWishlistMergeCookie(mockContext, largeResult);

        const match = setCookie.match(/wishlist_merge_RefArch=([^;]+)/);
        expect(match).toBeTruthy();
        if (!match) throw new Error('Cookie value not found');

        const encodedValue = match[1];
        const decodedValue = decodeURIComponent(encodedValue);
        const parsedData = JSON.parse(decodedValue);

        // Should cap at 50 productIds
        expect(parsedData.mergedProductIds).toHaveLength(50);
        expect(parsedData.mergedProductIds[0]).toBe('product0');
        expect(parsedData.mergedProductIds[49]).toBe('product49');

        // Counts should still be accurate (not capped)
        expect(parsedData.merged).toBe(100);
    });

    it('omits skippedProductIds and failedProductIds from cookie to save space', () => {
        mockContext = {
            get: vi.fn((key) => {
                if (key === siteContext) {
                    return {
                        site: { id: 'RefArch', cookies: {} },
                        locale: { id: 'en-US', preferredCurrency: 'USD' },
                        currency: 'USD',
                    };
                }
                return undefined;
            }),
        } as unknown as RouterContextProvider;

        const resultWithSkippedAndFailed: WishlistMergeResult = {
            merged: 1,
            skipped: 2,
            failed: 1,
            mergedProductIds: ['product1'],
            skippedProductIds: ['product2', 'product3'],
            failedProductIds: ['product4'],
        };

        const setCookie = setWishlistMergeCookie(mockContext, resultWithSkippedAndFailed);

        const match = setCookie.match(/wishlist_merge_RefArch=([^;]+)/);
        expect(match).toBeTruthy();
        if (!match) throw new Error('Cookie value not found');

        const encodedValue = match[1];
        const decodedValue = decodeURIComponent(encodedValue);
        const parsedData = JSON.parse(decodedValue);

        // Should have counts but not skipped/failed arrays
        expect(parsedData).toEqual({
            merged: 1,
            skipped: 2,
            failed: 1,
            mergedProductIds: ['product1'],
        });
        expect(parsedData.skippedProductIds).toBeUndefined();
        expect(parsedData.failedProductIds).toBeUndefined();
    });

    it('sets httpOnly to false so client can read cookie', () => {
        mockContext = {
            get: vi.fn((key) => {
                if (key === siteContext) {
                    return {
                        site: { id: 'RefArch', cookies: {} },
                        locale: { id: 'en-US', preferredCurrency: 'USD' },
                        currency: 'USD',
                    };
                }
                return undefined;
            }),
        } as unknown as RouterContextProvider;

        const setCookie = setWishlistMergeCookie(mockContext, mockResult);

        // Should NOT contain HttpOnly attribute (allowing client-side read)
        expect(setCookie).not.toContain('HttpOnly');
    });
});
