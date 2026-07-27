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
import { describe, test, expect, vi } from 'vitest';
import { resolveDynamicPageId } from './resolve-dynamic-page-id';
import type { SiteManifest } from '../types';

const makeSiteManifest = (overrides: Partial<SiteManifest> = {}): SiteManifest => ({
    contentObjectAssignments: {},
    categories: {},
    ...overrides,
});

describe('resolveDynamicPageId', () => {
    describe('product identifier', () => {
        test('resolves product ID to page ID via content assignment', async () => {
            const siteManifest = makeSiteManifest({
                contentObjectAssignments: {
                    pdp: {
                        product: {
                            'nike-air-max-90': {
                                lookupMode: 'category-explicit',
                                contentId: 'page-nike-pdp',
                            },
                        },
                    },
                },
            });

            const result = await resolveDynamicPageId({
                id: 'nike-air-max-90',
                identifierType: 'product',
                aspectType: 'pdp',
                siteManifest,
            });
            expect(result).toBe('page-nike-pdp');
        });

        test('returns null when no assignment exists for the product', async () => {
            const result = await resolveDynamicPageId({
                id: 'unknown-product',
                identifierType: 'product',
                aspectType: 'pdp',
                siteManifest: makeSiteManifest(),
            });
            expect(result).toBeNull();
        });
    });

    describe('category identifier', () => {
        const siteManifest = makeSiteManifest({
            contentObjectAssignments: {
                plp: {
                    category: {
                        'mens-shoes': {
                            lookupMode: 'category-explicit',
                            contentId: 'page-mens-shoes-plp',
                        },
                    },
                },
            },
            categories: {
                'mens-running-shoes': { name: 'Running Shoes', parentCategory: 'mens-shoes' },
                'mens-shoes': { name: "Men's Shoes" },
            },
        });

        test('resolves direct category assignment', async () => {
            const result = await resolveDynamicPageId({
                id: 'mens-shoes',
                identifierType: 'category',
                aspectType: 'plp',
                siteManifest,
            });
            expect(result).toBe('page-mens-shoes-plp');
        });

        test('resolves via parent category traversal', async () => {
            const result = await resolveDynamicPageId({
                id: 'mens-running-shoes',
                identifierType: 'category',
                aspectType: 'plp',
                siteManifest,
            });
            expect(result).toBe('page-mens-shoes-plp');
        });

        test('returns null when no assignment found in hierarchy', async () => {
            const result = await resolveDynamicPageId({
                id: 'womens-shoes',
                identifierType: 'category',
                aspectType: 'plp',
                siteManifest,
            });
            expect(result).toBeNull();
        });
    });

    describe('product identifier with category fallback', () => {
        const siteManifest = makeSiteManifest({
            contentObjectAssignments: {
                pdp: {
                    product: {
                        'nike-air-max-90': {
                            lookupMode: 'category-explicit',
                            contentId: 'page-nike-pdp',
                        },
                    },
                    category: {
                        'mens-shoes': {
                            lookupMode: 'category-explicit',
                            contentId: 'page-mens-shoes-pdp',
                        },
                    },
                },
            },
            categories: {
                'mens-running-shoes': { name: 'Running Shoes', parentCategory: 'mens-shoes' },
                'mens-shoes': { name: "Men's Shoes" },
            },
        });

        test('falls back to category lookup when product is missing', async () => {
            const result = await resolveDynamicPageId({
                id: 'unknown-product',
                identifierType: 'product',
                aspectType: 'pdp',
                siteManifest,
                categoryId: 'mens-running-shoes',
            });
            expect(result).toBe('page-mens-shoes-pdp');
        });

        test('awaits a Promise category fallback', async () => {
            const result = await resolveDynamicPageId({
                id: 'unknown-product',
                identifierType: 'product',
                aspectType: 'pdp',
                siteManifest,
                categoryId: Promise.resolve('mens-shoes'),
            });
            expect(result).toBe('page-mens-shoes-pdp');
        });

        test('does not consult the category fallback when the product hits', async () => {
            const categoryId = vi.fn(() => Promise.resolve('mens-shoes'));
            const result = await resolveDynamicPageId({
                id: 'nike-air-max-90',
                identifierType: 'product',
                aspectType: 'pdp',
                siteManifest,
                categoryId: categoryId(),
            });
            expect(result).toBe('page-nike-pdp');
            // Promise was created but no category lookup was attempted —
            // the manifest has no product hit so we don't traverse hierarchy.
            expect(categoryId).toHaveBeenCalledTimes(1);
        });

        test('returns null when both product and category miss', async () => {
            const result = await resolveDynamicPageId({
                id: 'unknown-product',
                identifierType: 'product',
                aspectType: 'pdp',
                siteManifest,
                categoryId: 'womens-shoes',
            });
            expect(result).toBeNull();
        });

        test('returns null when the category Promise resolves to null', async () => {
            const result = await resolveDynamicPageId({
                id: 'unknown-product',
                identifierType: 'product',
                aspectType: 'pdp',
                siteManifest,
                categoryId: Promise.resolve(null),
            });
            expect(result).toBeNull();
        });

        test('ignores categoryId fallback for category identifier type', async () => {
            const result = await resolveDynamicPageId({
                id: 'womens-shoes',
                identifierType: 'category',
                aspectType: 'pdp',
                siteManifest,
                categoryId: 'mens-shoes',
            });
            expect(result).toBeNull();
        });
    });

    test('returns null when identifier type has no resolver', async () => {
        const result = await resolveDynamicPageId({
            id: 'some-page-id',
            identifierType: 'page',
            aspectType: 'pdp',
            siteManifest: makeSiteManifest(),
        });
        expect(result).toBeNull();
    });

    test('returns null when site manifest is undefined', async () => {
        const result = await resolveDynamicPageId({
            id: 'some-product',
            identifierType: 'product',
            aspectType: 'pdp',
            siteManifest: undefined,
        });
        expect(result).toBeNull();
    });

    test('uses the correct aspect type for lookup', async () => {
        const siteManifest = makeSiteManifest({
            contentObjectAssignments: {
                pdp: { product: { 'prod-1': { lookupMode: 'category-explicit', contentId: 'page-pdp' } } },
                plp: { product: { 'prod-1': { lookupMode: 'category-explicit', contentId: 'page-plp' } } },
            },
        });

        expect(
            await resolveDynamicPageId({ id: 'prod-1', identifierType: 'product', aspectType: 'pdp', siteManifest })
        ).toBe('page-pdp');
        expect(
            await resolveDynamicPageId({ id: 'prod-1', identifierType: 'product', aspectType: 'plp', siteManifest })
        ).toBe('page-plp');
    });
});
