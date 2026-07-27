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
import type { ShopperProducts } from '@/scapi';

type Product = ShopperProducts.schemas['Product'];

/**
 * Compute initial variation values for a product loaded into a modal flow
 * (cart-item add modal, bonus product modal). The fallback order mirrors
 * `useSelectedVariations` so behavior is consistent between the URL-driven PDP
 * picker and the controlled modal pickers.
 *
 * Priority:
 * 1. Product's own `variationValues` (variant products with merchant-set defaults)
 * 2. `representedProduct` hint when SCAPI provides one (master products with a
 *    merchant-configured default variant — typed off the open Product schema)
 * 3. First orderable variant's `variationValues` so the picker is immediately
 *    actionable (avoids selecting an incompatible color+size tuple)
 * 4. Single-value attributes are auto-selected when no other source supplies a
 *    value (e.g. a master with one color and many sizes)
 */
export function computeInitialVariationValues(product: Product): Record<string, string> {
    if (product.variationValues && Object.keys(product.variationValues).length > 0) {
        return { ...product.variationValues };
    }

    const representedProductId = (product as { representedProduct?: { id?: string } }).representedProduct?.id;
    const representedVariant = representedProductId
        ? product.variants?.find((v) => v.productId === representedProductId)
        : undefined;
    const fallbackVariant = representedVariant ?? product.variants?.find((v) => v.orderable) ?? product.variants?.[0];

    const seeded: Record<string, string> = { ...(fallbackVariant?.variationValues ?? {}) };

    product.variationAttributes?.forEach((attribute) => {
        if (!attribute.id || seeded[attribute.id]) return;
        if (attribute.values?.length === 1 && attribute.values[0]?.value) {
            seeded[attribute.id] = attribute.values[0].value;
        }
    });

    return seeded;
}
