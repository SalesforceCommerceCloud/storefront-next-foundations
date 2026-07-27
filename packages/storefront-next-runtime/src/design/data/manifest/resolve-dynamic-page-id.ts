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
import type { SiteManifest, IdentifierType } from '../types';
import { ContentAssignmentResolvers } from './content-assignment-resolvers';

/**
 * Looks up a single content assignment in the site manifest using the
 * resolver registered for the given identifier type, returning the first
 * matching `contentId` across the resolver's ordered key list. Returns
 * `null` when the identifier type has no resolver, or no key in the list
 * has an assignment for the requested aspect type.
 */
function lookupContentAssignment(
    id: string,
    identifierType: IdentifierType,
    aspectType: string,
    siteManifest?: SiteManifest | null
): string | null {
    const lookup = ContentAssignmentResolvers.get(identifierType)?.(id, siteManifest);

    if (!lookup) return null;

    for (const key of lookup.keys) {
        const assignment = siteManifest?.contentObjectAssignments?.[aspectType]?.[lookup.objectType]?.[key];

        if (assignment) {
            return assignment.contentId;
        }
    }

    return null;
}

/**
 * Converts a product or category identifier into a page ID by looking up
 * content assignments in the site manifest. For categories, the lookup
 * traverses the category hierarchy from the given category up to the root,
 * returning the first matching assignment.
 *
 * When the identifier type is `'product'` and no assignment is found, an
 * optional `categoryId` may be supplied as a fallback. The fallback is only
 * awaited and consulted after the product lookup misses, so callers that
 * resolve the product's category lazily (e.g. via a SCAPI request) don't
 * pay for the round trip on the happy path.
 *
 * Returns `null` if no content assignment is found for the identifier
 * (and the optional category fallback, when provided), or if the identifier
 * type has no registered resolver.
 *
 * @param options - The resolution options.
 * @param options.id - The identifier to resolve (product ID, category ID, or page ID).
 * @param options.identifierType - The type of identifier: `'product'`, `'category'`, or `'page'`.
 * @param options.aspectType - The aspect type to look up (e.g. `'pdp'`, `'plp'`).
 * @param options.siteManifest - The site manifest containing content assignments and category hierarchy.
 * @param options.categoryId - Optional fallback category ID (or a Promise resolving to one) used only when `identifierType` is `'product'` and the product lookup misses.
 * @returns The resolved page ID, or `null` if no assignment was found.
 *
 * @example
 * ```ts
 * import { resolveDynamicPageId } from '@salesforce/storefront-next-runtime/design/data';
 *
 * const siteManifest = {
 *     contentObjectAssignments: {
 *         plp: {
 *             category: {
 *                 'mens-shoes': {
 *                     lookupMode: 'category-explicit',
 *                     contentId: 'page-mens-shoes-plp',
 *                 },
 *             },
 *         },
 *     },
 *     categories: {
 *         'mens-running-shoes': { name: 'Running Shoes', parentCategory: 'mens-shoes' },
 *         'mens-shoes': { name: "Men's Shoes" },
 *     },
 * };
 *
 * // Direct match
 * await resolveDynamicPageId({ id: 'mens-shoes', identifierType: 'category', aspectType: 'plp', siteManifest });
 * // => 'page-mens-shoes-plp'
 *
 * // Inherited from parent category
 * await resolveDynamicPageId({ id: 'mens-running-shoes', identifierType: 'category', aspectType: 'plp', siteManifest });
 * // => 'page-mens-shoes-plp' (found via parent traversal)
 *
 * // Product missing but a category fallback is provided
 * await resolveDynamicPageId({
 *     id: 'unknown-product',
 *     identifierType: 'product',
 *     aspectType: 'plp',
 *     siteManifest,
 *     categoryId: 'mens-running-shoes',
 * });
 * // => 'page-mens-shoes-plp'
 * ```
 */
export async function resolveDynamicPageId<TIdentifier extends IdentifierType = IdentifierType>({
    id,
    identifierType,
    siteManifest,
    aspectType,
    categoryId,
}: {
    id: string;
    identifierType: TIdentifier;
    aspectType: string;
    siteManifest?: SiteManifest | null;
    categoryId?: string | Promise<string | null | undefined> | null;
}): Promise<string | null> {
    const direct = lookupContentAssignment(id, identifierType, aspectType, siteManifest);

    if (direct) return direct;

    if (identifierType !== 'product' || categoryId == null) return null;

    const resolvedCategoryId = await categoryId;

    if (!resolvedCategoryId) return null;

    return lookupContentAssignment(resolvedCategoryId, 'category', aspectType, siteManifest);
}
