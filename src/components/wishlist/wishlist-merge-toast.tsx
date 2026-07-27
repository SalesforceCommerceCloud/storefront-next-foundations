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
import { useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/hooks/use-navigate';
import { useToast } from '@/components/toast';
import { useAnalytics } from '@/hooks/use-analytics';
import { useSite } from '@salesforce/storefront-next-runtime/site-context';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import { WISHLIST_MERGE_COOKIE_NAME } from '@/lib/wishlist/constants';

const PARAM = 'wishlistMerge';

/**
 * Subset of WishlistMergeResult stored in the cookie.
 * Matches the structure created by setWishlistMergeCookie on the server.
 */
type WishlistMergeCookieData = {
    merged: number;
    skipped: number;
    failed: number;
    mergedProductIds: string[];
};

/**
 * Helper to read cookie value from document.cookie
 */
function getCookie(name: string): string | undefined {
    if (typeof document === 'undefined') return undefined;
    const cookies = document.cookie.split(';').map((c) => c.trim());
    const targetCookie = cookies.find((c) => c.startsWith(`${name}=`));
    return targetCookie ? targetCookie.slice(name.length + 1) : undefined;
}

/**
 * Helper to delete a cookie by setting Max-Age=0.
 * Must match the Domain attribute that was used when setting the cookie (RFC 6265).
 *
 * @param name - Cookie name
 * @param domain - Optional domain (must match the domain used when setting the cookie)
 */
function deleteCookie(name: string, domain?: string): void {
    if (typeof document === 'undefined') return;
    const domainAttr = domain ? `; Domain=${domain}` : '';
    document.cookie = `${name}=; Max-Age=0; Path=/${domainAttr}`;
}

/**
 * Mounts inside the authenticated app shell. When the URL carries `?wishlistMerge=success`
 * or `?wishlistMerge=partial` (set by an auth-success route after merging the guest
 * wishlist), surface a toast, emit analytics events, and strip the param so a refresh
 * does not re-fire.
 *
 * Analytics data (counts + product IDs) is read from a short-lived cookie, not URL params,
 * to avoid URL length limits with large wishlists.
 *
 * Renders nothing.
 */
export function WishlistMergeToast(): null {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { t } = useTranslation('account');
    const { trackWishlistItemMerged, trackWishlistMerged } = useAnalytics();
    const { site } = useSite();
    const config = useConfig();
    const firedFor = useRef<string | null>(null);

    useEffect(() => {
        const flag = searchParams.get(PARAM);
        if (flag !== 'success' && flag !== 'partial') {
            return;
        }
        const key = `${location.pathname}?${flag}`;
        if (firedFor.current === key) {
            return;
        }
        firedFor.current = key;

        addToast(t(flag === 'partial' ? 'wishlist.mergePartial' : 'wishlist.mergeSuccess'), 'success');

        // Read merge data from cookie (namespaced with site ID)
        const cookieName = `${WISHLIST_MERGE_COOKIE_NAME}_${site.id}`;
        const cookieValue = getCookie(cookieName);

        if (cookieValue) {
            try {
                const cookieData = JSON.parse(decodeURIComponent(cookieValue)) as WishlistMergeCookieData;

                // Emit individual events for each merged product (capped at 50 by server)
                for (const productId of cookieData.mergedProductIds) {
                    void trackWishlistItemMerged({ productId });
                }

                // Emit summary event with counts + available productIds
                // Note: mergedProductIds may be capped at 50, but counts are always accurate
                if (cookieData.merged > 0 || cookieData.skipped > 0 || cookieData.failed > 0) {
                    void trackWishlistMerged({
                        merged: cookieData.merged,
                        skipped: cookieData.skipped,
                        failed: cookieData.failed,
                        mergedProductIds: cookieData.mergedProductIds,
                        skippedProductIds: [], // Omitted from cookie to prevent overflow
                        failedProductIds: [], // Omitted from cookie to prevent overflow
                    });
                }

                // Delete cookie after reading (one-time use). Must pass the SAME Domain that
                // setWishlistMergeCookie used (RFC 6265): the per-site override, else the global
                // app.cookies.domain. A host-only delete would not match a domain-scoped cookie.
                deleteCookie(cookieName, site.cookies?.domain || config.cookies?.domain);
            } catch {
                // Silently ignore parse errors — merge already succeeded, analytics failure shouldn't break UX
            }
        }

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete(PARAM);
        const search = nextParams.toString();
        void navigate(`${location.pathname}${search ? `?${search}` : ''}`, { replace: true });
    }, [
        searchParams,
        location.pathname,
        addToast,
        navigate,
        t,
        trackWishlistItemMerged,
        trackWishlistMerged,
        site.id,
        site.cookies?.domain,
        config.cookies?.domain,
    ]);

    return null;
}
