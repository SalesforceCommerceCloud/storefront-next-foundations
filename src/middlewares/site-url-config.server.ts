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

/**
 * Site URL configuration sourced from ECOM and synced via the MRT Data
 * Access Layer. The ECOM provider is
 * `com.demandware.beehive.core.mrt.dal.provider.SiteUrlConfigDalEntryProvider`.
 *
 * Today the only field is the media host prefix; new fields (library web
 * roots, host aliases, CDN host) are intended to be added here as the ECOM
 * provider grows.
 */
import type { RouterContextProvider } from 'react-router';
import {
    createDataStoreContext,
    createLazyDataStoreMiddleware,
    readLazyDataStoreEntry,
} from '@salesforce/storefront-next-runtime/data-store';
import { siteContext } from '@salesforce/storefront-next-runtime/site-context';

/**
 * Strongly-typed view of the `{siteId}-media-host-prefix` Data Store entry
 * after `transform` has unwrapped the `{ data }` envelope ECOM emits.
 *
 * `mediaHostPrefix` is the scheme + host MRT should prefix to relative
 * media paths when composing absolute media URLs at request time — the
 * value `mediaFile.getAbsURL()` would have produced on ECOM
 * (e.g. `"https://www.example.com"`).
 */
export interface SiteUrlConfig {
    mediaHostPrefix: string;
}

/**
 * Suffix appended to the site ID when looking up the entry in the Data
 * Store. The full key is `{siteId}-url-config` and matches the key the
 * ECOM `SiteUrlConfigDalEntryProvider` writes.
 */
export const SITE_URL_CONFIG_KEY_SUFFIX = 'url-config';

const DATA_STORE_UNAVAILABLE_MODE = process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE;

/**
 * React Router context populated by {@link siteUrlConfigMiddleware} with a
 * lazy loader. Read it via {@link getSiteUrlConfig} — direct access returns
 * the loader function, not the value.
 */
export const siteUrlConfigContext = createDataStoreContext<SiteUrlConfig>();

/**
 * Read the site URL configuration from router context. Triggers the
 * underlying data-store fetch on first call within a request and reuses
 * the cached result on subsequent calls.
 *
 * Returns `null` when the data-store middleware hasn't run, the entry is
 * missing, or the data store is unavailable in fallback mode without a
 * configured fallback value. Callers that need a value should fall back to
 * a sensible default (e.g. the request origin).
 */
export function getSiteUrlConfig(context: Readonly<RouterContextProvider>): Promise<SiteUrlConfig | null> {
    return readLazyDataStoreEntry(context, siteUrlConfigContext);
}

/**
 * Builds the `{siteId}-url-config` data-store entry key from the active
 * site context.
 *
 * Inlined rather than reusing the SDK's `prefixWithSiteId` helper so the
 * suffix is bound exactly to what the ECOM
 * `SiteUrlConfigDalEntryProvider` writes — any future divergence between
 * the two becomes impossible to miss.
 */
function entryKey(context: Readonly<RouterContextProvider>): string {
    const siteId = context.get(siteContext)?.site?.id;
    if (!siteId) {
        throw new Error(
            'Site id not found. Ensure site context middleware runs before the site URL config middleware.'
        );
    }
    return `${siteId}-${SITE_URL_CONFIG_KEY_SUFFIX}`;
}

/**
 * Server middleware that registers a lazy loader for the site URL
 * configuration. The Data Store is only hit when a downstream consumer
 * calls {@link getSiteUrlConfig} — so requests that never need the value
 * (most non-Page-Designer routes) don't pay for the round trip.
 *
 * Must run after `siteContextMiddleware` since the entry key is derived
 * from the active site id.
 */
export const siteUrlConfigMiddleware = createLazyDataStoreMiddleware<SiteUrlConfig>({
    entryKey,
    context: siteUrlConfigContext,
    onUnavailable: DATA_STORE_UNAVAILABLE_MODE === 'fallback' ? 'fallback' : 'throw',
    // Keep undefined intentionally — `getSiteUrlConfig` returns null when
    // there's no value, and the page-resolution middleware already has its
    // own request-origin fallback to use in that case.
    fallbackValue: undefined,
    // ECOM wraps the payload under a `data` key:
    // `{ data: { mediaHostPrefix: "https://www.example.com" } }`.
    // Unwrap it into the typed shape consumers expect.
    transform: (value) => {
        const data = value.data as SiteUrlConfig | undefined;
        return { mediaHostPrefix: data?.mediaHostPrefix ?? '' };
    },
});
