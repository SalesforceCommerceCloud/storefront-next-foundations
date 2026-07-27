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

import type { ShopperBasketsV2 } from '@/scapi';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

type ProductItem = Pick<ShopperBasketsV2.schemas['ProductItem'], 'productId' | 'quantity' | 'inventoryId'> & {
    storeId?: string | null;
};

/**
 * Asserts that all product items have both storeId and inventoryId (pickup items).
 * Throws an error if any item is missing either storeId or inventoryId.
 *
 * @param productItems - Array of product items to validate
 * @throws Error with translation key 'cart:addToCartValidation:mixedPickupDeliveryError' if validation fails
 *
 * @example
 * ```tsx
 * try {
 *   assertAllProductItemsPickup(productItems);
 *   // All items are pickup items, proceed with pickup shipment
 * } catch (error) {
 *   // Handle mixed pickup/delivery items error
 * }
 * ```
 */
export function assertAllProductItemsPickup(productItems: Array<ProductItem>): void {
    const allItemsArePickup = productItems.every((item) => item.storeId && item.inventoryId);

    if (!allItemsArePickup) {
        const { t } = getTranslation();
        throw new Error(t('extBopis:cart:addToCartValidation:mixedPickupDeliveryError'));
    }
}
