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
import type { ShopperSearch } from '@/scapi';

/**
 * Type-safe query parameter keys for product search
 */
export type ProductSearchQueryKeys = keyof ShopperSearch.operations['productSearch']['parameters']['query'];

/**
 * Type-safe query parameter constants for product search
 * These constants ensure we use the correct parameter names as defined in the SCAPI client types
 */
export const PRODUCT_SEARCH_QUERY_PARAMS = {
    SORT: 'sort' as const,
    REFINE: 'refine' as const,
    Q: 'q' as const,
    SELECT: 'select' as const,
    CURRENCY: 'currency' as const,
    LOCALE: 'locale' as const,
    EXPAND: 'expand' as const,
    ALL_IMAGES: 'allImages' as const,
    PER_PRICEBOOK: 'perPricebook' as const,
    LIMIT: 'limit' as const,
    OFFSET: 'offset' as const,
    SITE_ID: 'siteId' as const,
} as const satisfies Record<string, ProductSearchQueryKeys>;

/**
 * Type-safe helper to get query parameter values
 * @param searchParams - URLSearchParams object
 * @param param - The query parameter key
 * @returns The parameter value or empty string
 */
export function getQueryParam(searchParams: URLSearchParams, param: ProductSearchQueryKeys): string {
    return searchParams.get(param) ?? '';
}

/**
 * Type-safe helper to get all query parameter values for array parameters
 * @param searchParams - URLSearchParams object
 * @param param - The query parameter key
 * @returns Array of parameter values
 */
export function getAllQueryParams(searchParams: URLSearchParams, param: ProductSearchQueryKeys): string[] {
    return searchParams.getAll(param);
}
