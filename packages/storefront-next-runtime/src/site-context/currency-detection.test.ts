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
 * @vitest-environment jsdom
 * Use jsdom so the Cookie request header is available (happy-dom strips it per Fetch spec).
 */
import { describe, it, expect } from 'vitest';
import { resolveCurrency } from './currency-detection';
import { createCurrencyCookie } from './cookies';
import type { Site, Locale } from './types';

const currencyCookie = createCurrencyCookie('currency');

const SITE: Site = {
    id: 'site-us',
    name: 'US',
    defaultLocale: 'en-US',
    supportedLocales: [
        { id: 'en-US', preferredCurrency: 'USD' },
        { id: 'en-GB', preferredCurrency: 'GBP' },
    ],
    supportedCurrencies: ['USD', 'GBP', 'EUR'],
    defaultCurrency: 'USD',
};

const LOCALE_US: Locale = { id: 'en-US', preferredCurrency: 'USD' };
const LOCALE_GB: Locale = { id: 'en-GB', preferredCurrency: 'GBP' };

async function requestWithCookie(currency: string): Promise<Request> {
    const cookieHeader = await currencyCookie.serialize(currency);
    return new Request('https://example.com/', {
        headers: { Cookie: cookieHeader },
    });
}

describe('resolveCurrency', () => {
    it('returns currency from cookie when valid', async () => {
        const result = await resolveCurrency(await requestWithCookie('EUR'), currencyCookie, SITE, LOCALE_US);
        expect(result).toBe('EUR');
    });

    it('ignores cookie value not in supportedCurrencies and falls back to locale', async () => {
        const result = await resolveCurrency(await requestWithCookie('JPY'), currencyCookie, SITE, LOCALE_GB);
        expect(result).toBe('GBP');
    });

    it('uses locale preferredCurrency when no cookie', async () => {
        const request = new Request('https://example.com/');
        const result = await resolveCurrency(request, currencyCookie, SITE, LOCALE_GB);
        expect(result).toBe('GBP');
    });

    it('falls back to site defaultCurrency when locale preferredCurrency is not supported', async () => {
        const locale: Locale = { id: 'ja-JP', preferredCurrency: 'JPY' };
        const request = new Request('https://example.com/');
        const result = await resolveCurrency(request, currencyCookie, SITE, locale);
        expect(result).toBe('USD');
    });

    it('falls back to site defaultCurrency when locale has no preferredCurrency', async () => {
        const locale: Locale = { id: 'en-US', preferredCurrency: '' };
        const request = new Request('https://example.com/');
        const result = await resolveCurrency(request, currencyCookie, SITE, locale);
        expect(result).toBe('USD');
    });

    it('throws when site has no supportedCurrencies', async () => {
        const site: Site = { ...SITE, supportedCurrencies: [] };
        const request = new Request('https://example.com/');
        await expect(resolveCurrency(request, currencyCookie, site, LOCALE_US)).rejects.toThrow(
            'must have supportedCurrencies configured'
        );
    });
});
