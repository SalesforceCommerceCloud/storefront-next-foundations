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
import { useAsyncError } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Link } from '@/components/link';
import { routes } from '@/route-paths';
import { NormalizedApiError } from '@/lib/api/normalized-api-error';

/**
 * Renders an in-page "we couldn't load your cart" message with a hard-reload retry link.
 * Used as the `errorElement` for the cart route's top-level `<Await>` over `basketDataPromise`.
 *
 * `reloadDocument` ensures the retry link bypasses any in-memory cached failed promise.
 * In DEV builds, surfaces the underlying `NormalizedApiError` status + message for debugging.
 */
export function CartLoadError(): ReactElement {
    const rawError = useAsyncError();
    const error = rawError instanceof NormalizedApiError ? rawError : null;
    const { t } = useTranslation('cart');
    return (
        <div role="alert" className="section-container py-16 text-center">
            <p className="text-base text-muted-foreground">{t('loadError.message')}</p>
            <Link to={routes.cart} reloadDocument className="mt-4 inline-block text-primary underline">
                {t('loadError.retry')}
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
