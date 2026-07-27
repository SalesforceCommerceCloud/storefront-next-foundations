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
import { getAddressKey } from '@/lib/address/address-utils';

/**
 * Return type for pickup shipment distribution analysis functions.
 */
export type PickupShipmentDistribution = {
    /** `true` if there are any items in pickup shipments */
    hasPickupItems: boolean;
    /** `true` if there are any items in delivery shipments */
    hasDeliveryItems: boolean;
    /** `true` if there are more than one delivery items (deliveryItemCount > 1) */
    enableMultiAddress: boolean;
    /** `true` if there are more than one unique delivery addresses */
    hasMultipleDeliveryAddresses: boolean;
    /** `true` if there are delivery shipments with items but no shipping address */
    hasUnaddressedDeliveryItems: boolean;
    /** `true` if any non-empty delivery shipment has a falsey shippingMethod */
    needsShippingMethods: boolean;
    /** `true` if there are any shipments with no items assigned */
    hasEmptyShipments: boolean;
    /** Function that returns `true` if the supplied item is in a delivery shipment */
    isDeliveryProductItem: (item: ShopperBasketsV2.schemas['ProductItem']) => boolean;
    /** Array of non-empty delivery shipments (shipments without c_fromStoreId) */
    deliveryShipments: ShopperBasketsV2.schemas['Shipment'][];
};

/**
 * Determines the shopper's current pickup and delivery shipment preferences,
 * especially for the purpose of determining the proper checkout flow.
 *
 * This function analyzes the basket's shipments and product items to determine:
 * - Whether there are any pickup items (items in shipments with c_fromStoreId)
 * - Whether there are any delivery items (items in shipments without c_fromStoreId)
 * - Whether there are more than one delivery items (enables multi-address checkout)
 * - Whether there are multiple unique delivery addresses
 *
 * Empty shipments (shipments with no assigned items) are always excluded from all
 * distribution flags except `hasEmptyShipments`. This ensures that empty shipments
 * do not affect pickup/delivery calculations or address checks.
 *
 * @param basket - The shopping basket containing shipments and product items
 * @returns Object containing flags for pickup/delivery distribution:
 *   - hasPickupItems: true if there are any items in pickup shipments
 *   - hasDeliveryItems: true if there are any items in delivery shipments
 *   - enableMultiAddress: true if there are more than one delivery items (deliveryItemCount > 1)
 *   - hasMultipleDeliveryAddresses: true if there are more than one unique delivery addresses
 *   - hasUnaddressedDeliveryItems: true if there are delivery shipments with items but no shipping address
 *   - needsShippingMethods: true if any non-empty delivery shipment has a falsey shippingMethod
 *   - hasEmptyShipments: true if there are any shipments with no items assigned
 *   - isDeliveryProductItem: function that returns true if the supplied item is in a delivery shipment
 *   - deliveryShipments: array of non-empty delivery shipments (shipments without c_fromStoreId)
 *
 * @example
 * ```tsx
 * const basket = (await getBasket(context)).current;
 * const distribution = getPickupShipmentDistribution(basket);
 *
 * if (distribution.hasPickupItems && distribution.hasDeliveryItems) {
 *   // Mixed basket - show combined checkout flow
 * } else if (distribution.hasPickupItems) {
 *   // Pickup only - show pickup checkout flow
 * } else if (distribution.hasMultipleDeliveryAddresses) {
 *   // Multiple addresses - show multiship checkout flow
 * } else {
 *   // Single delivery - show standard checkout flow
 * }
 * ```
 */
