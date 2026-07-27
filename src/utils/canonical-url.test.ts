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
import { buildCanonicalUrl } from './canonical-url';

describe('buildCanonicalUrl', () => {
    const origin = 'https://www.example.com';

    it('returns absolute URL with origin and path', () => {
        expect(buildCanonicalUrl(origin, '/category/mens-clothing')).toBe(
            'https://www.example.com/category/mens-clothing'
        );
    });

    it('preserves root path as-is', () => {
        expect(buildCanonicalUrl(origin, '/')).toBe('https://www.example.com/');
    });

    it('removes trailing slash from non-root paths', () => {
        expect(buildCanonicalUrl(origin, '/product/jacket/')).toBe('https://www.example.com/product/jacket');
    });

    describe('allowlisted content params', () => {
        it('preserves q param (search query)', () => {
            expect(buildCanonicalUrl(origin, '/search', '?q=shoes')).toBe('https://www.example.com/search?q=shoes');
        });

        it('preserves offset param (pagination)', () => {
            expect(buildCanonicalUrl(origin, '/category/mens', '?offset=24')).toBe(
                'https://www.example.com/category/mens?offset=24'
            );
        });

        it('preserves sort param', () => {
            expect(buildCanonicalUrl(origin, '/category/mens', '?sort=price-low-to-high')).toBe(
                'https://www.example.com/category/mens?sort=price-low-to-high'
            );
        });

        it('preserves refine param', () => {
            expect(buildCanonicalUrl(origin, '/category/mens', '?refine=c_refinementColor%3DBlue')).toBe(
                'https://www.example.com/category/mens?refine=c_refinementColor%3DBlue'
            );
        });

        it('preserves multiple refine params', () => {
            expect(
                buildCanonicalUrl(origin, '/category/mens', '?refine=c_refinementColor%3DBlue&refine=price%3D50..100')
            ).toBe('https://www.example.com/category/mens?refine=c_refinementColor%3DBlue&refine=price%3D50..100');
        });

        it('preserves pid param (product variant)', () => {
            expect(buildCanonicalUrl(origin, '/product/jacket', '?pid=variant-123')).toBe(
                'https://www.example.com/product/jacket?pid=variant-123'
            );
        });
    });

    describe('stripping non-allowlisted params', () => {
        it('strips tracking params alongside allowlisted ones', () => {
            expect(buildCanonicalUrl(origin, '/search', '?q=shoes&utm_source=google&fbclid=abc123&gclid=xyz')).toBe(
                'https://www.example.com/search?q=shoes'
            );
        });

        it('strips all params when none are allowlisted', () => {
            expect(buildCanonicalUrl(origin, '/product/shoes', '?utm_source=google&fbclid=abc&color=red')).toBe(
                'https://www.example.com/product/shoes'
            );
        });

        it('strips unknown params that are not in the allowlist', () => {
            expect(buildCanonicalUrl(origin, '/search', '?q=jacket&color=red&size=L&unknown=true')).toBe(
                'https://www.example.com/search?q=jacket'
            );
        });
    });

    describe('param ordering', () => {
        it('sorts retained params alphabetically for deterministic URLs', () => {
            const url1 = buildCanonicalUrl(origin, '/search', '?sort=price&q=jacket&offset=24');
            const url2 = buildCanonicalUrl(origin, '/search', '?q=jacket&offset=24&sort=price');
            expect(url1).toBe(url2);
            expect(url1).toBe('https://www.example.com/search?offset=24&q=jacket&sort=price');
        });
    });

    describe('edge cases', () => {
        it('handles empty search string', () => {
            expect(buildCanonicalUrl(origin, '/account', '')).toBe('https://www.example.com/account');
        });

        it('handles undefined search', () => {
            expect(buildCanonicalUrl(origin, '/account')).toBe('https://www.example.com/account');
        });

        it('returns empty string for invalid origin', () => {
            expect(buildCanonicalUrl('null', '/')).toBe('');
            expect(buildCanonicalUrl('', '/')).toBe('');
            expect(buildCanonicalUrl('not-a-url', '/page')).toBe('');
        });
    });
});
