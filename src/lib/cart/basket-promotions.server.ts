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
import type { ShopperBasketsV2, ShopperPromotions } from '@/scapi';
import { fetchPromotionsByIds } from '@/lib/api/promotions.server';

/**
 * Fetches promotion details for promotion IDs found across a basket's product-item
 * `priceAdjustments` and its `bonusDiscountLineItems`.
 *
 * Bonus promotions surface as `bonusDiscountLineItems` (not as a `priceAdjustment` on the
 * purchased item), so their IDs must be collected separately — otherwise the bonus-product
 * rail in the cart has no promotion to resolve and falls back to a generic title.
 *
 * Composes `fetchPromotionsByIds` (which throws `NormalizedApiError` on failure) — does not
 * itself wrap or catch errors. Failures propagate to the caller.
 *
 * @returns A mapping of promotionId → promotion data (empty when no promotion IDs are present).
 */
export async function fetchPromotionsForBasket(
    context: LoaderFunctionArgs['context'],
    productItems: ShopperBasketsV2.schemas['ProductItem'][],
    bonusDiscountLineItems: ShopperBasketsV2.schemas['BonusDiscountLineItem'][] = []
): Promise<Record<string, ShopperPromotions.schemas['Promotion']>> {
    const promotionIds = new Set<string>();
    productItems.forEach((productItem) => {
        productItem.priceAdjustments?.forEach((adjustment) => {
            if (adjustment.promotionId) {
                promotionIds.add(adjustment.promotionId);
            }
        });
    });
    bonusDiscountLineItems.forEach((bonusItem) => {
        if (bonusItem.promotionId) {
            promotionIds.add(bonusItem.promotionId);
        }
    });

    if (promotionIds.size === 0) {
        return {};
    }

    const promotionsList = await fetchPromotionsByIds(context, Array.from(promotionIds));

    const promotions: Record<string, ShopperPromotions.schemas['Promotion']> = {};
    promotionsList.forEach((promotion) => {
        if (promotion.id) {
            promotions[promotion.id] = promotion;
        }
    });

    return promotions;
}
