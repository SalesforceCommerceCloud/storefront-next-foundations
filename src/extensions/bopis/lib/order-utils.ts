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

import type { ShopperOrders } from '@/scapi';

/**
 * Gets the pickup shipment with store pickup (c_fromStoreId) configured.
 *
 * This function iterates through the order's shipments and returns the first one
 * that has a c_fromStoreId value set, indicating it's configured for store pickup.
 *
 * @param order - The order containing shipments
 * @returns The first shipment with c_fromStoreId set, or undefined if none found
 */
export function getOrderPickupShipment(
    order: ShopperOrders.schemas['Order'] | null | undefined
): ShopperOrders.schemas['Shipment'] | undefined {
    return order?.shipments?.find((shipment) => Boolean(shipment.c_fromStoreId));
}

/**
 * Gets all delivery shipments (i.e. shipments that are *not* configured for store pickup).
 *
 * A shipment is considered "pickup" when it has a truthy `c_fromStoreId`. This function returns
 * all other shipments (including those with an empty string `c_fromStoreId`).
 *
 * @param order - The order containing shipments
 * @returns Array of delivery shipments, or an empty array if none found
 */
export function getOrderDeliveryShipments(
    order: ShopperOrders.schemas['Order'] | null | undefined
): ShopperOrders.schemas['Shipment'][] {
    return order?.shipments?.filter((shipment) => !shipment.c_fromStoreId) ?? [];
}

/**
 * Extracts unique store IDs from pickup shipments in the basket.
 *
 * This function collects all c_fromStoreId values from shipments that have
 * store pickup configured, returning them as a sorted array of unique values.
 * Useful for batch operations that need to know which stores are involved
 * in the current basket.
 *
 * @param order - The order containing shipments
 * @returns Sorted array of unique store IDs from pickup shipments, or empty array if none found
 *
 * @example
 * ```tsx
 * const order = getOrder(context);
 * const storeIds = getStoreIdsFromOrder(order);
 *
 * // Fetch store details for all stores in the order
 * const { data: stores } = useScapiFetcher({
 *     method: 'getStores',
 *     parameters: {
 *         ids: storeIds,
 *     },
 * });
 * ```
 */
export function getStoreIdsFromOrder(order: ShopperOrders.schemas['Order'] | null | undefined): string[] {
    // Collect unique store IDs from shipments
    const storeIds = new Set<string>();
    order?.shipments?.forEach((shipment) => {
        if (shipment.c_fromStoreId) {
            storeIds.add(shipment.c_fromStoreId as string);
        }
    });

    // Convert to array and sort, ensuring consistent order for cache keys
    return Array.from(storeIds).sort();
}
