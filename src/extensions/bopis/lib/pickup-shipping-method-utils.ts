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
import { PICKUP_SHIPPING_METHOD_ID } from '@/extensions/bopis/constants';

type ShippingMethodWithPickup = ShopperBasketsV2.schemas['ShippingMethod'] & {
    c_storePickupEnabled?: boolean;
};

/**
 * Returns true if the shipping method is a pickup method.
 * Uses c_storePickupEnabled === true when set; falls back to id PICKUP_SHIPPING_METHOD_ID ('005').
 */
export function isPickupShippingMethod(method: ShopperBasketsV2.schemas['ShippingMethod']): boolean {
    return (
        (method as ShippingMethodWithPickup).c_storePickupEnabled === true || method.id === PICKUP_SHIPPING_METHOD_ID
    );
}

/**
 * Resolves the pickup shipping method ID from the API response.
 * Returns the id of the first applicable method that is a pickup method (c_storePickupEnabled or id '005').
 *
 * @param shippingMethodResult
 * @returns The pickup method id, or null if no pickup method found
 */
export function getPickupShippingMethodId(
    shippingMethodResult: ShopperBasketsV2.schemas['ShippingMethodResult'] | null | undefined
): string | null {
    const methods = shippingMethodResult?.applicableShippingMethods;
    if (!methods?.length) return null;

    const pickupMethod = methods.find(isPickupShippingMethod);
    return pickupMethod?.id ?? null;
}
