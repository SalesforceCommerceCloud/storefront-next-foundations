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
 * Utility functions for constructing URLs in JSON-LD schemas.
 * These functions ensure that schema URLs always use the public storefront domain
 * and never expose internal routing URLs (AWS Lambda, CDN origins, etc.).
 */

import { resolveRequestOrigin } from '@/lib/origin';

/**
 * Get the public origin (scheme + host) from a request, respecting proxy headers.
 *
 * In serverless/proxied environments (AWS Lambda, Managed Runtime, CDN), the request.url
 * contains internal routing URLs. The actual public URL is available through forwarding headers.
 *
 * Delegates to `resolveRequestOrigin` so the auth and schema-URL paths share one parser
 * — same comma-split, leading-empty handling, and exact-match localhost detection.
 * Falls back to `request.url.origin` (which may be an internal URL on serverless) when
 * no headers are available, preserving JSON-LD's prior behavior of always returning a
 * non-null string.
 *
 * @param request - The incoming HTTP request
 * @returns The public origin (e.g., "https://example.com"), or falls back to request.url origin
 *
 * @example
 * ```ts
 * // In a loader:
 * const origin = getPublicOrigin(request);
 * const pageUrl = `${origin}${new URL(request.url).pathname}`;
 * ```
 */
export function getPublicOrigin(request: Request): string {
    const resolved = resolveRequestOrigin(request);
    if (resolved) return resolved;

    try {
        return new URL(request.url).origin;
    } catch {
        return '';
    }
}

/**
 * Build a complete public URL for use in JSON-LD schema.
 * This ensures schema URLs always use the public storefront domain and preserve
 * site/locale prefixes from the current page URL.
 *
 * @param options - URL building options
 * @param options.origin - Public origin from getPublicOrigin()
 * @param options.currentPageUrl - Current page URL (used to extract site/locale prefix)
 * @param options.path - Path to build (e.g., '/product/123', '/category/456')
 * @returns Complete absolute URL for schema, or undefined if inputs are invalid
 *
 * @example
 * ```ts
 * // From category page: /global/en-GB/category/womens
 * // Build product URL: /global/en-GB/product/123
 * const productUrl = buildSchemaUrl({
 *   origin: 'https://example.com',
 *   currentPageUrl: 'https://example.com/global/en-GB/category/womens',
 *   path: '/product/123'
 * });
 * // Result: 'https://example.com/global/en-GB/product/123'
 * ```
 */
export function buildSchemaUrl({
    origin,
    currentPageUrl,
    path,
}: {
    origin: string;
    currentPageUrl: string;
    path: string;
}): string | undefined {
    if (!origin || !path) return undefined;

    try {
        const pageUrl = new URL(currentPageUrl);

        // Extract the prefix (site/locale path segments) before the page type segment
        // Examples:
        // - /global/en-GB/category/123 -> prefix is /global/en-GB
        // - /en-US/product/456 -> prefix is /en-US
        // - /category/789 -> prefix is empty
        const pageTypeSegments = ['/category/', '/product/', '/search'];
        let prefix = '';

        for (const segment of pageTypeSegments) {
            const segmentIndex = pageUrl.pathname.indexOf(segment);
            if (segmentIndex >= 0) {
                prefix = pageUrl.pathname.slice(0, segmentIndex);
                break;
            }
        }

        // Ensure path starts with /
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;

        return `${origin}${prefix}${normalizedPath}`;
    } catch {
        // If URL parsing fails, return a basic concatenation
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${origin}${normalizedPath}`;
    }
}

/**
 * Build a product URL for JSON-LD schema.
 * Always constructs URLs based on the storefront domain, never using explicit URLs
 * from API responses which may contain internal routing URLs.
 *
 * @param options - Product URL building options
 * @param options.productId - Product ID
 * @param options.origin - Public origin from getPublicOrigin()
 * @param options.currentPageUrl - Current page URL (to preserve site/locale prefix)
 * @returns Complete product URL for schema, or undefined if productId is missing
 *
 * @example
 * ```ts
 * const productUrl = buildProductSchemaUrl({
 *   productId: '12345',
 *   origin: 'https://example.com',
 *   currentPageUrl: 'https://example.com/global/en-GB/category/womens'
 * });
 * // Result: 'https://example.com/global/en-GB/product/12345'
 * ```
 */
export function buildProductSchemaUrl({
    productId,
    origin,
    currentPageUrl,
}: {
    productId?: string;
    origin: string;
    currentPageUrl: string;
}): string | undefined {
    if (!productId) return undefined;

    return buildSchemaUrl({
        origin,
        currentPageUrl,
        path: `/product/${productId}`,
    });
}

/**
 * Build a category URL for JSON-LD schema.
 *
 * @param options - Category URL building options
 * @param options.categoryId - Category ID
 * @param options.origin - Public origin from getPublicOrigin()
 * @param options.currentPageUrl - Current page URL (to preserve site/locale prefix)
 * @returns Complete category URL for schema, or undefined if categoryId is missing
 *
 * @example
 * ```ts
 * const categoryUrl = buildCategorySchemaUrl({
 *   categoryId: 'womens-clothing',
 *   origin: 'https://example.com',
 *   currentPageUrl: 'https://example.com/global/en-GB/category/womens'
 * });
 * // Result: 'https://example.com/global/en-GB/category/womens-clothing'
 * ```
 */
export function buildCategorySchemaUrl({
    categoryId,
    origin,
    currentPageUrl,
}: {
    categoryId?: string;
    origin: string;
    currentPageUrl: string;
}): string | undefined {
    if (!categoryId) return undefined;

    return buildSchemaUrl({
        origin,
        currentPageUrl,
        path: `/category/${categoryId}`,
    });
}
