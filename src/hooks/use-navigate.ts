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

import { useCallback } from 'react';
import { useNavigate as useRouterNavigate, type NavigateOptions, type To } from 'react-router';

// Runtime SDK
import { buildUrl } from '@salesforce/storefront-next-runtime/site-context';

// Hooks
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import { useCurrentSiteAndLocaleRef } from '@/hooks/use-current-site-and-locale-ref';

/**
 * Site-context-aware `useNavigate`. An enhanced version of React Router's useNavigate hook.
 * Automatically applies URL prefix and search params from the app's URL config
 * to string destinations. Requires a SiteProvider to be mounted.
 *
 * - String `to` values are transformed via `buildUrl`
 * - Object `to` values with a `pathname` have the pathname transformed.
 * - Object `to` values without a `pathname` (e.g. `{ search }`) pass through unchanged.
 * - Numeric `to` values (history navigation like `navigate(-1)`) pass through unchanged.
 */
export function useNavigate() {
    const routerNavigate = useRouterNavigate();
    const config = useConfig();
    const { siteRef, localeRef } = useCurrentSiteAndLocaleRef();

    return useCallback(
        (to: To | number, options?: NavigateOptions) => {
            if (typeof to === 'number') {
                return routerNavigate(to);
            }

            const params = { siteId: siteRef, localeId: localeRef };

            if (typeof to === 'string') {
                return routerNavigate(buildUrl({ to, urlConfig: config.url, params }), options);
            }

            // Object To — only transform if pathname is present
            if (to.pathname) {
                const pathname = buildUrl({ to: to.pathname, urlConfig: config.url, params });
                return routerNavigate({ ...to, pathname }, options);
            }

            return routerNavigate(to, options);
        },
        [routerNavigate, siteRef, localeRef, config.url]
    );
}
