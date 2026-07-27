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
import type { RouterContextProvider } from 'react-router';
import { getCookieNameWithSiteId, getCookieConfig } from '@/lib/cookie-utils.server';
import type { WishlistMergeResult } from '@/lib/api/wishlist.server';
import { WISHLIST_MERGE_COOKIE_NAME } from './constants';

/**
 * Cap on mergedProductIds array length to prevent cookie overflow.
 * RFC 6265 limits single cookies to ~4KB. With 50 products averaging 15-char IDs,
 * the encoded cookie is ~1KB after encodeURIComponent, leaving headroom for other fields.
 */
const MAX_MERGED_PRODUCT_IDS = 50;

/**
 * Subset of WishlistMergeResult stored in the cookie.
 * Includes counts for all categories but only productIds for merged items (capped at 50).
 * Skipped/failed productIds are omitted to keep cookie size bounded — counts suffice for
 * summary analytics, and merged products are the only ones we emit individual events for.
 */
type WishlistMergeCookieData = {
    merged: number;
    skipped: number;
    failed: number;
    mergedProductIds: string[];
};

/**
 * Store wishlist merge result in a short-lived cookie for one-time client retrieval.
 * The cookie expires after 60 seconds to prevent stale data.
 *
 * Only mergedProductIds are stored (capped at 50) to prevent cookie overflow.
 * Skipped/failed productIds are omitted — counts suffice for analytics.
 *
 * @param context - Router context for site resolution
 * @param result - Wishlist merge result to store
 * @returns Set-Cookie header value
 */
export function setWishlistMergeCookie(context: Readonly<RouterContextProvider>, result: WishlistMergeResult): string {
    const cookieName = getCookieNameWithSiteId(WISHLIST_MERGE_COOKIE_NAME, context);
    const cookieConfig = getCookieConfig(
        {
            httpOnly: false, // Must be readable client-side by WishlistMergeToast
            maxAge: 60, // 60 seconds - enough time for redirect + page load
            path: '/',
            sameSite: 'lax',
        },
        context
    );

    // Cap mergedProductIds to prevent cookie overflow
    const cookieData: WishlistMergeCookieData = {
        merged: result.merged,
        skipped: result.skipped,
        failed: result.failed,
        mergedProductIds: result.mergedProductIds.slice(0, MAX_MERGED_PRODUCT_IDS),
    };

    const value = encodeURIComponent(JSON.stringify(cookieData));
    const attributes = [
        `${cookieName}=${value}`,
        cookieConfig.path && `Path=${cookieConfig.path}`,
        cookieConfig.domain && `Domain=${cookieConfig.domain}`,
        cookieConfig.maxAge !== undefined && `Max-Age=${cookieConfig.maxAge}`,
        cookieConfig.sameSite && `SameSite=${cookieConfig.sameSite}`,
        cookieConfig.secure && 'Secure',
        cookieConfig.httpOnly && 'HttpOnly',
    ]
        .filter(Boolean)
        .join('; ');

    return attributes;
}
