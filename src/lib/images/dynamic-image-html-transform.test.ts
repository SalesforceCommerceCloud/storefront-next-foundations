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
import { describe, expect, test } from 'vitest';
import { transformHtmlImageUrls } from './dynamic-image';
import { mockConfig } from '@/test-utils/config';

describe('transformHtmlImageUrls()', () => {
    describe('basic transformations', () => {
        test('transforms single SFCC static URL to DIS', () => {
            const html =
                '<img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.jpg" alt="Product">';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('/dw/image/v2/ZZRF_001/');
            expect(result).toContain('.webp');
            expect(result).toContain('sfrm=jpg');
            expect(result).toContain('alt="Product"');
        });

        test('transforms multiple img tags', () => {
            const html = `
                <div>
                    <img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image1.jpg" alt="Image 1">
                    <p>Some text</p>
                    <img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image2.png" alt="Image 2">
                </div>
            `;
            const result = transformHtmlImageUrls(html, mockConfig);

            // Both images should be transformed
            expect(result).toContain('image1.webp?sfrm=jpg');
            expect(result).toContain('image2.webp?sfrm=png');
            // Original text should be preserved
            expect(result).toContain('<p>Some text</p>');
        });

        test('preserves other HTML attributes', () => {
            const html =
                '<img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.jpg" alt="Product" class="product-image" width="500" height="500">';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('alt="Product"');
            expect(result).toContain('class="product-image"');
            expect(result).toContain('width="500"');
            expect(result).toContain('height="500"');
            expect(result).toContain('.webp');
        });

        test('handles different attribute order', () => {
            const html =
                '<img alt="Product" class="image" src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.jpg" width="100">';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('.webp');
            expect(result).toContain('sfrm=jpg');
            expect(result).toContain('alt="Product"');
        });
    });

    describe('quote handling', () => {
        test('handles double quotes', () => {
            const html =
                '<img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.jpg" alt="Test">';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('.webp');
            expect(result).toContain('sfrm=jpg');
        });

        test('handles single quotes', () => {
            const html =
                "<img src='https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.jpg' alt='Test'>";
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('.webp');
            expect(result).toContain('sfrm=jpg');
        });

        test('handles mixed quotes in different attributes', () => {
            const html =
                '<img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.jpg" alt=\'Product\'>';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('.webp');
            expect(result).toContain("alt='Product'");
        });
    });

    describe('non-SFCC URLs', () => {
        test('leaves external URLs unchanged', () => {
            const html = '<img src="https://example.com/image.jpg" alt="External">';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toBe(html);
            expect(result).not.toContain('.webp');
            expect(result).not.toContain('sfrm=');
        });

        test('leaves relative URLs unchanged', () => {
            const html = '<img src="/images/local-image.jpg" alt="Local">';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toBe(html);
        });

        test('leaves CDN URLs unchanged', () => {
            const html = '<img src="https://cdn.example.com/assets/image.jpg" alt="CDN">';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toBe(html);
        });

        test('transforms SFCC URLs but leaves external URLs unchanged in same HTML', () => {
            const html = `
                <img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/sfcc.jpg">
                <img src="https://example.com/external.jpg">
            `;
            const result = transformHtmlImageUrls(html, mockConfig);

            // SFCC URL should be transformed
            expect(result).toContain('sfcc.webp?sfrm=jpg');
            // External URL should remain unchanged
            expect(result).toContain('https://example.com/external.jpg');
        });
    });

    describe('already transformed DIS URLs', () => {
        test('re-transforms existing DIS URL (adds quality if missing)', () => {
            const html =
                '<img src="https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-catalog/default/image.jpg" alt="DIS">';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('.webp');
            expect(result).toContain('q=70');
        });

        test('preserves DIS URL with quality already set', () => {
            const html =
                '<img src="https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-catalog/default/image.webp?sfrm=jpg&q=80" alt="DIS">';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('q=80');
            expect(result).not.toContain('q=70');
        });
    });

    describe('edge cases', () => {
        test('returns empty string for empty input', () => {
            expect(transformHtmlImageUrls('', mockConfig)).toBe('');
        });

        test('returns empty string for undefined input (via type coercion)', () => {
            // @ts-expect-error - testing runtime behavior
            expect(transformHtmlImageUrls(undefined, mockConfig)).toBe('');
        });

        test('returns empty string for null input (via type coercion)', () => {
            // @ts-expect-error - testing runtime behavior
            expect(transformHtmlImageUrls(null, mockConfig)).toBe('');
        });

        test('returns unchanged HTML with no img tags', () => {
            const html = '<div><p>Just text, no images</p></div>';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toBe(html);
        });

        test('handles HTML with only text content', () => {
            const html = 'Plain text with no HTML tags';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toBe(html);
        });

        test('handles malformed img tag (missing closing >)', () => {
            const html =
                '<img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.jpg"';
            const result = transformHtmlImageUrls(html, mockConfig);

            // Should not match and return unchanged
            expect(result).toBe(html);
        });

        test('handles img tag with no src attribute', () => {
            const html = '<img alt="No source">';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toBe(html);
        });

        test('handles self-closing img tags', () => {
            const html =
                '<img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.jpg" />';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('.webp');
            expect(result).toContain('sfrm=jpg');
        });

        test('handles img tags with query parameters in src', () => {
            const html =
                '<img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.jpg?width=500&height=500" alt="Query">';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('.webp');
            expect(result).toContain('sfrm=jpg');
        });

        test('handles img tags with fragments in src', () => {
            const html =
                '<img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.jpg#fragment" alt="Fragment">';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('.webp');
            expect(result).toContain('sfrm=jpg');
        });

        test('handles URLs with special characters (encoded)', () => {
            const html =
                '<img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image%20with%20spaces.jpg" alt="Encoded">';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('.webp');
            expect(result).toContain('sfrm=jpg');
        });

        test('only transforms src attribute when URL appears in multiple attributes', () => {
            // Edge case: same URL in src and data-backup attributes
            const url =
                'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.jpg';
            const html = `<img src="${url}" data-backup="${url}" alt="Test">`;
            const result = transformHtmlImageUrls(html, mockConfig);

            // src should be transformed
            expect(result).toMatch(/src="[^"]*\.webp[^"]*"/);
            // data-backup should remain unchanged (original URL)
            expect(result).toContain(`data-backup="${url}"`);
        });
    });

    describe('preserves HTML structure', () => {
        test('preserves nested HTML structure', () => {
            const html = `
                <div class="banner">
                    <div class="inner">
                        <img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/banner.jpg" alt="Banner">
                        <h1>Title</h1>
                    </div>
                </div>
            `;
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('<div class="banner">');
            expect(result).toContain('<div class="inner">');
            expect(result).toContain('<h1>Title</h1>');
            expect(result).toContain('</div>');
            expect(result).toContain('.webp');
        });

        test('preserves line breaks and whitespace', () => {
            const html = `
                <img
                    src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.jpg"
                    alt="Product"
                    class="image"
                >
            `;
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('.webp');
            // Whitespace structure should be generally preserved (though exact whitespace may vary)
            expect(result).toContain('alt="Product"');
            expect(result).toContain('class="image"');
        });

        test('handles complex HTML with multiple elements', () => {
            const html = `
                <div>
                    <p>Introduction text</p>
                    <img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/img1.jpg">
                    <div class="content">
                        <span>More text</span>
                        <img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/img2.png">
                    </div>
                    <footer>Footer text</footer>
                </div>
            `;
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('img1.webp?sfrm=jpg');
            expect(result).toContain('img2.webp?sfrm=png');
            expect(result).toContain('<p>Introduction text</p>');
            expect(result).toContain('<span>More text</span>');
            expect(result).toContain('<footer>Footer text</footer>');
        });
    });

    describe('image format detection', () => {
        test.each(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'])('transforms %s images correctly', (extension) => {
            const html = `<img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.${extension}">`;
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('.webp');
            expect(result).toContain(`sfrm=${extension}`);
        });

        test('handles uppercase file extensions', () => {
            const html =
                '<img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.JPG">';
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('.webp');
            expect(result).toContain('sfrm=jpg');
        });
    });

    describe('enableDis config', () => {
        const disDisabledConfig = {
            ...mockConfig,
            images: {
                ...mockConfig.images,
                enableDis: false,
            },
        } as typeof mockConfig;

        test('converts SFCC URL to relative path when DIS disabled', () => {
            const html =
                '<img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/image.jpg" alt="Product">';
            const result = transformHtmlImageUrls(html, disDisabledConfig);

            expect(result).toContain('src="/on/demandware.static/-/Sites-catalog/default/image.jpg"');
            expect(result).not.toContain('https://');
            expect(result).not.toContain('.webp');
            expect(result).toContain('alt="Product"');
        });

        test('converts DIS URL to relative path when DIS disabled', () => {
            const html =
                '<img src="https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-catalog/default/image.jpg" alt="DIS">';
            const result = transformHtmlImageUrls(html, disDisabledConfig);

            expect(result).toContain('src="/on/demandware.static/-/Sites-catalog/default/image.jpg"');
            expect(result).not.toContain('https://');
            expect(result).not.toContain('.webp');
        });
    });

    describe('real-world scenarios', () => {
        test('transforms promotion banner HTML from Business Manager', () => {
            const html = `
                <div class="promo-banner">
                    <img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/promo-banner.jpg"
                         alt="Special Offer"
                         style="width:100%;height:auto;">
                    <h2>20% Off Sale!</h2>
                </div>
            `;
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('promo-banner.webp?sfrm=jpg');
            expect(result).toContain('alt="Special Offer"');
            expect(result).toContain('style="width:100%;height:auto;"');
            expect(result).toContain('<h2>20% Off Sale!</h2>');
        });

        test('transforms category header menu banner', () => {
            const html = `
                <a href="/category/women">
                    <img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/category-women.jpg"
                         alt="Women's Category"
                         class="category-banner">
                </a>
            `;
            const result = transformHtmlImageUrls(html, mockConfig);

            expect(result).toContain('category-women.webp?sfrm=jpg');
            expect(result).toContain('alt="Women\'s Category"');
            expect(result).toContain('class="category-banner"');
            expect(result).toContain('<a href="/category/women">');
        });

        test('handles mixed content from Page Designer', () => {
            const html = `
                <div class="pd-component">
                    <h1>Featured Products</h1>
                    <div class="product-grid">
                        <div class="product">
                            <img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/product1.jpg" alt="Product 1">
                            <p>$29.99</p>
                        </div>
                        <div class="product">
                            <img src="https://example.com/external-ad.png" alt="Advertisement">
                            <p>External Ad</p>
                        </div>
                        <div class="product">
                            <img src="https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-catalog/default/product2.png" alt="Product 2">
                            <p>$39.99</p>
                        </div>
                    </div>
                </div>
            `;
            const result = transformHtmlImageUrls(html, mockConfig);

            // SFCC images should be transformed
            expect(result).toContain('product1.webp?sfrm=jpg');
            expect(result).toContain('product2.webp?sfrm=png');
            // External image should remain unchanged
            expect(result).toContain('https://example.com/external-ad.png');
            // Structure preserved
            expect(result).toContain('<h1>Featured Products</h1>');
            expect(result).toContain('$29.99');
        });
    });
});