export function getPickupShipmentDistribution(basket?: ShopperBasketsV2.schemas['Basket']): PickupShipmentDistribution {
    // Early return if basket is invalid
    if (!basket?.shipments || !basket.productItems) {
        return {
            hasPickupItems: false,
            hasDeliveryItems: false,
            enableMultiAddress: false,
            hasMultipleDeliveryAddresses: false,
            hasUnaddressedDeliveryItems: false,
            needsShippingMethods: false,
            hasEmptyShipments: basket?.shipments ? basket.shipments.length > 0 : false,
            isDeliveryProductItem: (_item: ShopperBasketsV2.schemas['ProductItem']) => false,
            deliveryShipments: [],
        };
    }

    // Build a map of shipmentId -> item count for efficient lookups
    const shipmentItemCounts = new Map<string, number>();
    basket.productItems.forEach((item) => {
        if (item.shipmentId) {
            shipmentItemCounts.set(item.shipmentId, (shipmentItemCounts.get(item.shipmentId) || 0) + 1);
        }
    });

    // Always exclude empty shipments from all flags except hasEmptyShipments
    // Empty shipments should not affect pickup/delivery distribution calculations
    const relevantShipments = basket.shipments.filter((shipment) => {
        if (!shipment.shipmentId) return false;
        // Only include shipments that have at least one item assigned
        return (shipmentItemCounts.get(shipment.shipmentId) || 0) > 0;
    });

    // Separate pickup and delivery shipments and count delivery items
    const pickupShipments: ShopperBasketsV2.schemas['Shipment'][] = [];
    const deliveryShipments: ShopperBasketsV2.schemas['Shipment'][] = [];
    let deliveryItemCount = 0;

    relevantShipments.forEach((shipment) => {
        if (shipment.c_fromStoreId) {
            pickupShipments.push(shipment);
        } else {
            deliveryShipments.push(shipment);
            deliveryItemCount += shipmentItemCounts.get(shipment.shipmentId) as number;
        }
    });

    // Check for pickup items
    const hasPickupItems = pickupShipments.length > 0;

    // Check for delivery items
    const hasDeliveryItems = deliveryShipments.length > 0;

    // Check if we can use multiple delivery shipments
    const enableMultiAddress = deliveryItemCount > 1;

    // Check for multiple unique delivery addresses
    // Use address keys for efficient O(1) duplicate detection
    const uniqueAddressKeys = new Set<string>();
    deliveryShipments.forEach((shipment) => {
        if (!shipment.shippingAddress) return;
        const addressKey = getAddressKey(shipment.shippingAddress);
        uniqueAddressKeys.add(addressKey);
    });

    const hasMultipleDeliveryAddresses = uniqueAddressKeys.size > 1;

    // Check for unaddressed delivery items (delivery shipments with items but no address)
    const hasUnaddressedDeliveryItems = deliveryShipments.some((shipment) => {
        const itemCount = shipmentItemCounts.get(shipment.shipmentId || '') || 0;
        return itemCount > 0 && !shipment.shippingAddress;
    });

    // Check if any non-empty delivery shipment needs a shipping method
    const needsShippingMethods = deliveryShipments.some((shipment) => !shipment.shippingMethod);

    // Check for empty shipments (any shipment with no items assigned)
    const hasEmptyShipments = basket.shipments.some((shipment) => {
        if (!shipment.shipmentId) return false;
        return (shipmentItemCounts.get(shipment.shipmentId) || 0) === 0;
    });

    // Build a Set of delivery shipment IDs for O(1) lookup
    const deliveryShipmentIds = new Set<string>();
    deliveryShipments.forEach((shipment) => {
        if (shipment.shipmentId) {
            deliveryShipmentIds.add(shipment.shipmentId);
        }
    });

    // Create O(1) function to check if an item is in a delivery shipment
    const isDeliveryProductItem = (_item: ShopperBasketsV2.schemas['ProductItem']) => {
        return _item.shipmentId ? deliveryShipmentIds.has(_item.shipmentId) : false;
    };

    return {
        hasPickupItems,
        hasDeliveryItems,
        enableMultiAddress,
        hasMultipleDeliveryAddresses,
        hasUnaddressedDeliveryItems,
        needsShippingMethods,
        hasEmptyShipments,
        isDeliveryProductItem,
        deliveryShipments,
    };
}
