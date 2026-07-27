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
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperSearch, ShopperExperience } from '@/scapi';
import { siteContext, type SiteContext } from '@salesforce/storefront-next-runtime/site-context';
import { fetchSearchProducts } from '@/lib/api/search.server';

/**
 * Fetches products for the carousel scoped to a category.
 *
 * This is the single source of truth for how the carousel fetches products by category.
 * It is called both by the Page Designer loader (when a `categoryId` attribute is set) and
 * by route loaders that want to populate the carousel programmatically.
 */
export const fetchCarouselProducts = (
    context: LoaderFunctionArgs['context'],
    params: {
        /** Category ID to scope the product search (maps to the `cgid` SCAPI refinement) */
        categoryId: string;
        /** Maximum number of products to fetch. Defaults to 12. */
        limit?: number;
        /** Active currency code forwarded from site context */
        currency?: string;
    }
): Promise<ShopperSearch.schemas['ProductSearchResult']> =>
    fetchSearchProducts(context, {
        refine: [`cgid=${params.categoryId}`],
        limit: params.limit ?? 12,
        currency: params.currency,
    });

/**
 * Page Designer server loader.
 *
 * Reads the `categoryId` attribute set by the content author and delegates to
 * `fetchCarouselProducts`. When no `categoryId` is configured the loader returns
 * `null` so the carousel falls through to its existing region-tiles mode.
 */
const pdLoader = (args: {
    componentData: unknown;
    context: LoaderFunctionArgs['context'];
}): Promise<ShopperSearch.schemas['ProductSearchResult'] | null> => {
    const comp = args.componentData as ShopperExperience.schemas['Component'];
    const { categoryId, limit } = (comp.data ?? {}) as { categoryId?: string; limit?: number };

    if (!categoryId) {
        return Promise.resolve(null);
    }

    const { currency } = args.context.get(siteContext) as SiteContext;
    return fetchCarouselProducts(args.context, { categoryId, limit, currency: currency ?? undefined });
};

export const loader = pdLoader;
