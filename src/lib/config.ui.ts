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
 * Per-page UI configuration.
 *
 * The global app config (`config.server.ts`) is a single static module — it is
 * not resolved per build target and there is no merge layer, so a value placed
 * there is identical everywhere. This module is the override seam: the default
 * export below is the baseline, and a build target can shadow the whole module
 * with its own `lib/config.ui.ts` (resolved via the `@/` alias chain and
 * flattened at build time — same mechanism as `@/lib/fonts`).
 *
 * The shape intentionally mirrors the global config's `pages.*` tree so that if
 * an SDK-level config-override mechanism lands later, consumers can swap
 * `uiConfig.pages.cart.X` for `getConfig(context).pages.cart.X` with no other
 * change. Keep keys aligned with `config.server.ts`. Add new page sections here
 * as they need overridable UI flags.
 */
export interface UIConfig {
    pages: {
        cart: {
            /**
             * When true, the cart fetches and renders the below-the-fold
             * recommendation carousels. Gated in both the loader (skips the
             * Einstein calls when false) and the route render.
             *
             * @default true
             */
            showRecommendations: boolean;
            /**
             * When true, the cart line item (default variant) shows the
             * variation-attributes row (e.g. "Color: …", "Size: …").
             *
             * @default true
             */
            showLineItemVariantAttributes: boolean;
            /**
             * When true, the cart line item (default variant) shows the
             * strikethrough list price alongside the current price. When false,
             * only the current price renders (no list price, "From" prefix, or
             * inline `ProductPrice` promo callout). Note: this is the price
             * column's inline callout, NOT the separate "Saved $X" badge —
             * that is gated independently by `showLineItemPromoBadge`.
             *
             * @default true
             */
            showLineItemListPrice: boolean;
            /**
             * When true, the cart line item (default variant) shows the
             * "Saved $X" promotion badge in the price column.
             *
             * @default true
             */
            showLineItemPromoBadge: boolean;
            /**
             * When true, the cart line item (default variant) shows the
             * "Bonus Product" badge next to the title for bonus line items.
             *
             * @default true
             */
            showLineItemBonusBadge: boolean;
        };
        category: {
            /**
             * When true, the category page's QuickFilters renders a
             * "Shop by {label}" header (with a leading sparkles icon) before the
             * subcategory chips. The label is the active `cgid` refinement label.
             * The route computes the label and passes it to QuickFilters only
             * when this flag is on, so the chips-only baseline stays unchanged.
             *
             * @default false
             */
            showCategoryLabel: boolean;
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
        },
    },
};
