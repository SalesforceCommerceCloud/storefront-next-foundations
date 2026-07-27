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

import type { Cookie } from 'react-router';
import type { Site, Locale } from './types';
import { readCookieFromRequest } from './utils';

/**
 * Resolve the currency for the current request.
 *
 * Priority:
 * 1. Cookie (user-selected currency, if valid for this site)
 * 2. Locale's preferred currency (if valid for this site)
 * 3. Site's default currency
 *
 * @param request - Incoming request
 * @param currencyCookie - Cookie instance for reading the currency cookie
 * @param site - Resolved site for this request
 * @param locale - Resolved locale for this request
 * @returns The resolved currency code
 */
export async function resolveCurrency(
    request: Request,
    currencyCookie: Cookie,
    site: Site,
    locale: Locale
): Promise<string> {
    const { supportedCurrencies, defaultCurrency } = site;

    if (!supportedCurrencies || supportedCurrencies.length === 0) {
        throw new Error(`Site "${site.id}" must have supportedCurrencies configured.`);
    }

    // 1. Try cookie
    const cookieValue = await readCookieFromRequest(request, currencyCookie);
    if (typeof cookieValue === 'string' && supportedCurrencies.includes(cookieValue)) {
        return cookieValue;
    }

    // 2. Try locale's preferred currency
    if (locale.preferredCurrency && supportedCurrencies.includes(locale.preferredCurrency)) {
        return locale.preferredCurrency;
    }

    // 3. Fall back to site default
    return defaultCurrency;
}
