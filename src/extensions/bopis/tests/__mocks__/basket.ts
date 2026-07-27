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

import type { ShopperBasketsV2, ShopperStores } from '@/scapi';
import { PICKUP_SHIPPING_METHOD_ID } from '../../constants';

/**
 * Creates a mock basket with pickup items for testing.
 *
 * This utility function generates a realistic basket structure with shipments and product items
 * based on the provided pickup items. Items are automatically grouped by storeId into shipments.
 *
 * @param pickupItems - Array of pickup items to include in the basket. Each item should have
 *                      productId, inventoryId, and storeId. If empty or undefined, returns an empty basket.
 * @param overrides - Optional partial basket object to override default values
 * @returns A mock basket with the specified pickup items
 *
 * @example
 * ```ts
 * const basket = createMockBasketWithPickupItems([
 *   { productId: 'product-1', inventoryId: 'inventory-A', storeId: 'store-1' },
 *   { productId: 'product-2', inventoryId: 'inventory-B', storeId: 'store-2' },
 * ]);
 * ```
 */
export function createMockBasketWithPickupItems(
    pickupItems?: Array<{ productId: string; inventoryId: string; storeId: string }>,
    overrides?: Partial<ShopperBasketsV2.schemas['Basket']>
): ShopperBasketsV2.schemas['Basket'] {
    if (!pickupItems || pickupItems.length === 0) {
        return {
            basketId: 'basket-1',
            shipments: [],
            productItems: [],
            ...overrides,
        };
    }

    // Group items by storeId to create shipments
    const storeMap = new Map<string, string[]>();
    pickupItems.forEach((item) => {
        const existing = storeMap.get(item.storeId) || [];
        storeMap.set(item.storeId, [...existing, item.productId]);
    });

    const shipments: ShopperBasketsV2.schemas['Shipment'][] = [];
    const productItems: ShopperBasketsV2.schemas['ProductItem'][] = [];

    let shipmentIdCounter = 1;
    storeMap.forEach((productIds, storeId) => {
        const shipmentId = `shipment-${shipmentIdCounter++}`;
        shipments.push({
            shipmentId,
            c_fromStoreId: storeId,
            shippingAddress: {
                // Store address - typical for BOPIS orders
                firstName: 'Test Store',
                lastName: 'Pickup',
                address1: '123 Main St',
                city: 'San Francisco',
                stateCode: 'CA',
                postalCode: '94102',
                countryCode: 'US',
                phone: '555-1234',
            },
            shippingMethod: {
                id: PICKUP_SHIPPING_METHOD_ID,
                name: 'Store Pickup',
                c_storePickupEnabled: true,
            },
        });

        pickupItems
            .filter((item) => productIds.includes(item.productId))
            .forEach((item) => {
                productItems.push({
                    productId: item.productId,
                    inventoryId: item.inventoryId,
                    shipmentId,
                    quantity: 1,
                    itemId: `item-${item.productId}`,
                });
            });
    });

    return {
        basketId: 'basket-1',
        shipments,
        productItems,
        ...overrides,
    };
}

/**
 * Creates a mock store for testing.
 *
 * This utility function generates a realistic store structure with common fields
 * populated with default values. The storeId and inventoryId can be explicitly provided,
 * and all other fields can be overridden via the overrides parameter.
 *
 * @param storeId - Store ID (defaults to 'store-1')
 * @param inventoryId - Inventory ID (defaults to 'inventory-1')
 * @param overrides - Optional partial store object to override default values
 * @returns A mock store with the specified storeId, inventoryId, and overrides
 *
 * @example
 * ```ts
 * const store = createMockStore('store-123', 'inventory-456', {
 *   name: 'Test Store',
 *   city: 'San Francisco',
 * });
 * ```
 */
export function createMockStore(
    storeId: string = 'store-1',
    inventoryId: string = 'inventory-1',
    overrides?: Partial<ShopperStores.schemas['Store']>
): ShopperStores.schemas['Store'] {
    return {
        id: storeId,
        inventoryId,
        name: 'Test Store',
        address1: '123 Main St',
        address2: 'Suite 100',
        city: 'San Francisco',
        stateCode: 'CA',
        postalCode: '94102',
        countryCode: 'US',
        phone: '555-1234',
        email: 'store@example.com',
        storeLocatorEnabled: true,
        ...overrides,
    };
}
