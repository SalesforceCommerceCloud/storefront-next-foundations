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
import { describe, it, expect } from 'vitest';
import { buildSeoMetaDescriptors } from './seo';
import { mockConfig, mockSiteObject } from '@/test-utils/config';

describe('buildSeoMetaDescriptors', () => {
    const origin = 'https://www.example.com';

    const baseSite = {
        id: mockSiteObject.id,
        alias: 'global',
        defaultLocale: 'en-GB',
        defaultCurrency: 'GBP',
        supportedCurrencies: ['GBP', 'EUR'],
        supportedLocales: [
            { id: 'en-GB', alias: 'en-GB', preferredCurrency: 'GBP' },
            { id: 'fr-FR', alias: 'fr-FR', preferredCurrency: 'EUR' },
        ],
    };

    const baseAppConfig = {
        ...mockConfig,
        url: { prefix: '/:siteId/:localeId' },
        siteAliasMap: { [mockSiteObject.id]: 'global' },
    };

    function callBuild({
        site = baseSite,
        appConfig = baseAppConfig,
        locale = baseSite.supportedLocales[0],
        requestOrigin = origin,
        pathname = '/global/en-GB/product/123',
        search = '',
    } = {}) {
        return buildSeoMetaDescriptors({
            site: site as any,
            appConfig: appConfig as any,
            origin: requestOrigin,
            locale: locale as any,
            location: { pathname, search },
        });
    }

    it('includes a canonical URL as the first descriptor', () => {
        const result = callBuild();
        expect(result[0]).toEqual({
            tagName: 'link',
            rel: 'canonical',
            href: 'https://www.example.com/global/en-GB/product/123',
        });
    });

    it('produces one hreflang alternate per supported locale', () => {
        const result = callBuild();
        const hreflangs = result.filter((d) => 'hrefLang' in d && d.hrefLang !== 'x-default');
        expect(hreflangs).toEqual([
            {
                tagName: 'link',
                rel: 'alternate',
                hrefLang: 'en-GB',
                href: 'https://www.example.com/global/en-GB/product/123',
            },
            {
                tagName: 'link',
                rel: 'alternate',
                hrefLang: 'fr-FR',
                href: 'https://www.example.com/global/fr-FR/product/123',
            },
        ]);
    });

    it('includes x-default pointing to the default locale', () => {
        const result = callBuild();
        const xDefault = result.find((d) => 'hrefLang' in d && d.hrefLang === 'x-default');
        expect(xDefault).toEqual({
            tagName: 'link',
            rel: 'alternate',
            hrefLang: 'x-default',
            href: 'https://www.example.com/global/en-GB/product/123',
        });
    });

    it('strips the current prefix when building alternates from a non-default locale', () => {
        const result = callBuild({
            locale: baseSite.supportedLocales[1],
            pathname: '/global/fr-FR/category/shoes',
        });
        const hreflangs = result.filter((d) => 'hrefLang' in d && d.hrefLang !== 'x-default');
        expect(hreflangs).toEqual([
            {
                tagName: 'link',
                rel: 'alternate',
                hrefLang: 'en-GB',
                href: 'https://www.example.com/global/en-GB/category/shoes',
            },
            {
                tagName: 'link',
                rel: 'alternate',
                hrefLang: 'fr-FR',
                href: 'https://www.example.com/global/fr-FR/category/shoes',
            },
        ]);
    });

    it('preserves content params and strips tracking params in canonical URL', () => {
        const result = callBuild({
            pathname: '/global/en-GB/search',
            search: '?q=shoes&utm_source=google',
        });
        expect(result[0]).toEqual({
            tagName: 'link',
            rel: 'canonical',
            href: 'https://www.example.com/global/en-GB/search?q=shoes',
        });
    });

    it('works on the root path (homepage)', () => {
        const result = callBuild({ pathname: '/global/en-GB' });
        const hreflangs = result.filter((d) => 'hrefLang' in d && d.hrefLang !== 'x-default');
        expect(hreflangs).toEqual([
            { tagName: 'link', rel: 'alternate', hrefLang: 'en-GB', href: 'https://www.example.com/global/en-GB' },
            { tagName: 'link', rel: 'alternate', hrefLang: 'fr-FR', href: 'https://www.example.com/global/fr-FR' },
        ]);
    });

    it('uses locale aliases when configured', () => {
        const aliasedLocales = [
            { id: 'en-GB', alias: 'en', preferredCurrency: 'GBP' },
            { id: 'fr-FR', alias: 'fr', preferredCurrency: 'EUR' },
        ];
        const result = callBuild({
            site: { ...baseSite, supportedLocales: aliasedLocales },
            locale: aliasedLocales[0],
            pathname: '/global/en/product/1',
        });
        const hreflangs = result.filter((d) => 'hrefLang' in d && d.hrefLang !== 'x-default');
        expect(hreflangs).toEqual([
            {
                tagName: 'link',
                rel: 'alternate',
                hrefLang: 'en-GB',
                href: 'https://www.example.com/global/en/product/1',
            },
            {
                tagName: 'link',
                rel: 'alternate',
                hrefLang: 'fr-FR',
                href: 'https://www.example.com/global/fr/product/1',
            },
        ]);
    });

    it('handles reversed prefix format (/:localeId/:siteId)', () => {
        const reversedAppConfig = {
            ...baseAppConfig,
            url: { prefix: '/:localeId/:siteId' },
        };
        const result = callBuild({
            appConfig: reversedAppConfig,
            pathname: '/en-GB/global/product/123',
        });
        const hreflangs = result.filter((d) => 'hrefLang' in d && d.hrefLang !== 'x-default');
        expect(hreflangs).toEqual([
            {
                tagName: 'link',
                rel: 'alternate',
                hrefLang: 'en-GB',
                href: 'https://www.example.com/en-GB/global/product/123',
            },
            {
                tagName: 'link',
                rel: 'alternate',
                hrefLang: 'fr-FR',
                href: 'https://www.example.com/fr-FR/global/product/123',
            },
        ]);
    });

    it('works without urlConfig prefix (no site context rewriting)', () => {
        const result = callBuild({
            site: {
                ...baseSite,
                alias: '',
                defaultLocale: 'en-US',
                supportedLocales: [{ id: 'en-US', alias: 'en-US', preferredCurrency: 'USD' }],
            },
            locale: { id: 'en-US', alias: 'en-US', preferredCurrency: 'USD' },
            appConfig: { ...baseAppConfig, url: undefined } as any,
            pathname: '/product/123',
        });
        const hreflangs = result.filter((d) => 'hrefLang' in d);
        expect(hreflangs).toEqual([
            { tagName: 'link', rel: 'alternate', hrefLang: 'en-US', href: 'https://www.example.com/product/123' },
            {
                tagName: 'link',
                rel: 'alternate',
                hrefLang: 'x-default',
                href: 'https://www.example.com/product/123',
            },
        ]);
    });
});
