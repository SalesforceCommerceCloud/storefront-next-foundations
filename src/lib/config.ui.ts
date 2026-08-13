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
 * Foundations Next per-page UI overrides:
 * - Shows the PDP rating summary's numeric average and "{count} reviews" label
 *   beside the stars (the design calls for "★★★★☆ 4.8 (124 reviews)"), instead of
 *   the count-only baseline.
 *
 * Every other flag matches the canonical baseline, so cart and category behaviour
 * is unchanged from the default — including `category.pagination`, which mirrors
 * the canonical load-more defaults verbatim (this override module must declare the
 * full `UIConfig` shape inline; see the mirror note below).
 */
interface UIConfig {
    pages: {
        cart: {
            showRecommendations: boolean;
            showLineItemVariantAttributes: boolean;
            showLineItemListPrice: boolean;
            showLineItemPromoBadge: boolean;
            showLineItemBonusBadge: boolean;
        };
        category: {
            showCategoryLabel: boolean;
            pagination: {
                mode: 'load-more' | 'traditional';
                batchSize: number;
                mobileBatchSize: number;
                maxProducts: number;
            };
            /** Opt-in: keep the `cgid` refinement in the sidebar as a single-select radio group. @default undefined */
            sidebarCategoryRefinement?: {
                enabled: boolean;
            };
        };
        product: {
            showRatingAverage: boolean;
        };
    };
}

export const uiConfig: UIConfig = {
    pages: {
        cart: {
            showRecommendations: true,
            showLineItemVariantAttributes: true,
            showLineItemListPrice: true,
            showLineItemPromoBadge: true,
            showLineItemBonusBadge: true,
        },
        category: {
            showCategoryLabel: false,
            pagination: {
                mode: 'load-more',
                batchSize: 24,
                mobileBatchSize: 12,
                maxProducts: 200,
            },
        },
        product: {
            showRatingAverage: true,
        },
    },
};
