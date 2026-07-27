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
 * PLP-only product helpers (rating).
 * Kept in a separate module so cart and other routes don't pull this code.
 * Brand and short description are not derived from search hits here — search API
 * does not expose those fields in a reliable way for tiles.
 */

export type ProductSearchHitLike = {
    productId?: string;
    productName?: string;
    representedProduct?: Record<string, unknown>;
    [key: string]: unknown;
};

const MOCK_RATING = { rating: 4, reviewCount: 218 };

export function getProductRating(_product: ProductSearchHitLike): { rating: number; reviewCount: number } {
    return MOCK_RATING;
}
