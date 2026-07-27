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
import { type ReactElement, Suspense } from 'react';
import { Await } from 'react-router';
import type { Route } from './+types/_app.account.wishlist';
import { loadWishlistPageData, type WishlistPageData } from '@/lib/api/wishlist.server';
import { WishlistPageContent, WishlistSkeleton } from '@/components/wishlist/wishlist-page';
import { WishlistLoadError } from '@/components/wishlist/wishlist-load-error';
import { SeoMeta } from '@/components/seo-meta';
import { getLogger } from '@/lib/logger.server';
import { useTranslation } from 'react-i18next';
import { WishlistPageAnalytics } from '@/analytics/wishlist-page-analytics';

export { shouldRevalidate } from '@/lib/revalidation/routes/wishlist';

/**
 * Server-side loader. Delegates to `loadWishlistPageData` (shared with the
 * guest `/wishlist` route) so both code paths render the same data shape.
 * The parent `_app.account` layout already enforces auth, so we don't repeat
 * the redirect here.
 */
export async function loader({ context }: Route.LoaderArgs): Promise<WishlistPageData> {
    const logger = getLogger(context);
    logger.debug('Wishlist: loader starting');

    return loadWishlistPageData(context);
}

/**
 * Route-level error boundary for non-auth loader failures (5xx, network).
 * Keeps the wishlist failure scoped to this page instead of escalating to the
 * root error page. Auth errors (401/403) still degrade silently to an empty
 * wishlist via `loadWishlistPageData`.
 */
export function ErrorBoundary(): ReactElement {
    return <WishlistLoadError retryHref="/account/wishlist" />;
}

export default function AccountWishlist({
    loaderData,
}: {
    loaderData: Awaited<ReturnType<typeof loader>>;
}): ReactElement {
    const { t } = useTranslation('account');
    return (
        <>
            <WishlistPageAnalytics />
            <SeoMeta title={t('meta.wishlistTitle', { defaultValue: 'Wishlist' })} noIndex />
            <Suspense fallback={<WishlistSkeleton />}>
                <Await
                    resolve={loaderData.productsByProductId}
                    errorElement={<WishlistLoadError retryHref="/account/wishlist" />}>
                    {(productsByProductId) => (
                        <WishlistPageContent items={loaderData.items} productsByProductId={productsByProductId} />
                    )}
                </Await>
            </Suspense>
        </>
    );
}
