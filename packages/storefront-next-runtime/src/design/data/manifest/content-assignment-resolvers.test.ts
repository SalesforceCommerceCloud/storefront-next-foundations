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
import { describe, test, expect } from 'vitest';
import { ContentAssignmentResolver, ContentAssignmentResolvers } from './content-assignment-resolvers';
import type { SiteManifest } from '../types';

describe('ContentAssignmentResolvers', () => {
    describe('product resolver', () => {
        test('returns single-key lookup for the product ID', () => {
            const resolver = ContentAssignmentResolvers.get('product') as ContentAssignmentResolver;
            const result = resolver('nike-air-max-90');
            expect(result).toEqual({
                objectType: 'product',
                keys: ['nike-air-max-90'],
            });
        });
    });

    describe('category resolver', () => {
        const manifest: SiteManifest = {
            contentObjectAssignments: {},
            categories: {
                'mens-running-shoes': { name: 'Running Shoes', parentCategory: 'mens-shoes' },
                'mens-shoes': { name: "Men's Shoes", parentCategory: 'mens' },
                mens: { name: 'Men' },
            },
        };

        test('traverses category hierarchy from child to root', () => {
            const resolver = ContentAssignmentResolvers.get('category') as ContentAssignmentResolver;
            const result = resolver('mens-running-shoes', manifest);
            expect(result).toEqual({
                objectType: 'category',
                keys: ['mens-running-shoes', 'mens-shoes', 'mens'],
            });
        });

        test('returns single key for root category', () => {
            const resolver = ContentAssignmentResolvers.get('category') as ContentAssignmentResolver;
            const result = resolver('mens', manifest);
            expect(result).toEqual({
                objectType: 'category',
                keys: ['mens'],
            });
        });

        test('returns single key when category is not in manifest', () => {
            const resolver = ContentAssignmentResolvers.get('category') as ContentAssignmentResolver;
            const result = resolver('unknown-category', manifest);
            expect(result).toEqual({
                objectType: 'category',
                keys: ['unknown-category'],
            });
        });

        test('handles undefined manifest', () => {
            const resolver = ContentAssignmentResolvers.get('category') as ContentAssignmentResolver;
            const result = resolver('some-category', undefined);
            expect(result).toEqual({
                objectType: 'category',
                keys: ['some-category'],
            });
        });

        test('handles cyclical category hierarchy without infinite loop', () => {
            const cyclicalManifest: SiteManifest = {
                contentObjectAssignments: {},
                categories: {
                    a: { name: 'A', parentCategory: 'b' },
                    b: { name: 'B', parentCategory: 'a' },
                },
            };
            const resolver = ContentAssignmentResolvers.get('category') as ContentAssignmentResolver;
            const result = resolver('a', cyclicalManifest);
            expect(result).toEqual({
                objectType: 'category',
                keys: ['a', 'b'],
            });
        });
    });

    test('has no resolver for "page" identifier type', () => {
        expect(ContentAssignmentResolvers.has('page')).toBe(false);
    });

    test('has resolvers for "product" and "category"', () => {
        expect(ContentAssignmentResolvers.has('product')).toBe(true);
        expect(ContentAssignmentResolvers.has('category')).toBe(true);
    });
});
