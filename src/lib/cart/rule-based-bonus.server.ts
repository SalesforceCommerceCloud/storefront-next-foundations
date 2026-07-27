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
import type { ShopperBasketsV2, ShopperSearch } from '@/scapi';
import { fetchSearchProducts } from '@/lib/api/search.server';
import { isRuleBasedPromotion } from '@/lib/product/product-utils';
import { getLogger } from '@/lib/logger.server';

/**
 * Fetches rule-based bonus product hits per promotion for the cart route.
 *
 * "Rule-based" bonus discount line items have an empty `bonusProducts` array — products are resolved at request
 * time by SCAPI from a server-side rule attached to the promotion. This helper issues one `productSearch` call per
 * rule-based BLI in parallel, refining by `pmid=<promotionId>` and `pmpt=bonus`, and returns a
 * `Record<promotionId, ProductSearchHit[]>`.
 *
 * Per-promotion error isolation: if any single promotion's search rejects, the result for that promotion is `[]` —
 * other promotions still resolve. The function itself never throws.
 *
 * The cart loader chains this off `basketDataPromise` and exposes it as a deferred promise so the cart shell paints
 * without waiting on rule-based carousels (they sit below the fold).
 */
export async function fetchRuleBasedBonusProductsForBasket(
    context: LoaderFunctionArgs['context'],
    basket: ShopperBasketsV2.schemas['Basket'] | null,
    limit: number
): Promise<Record<string, ShopperSearch.schemas['ProductSearchHit'][]>> {
    const blis = basket?.bonusDiscountLineItems ?? [];
    if (blis.length === 0) {
        return {};
    }

    const ruleBased = blis.filter(
        (bli): bli is ShopperBasketsV2.schemas['BonusDiscountLineItem'] & { promotionId: string } =>
            isRuleBasedPromotion(bli)
    );
    if (ruleBased.length === 0) {
        return {};
    }

    const logger = getLogger(context);

    const entries = await Promise.all(
        ruleBased.map(async (bli) => {
            try {
                const result = await fetchSearchProducts(context, {
                    refine: [`pmid=${bli.promotionId}`, 'pmpt=bonus'],
                    limit,
                });
                return [bli.promotionId, result.hits ?? []] as const;
            } catch (error) {
                logger.warn('Cart rule-based bonus search failed', {
                    promotionId: bli.promotionId,
                    error,
                });
                return [bli.promotionId, []] as const;
            }
        })
    );

    return Object.fromEntries(entries);
}
