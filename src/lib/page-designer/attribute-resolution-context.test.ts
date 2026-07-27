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
import { describe, expect, it } from 'vitest';
import { buildStorefrontMediaUrl, createAttributeResolutionContext } from './attribute-resolution-context';

describe('buildStorefrontMediaUrl', () => {
    const ctx = { host: 'https://www.shop.example', siteId: 'RefArch', locale: 'en_US', fingerprint: 'v1' };

    it('builds the canonical /on/demandware.static URL for a library-rooted path', () => {
        const url = buildStorefrontMediaUrl(
            { libraryDomain: 'Library-Sites-MyLibrary', path: '/images/hero/banner.jpg' },
            ctx
        );

        expect(url).toBe(
            'https://www.shop.example/on/demandware.static/-/Library-Sites-MyLibrary/en_US/v1/images/hero/banner.jpg'
        );
    });

    it('substitutes the site segment when libraryDomain is `-` (site-rooted media)', () => {
        const url = buildStorefrontMediaUrl({ libraryDomain: '-', path: '/sites/asset.png' }, ctx);

        // ECOM convention: when the libraryDomain segment is `-`, the site segment becomes the site id.
        expect(url).toBe('https://www.shop.example/on/demandware.static/RefArch/-/en_US/v1/sites/asset.png');
    });

    it('uses ref.locale over ctx.locale when present', () => {
        const url = buildStorefrontMediaUrl(
            { libraryDomain: 'Library-Sites-MyLibrary', path: '/x.jpg', locale: 'fr_FR' },
            ctx
        );

        expect(url).toContain('/fr_FR/');
    });

    it('prepends a leading slash when path is missing one', () => {
        const url = buildStorefrontMediaUrl({ libraryDomain: 'Library-Sites-MyLibrary', path: 'images/x.jpg' }, ctx);

        expect(url.endsWith('/v1/images/x.jpg')).toBe(true);
    });

    it('omits the fingerprint segment entirely when no fingerprint is provided', () => {
        const url = buildStorefrontMediaUrl(
            { libraryDomain: 'Library-Sites-MyLibrary', path: '/images/x.jpg' },
            { host: 'https://www.shop.example', siteId: 'RefArch', locale: 'en_US' }
        );

        expect(url).toBe('https://www.shop.example/on/demandware.static/-/Library-Sites-MyLibrary/en_US/images/x.jpg');
    });

    it('omits the fingerprint segment when fingerprint is an empty string', () => {
        const url = buildStorefrontMediaUrl(
            { libraryDomain: 'Library-Sites-MyLibrary', path: '/images/x.jpg' },
            { host: 'https://www.shop.example', siteId: 'RefArch', locale: 'en_US', fingerprint: '' }
        );

        expect(url).toBe('https://www.shop.example/on/demandware.static/-/Library-Sites-MyLibrary/en_US/images/x.jpg');
    });
});

describe('createAttributeResolutionContext', () => {
    it('exposes host, locale, and a working resolveMediaUrl', () => {
        const ctx = createAttributeResolutionContext({
            host: 'https://www.shop.example',
            siteId: 'RefArch',
            locale: 'en_US',
        });

        expect(ctx.host).toBe('https://www.shop.example');
        expect(ctx.locale).toBe('en_US');
        // No fingerprint configured → segment is omitted from the URL.
        expect(ctx.resolveMediaUrl({ libraryDomain: 'Library-Sites-MyLibrary', path: '/x.jpg' })).toBe(
            'https://www.shop.example/on/demandware.static/-/Library-Sites-MyLibrary/en_US/x.jpg'
        );
    });

    it('pageLibraryDomain is set on the context when provided', () => {
        const ctx = createAttributeResolutionContext({
            host: 'https://www.shop.example',
            siteId: 'RefArch',
            locale: 'en_US',
            pageLibraryDomain: 'Library-Sites-RefArch-Site',
        });

        expect(ctx.pageLibraryDomain).toBe('Library-Sites-RefArch-Site');
    });

    it('honors a custom fingerprint override', () => {
        const ctx = createAttributeResolutionContext({
            host: 'https://www.shop.example',
            siteId: 'RefArch',
            locale: 'en_US',
            fingerprint: 'v42',
        });

        expect(ctx.resolveMediaUrl({ libraryDomain: 'Library-Sites-MyLibrary', path: '/x.jpg' })).toContain('/v42/');
    });
});
