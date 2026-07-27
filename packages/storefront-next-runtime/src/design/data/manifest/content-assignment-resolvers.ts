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
import type { SiteManifest } from '../types';

/**
 * The result of resolving an identifier through a content assignment resolver.
 * Contains the object type, aspect type, and ordered list of keys to search
 * in the site manifest's content assignments.
 */
export interface ResolvedContentAssignmentLookup {
    /** The type of commerce object (e.g. `'product'`, `'category'`). */
    objectType: string;
    /** Ordered list of object IDs to search in the site manifest's content assignments. */
    keys: string[];
}

/**
 * A function that converts an identifier key (e.g., a product or category ID)
 * into a {@link ResolvedContentAssignmentLookup} describing where to search
 * in the site manifest for the assigned page ID.
 */
export type ContentAssignmentResolver = (
    key: string,
    manifest?: SiteManifest | null
) => ResolvedContentAssignmentLookup;

/**
 * Registry of content assignment resolvers keyed by {@link IdentifierType}.
 * Each resolver knows how to convert its identifier type into a set of lookup
 * keys for the site manifest.
 *
 * Built-in resolvers:
 * - **`'product'`** — Maps a product ID to a single PDP lookup key.
 * - **`'category'`** — Maps a category ID to an ordered list of keys that
 *   traverses the category hierarchy from child to root, enabling inherited
 *   page assignments.
 *
 * The `'page'` identifier type has no resolver — page IDs are used directly.
 *
 * @example
 * ```ts
 * import { ContentAssignmentResolvers } from '@salesforce/storefront-next-runtime/design/data';
 *
 * // Resolve a product identifier for PDP lookup
 * const productResolver = ContentAssignmentResolvers.get('product');
 * productResolver('nike-air-max-90');
 * // => { objectType: 'product', aspectType: 'pdp', keys: ['nike-air-max-90'] }
 *
 * // Resolve a category identifier — traverses hierarchy to find inherited assignments
 * const categoryResolver = ContentAssignmentResolvers.get('category');
 * const siteManifest = {
 *     categories: {
 *         'mens-running-shoes': { name: 'Running Shoes', parentCategory: 'mens-shoes' },
 *         'mens-shoes': { name: "Men's Shoes", parentCategory: 'mens' },
 *         'mens': { name: 'Men' },
 *     },
 *     contentObjectAssignments: {},
 * };
 * categoryResolver('mens-running-shoes', siteManifest);
 * // => { objectType: 'category', aspectType: 'plp', keys: ['mens-running-shoes', 'mens-shoes', 'mens'] }
 * ```
 */
export const ContentAssignmentResolvers = new Map<string, ContentAssignmentResolver>([
    [
        'product',
        (key) => ({
            objectType: 'product',
            keys: [key],
        }),
    ],
    [
        'category',
        (key, manifest) => {
            const keys = [];
            const visited = new Set<string>();

            let currentCategoryId: string | undefined = key;

            while (currentCategoryId && !visited.has(currentCategoryId)) {
                visited.add(currentCategoryId);
                keys.push(currentCategoryId);
                currentCategoryId = manifest?.categories[currentCategoryId]?.parentCategory;
            }

            return {
                objectType: 'category',
                keys,
            };
        },
    ],
]);
