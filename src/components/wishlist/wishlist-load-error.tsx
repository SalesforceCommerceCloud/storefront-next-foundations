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
import type { ReactElement } from 'react';
import { useRouteError } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Link } from '@/components/link';
import { NormalizedApiError } from '@/lib/api/normalized-api-error';

/**
 * In-page fallback for the wishlist route when `loadWishlistPageData` rethrows a
 * non-auth SCAPI error. Keeps the failure scoped to the wishlist content area
 * instead of escalating to the root error page.
 *
 * `reloadDocument` ensures the retry link bypasses any in-memory cached failed loader.
 * In DEV builds, surfaces the underlying `NormalizedApiError` status + message for debugging.
 */
export function WishlistLoadError({ retryHref }: { retryHref: string }): ReactElement {
    const rawError = useRouteError();
    const error = rawError instanceof NormalizedApiError ? rawError : null;
    const { t } = useTranslation('account');
    return (
        <div role="alert" className="section-container py-16 text-center">
            <p className="text-base text-muted-foreground">{t('wishlist.loadErrorMessage')}</p>
            <Link to={retryHref} reloadDocument className="mt-4 inline-block text-primary underline">
                {t('wishlist.loadErrorRetry')}
            </Link>
            {import.meta.env.DEV && error && (
                <div className="mt-2 text-xs font-mono text-muted-foreground/70">
                    {error.status && <span>{error.status} </span>}
                    {error.message && <p>{error.message}</p>}
                </div>
            )}
        </div>
    );
}
