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

/**
 * Simple hash function (djb2 variant) for string hashing.
 * Fast and provides good distribution for cache keys.
 *
 * @param str - String to hash
 * @returns 32-bit unsigned integer hash
 */
export function hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) + hash + str.charCodeAt(i);
    }
    return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Cached hash data for incremental hashing optimization
 */
export interface CachedHashData {
    basketId: string;
    basketIdHash: number;
    productItems: ShopperBasketsV2.schemas['ProductItem'][] | undefined;
    productItemsHash: number;
    shipments: ShopperBasketsV2.schemas['Shipment'][] | undefined;
    shipmentsHash: number;
}

/**
 * Generates hash for product items array (order-independent)
 *
 * @param productItems - Array of product items to hash
 * @returns Hash value for the product items
 */
export function hashProductItems(productItems: ShopperBasketsV2.schemas['ProductItem'][] | undefined): number {
    if (!productItems || productItems.length === 0) {
        return 0;
    }

    // Hash each product item (order-independent by sorting numeric hashes)
    const productItemHashes: number[] = [];
    productItems.forEach((item) => {
        const itemKey = `${item.productId}-${item.shipmentId}-${item.inventoryId}`;
        productItemHashes.push(hashString(itemKey));
    });
    // Sort numeric hashes (much faster than sorting strings)
    productItemHashes.sort((a, b) => a - b);

    // Combine hashes deterministically
    return (
        productItemHashes.reduce((acc, hash) => {
            // Combine using djb2-style hash combination
            return (acc << 5) + acc + hash;
        }, 0) >>> 0
    );
}

/**
 * Generates hash for shipments array (order-independent)
 *
 * @param shipments - Array of shipments to hash
 * @returns Hash value for the shipments
 */
export function hashShipments(shipments: ShopperBasketsV2.schemas['Shipment'][] | undefined): number {
    if (!shipments || shipments.length === 0) {
        return 0;
    }

    // Hash each shipment (order-independent by sorting numeric hashes)
    // Only include shipments with valid c_fromStoreId (pickup shipments)
    const shipmentHashes: number[] = [];
    shipments.forEach((shipment) => {
        // Skip shipments without a valid store ID (not pickup shipments)
        if (!shipment.shipmentId || typeof shipment.c_fromStoreId !== 'string') {
            return;
        }
        const shipmentKey = `${shipment.shipmentId}-${shipment.c_fromStoreId}`;
        shipmentHashes.push(hashString(shipmentKey));
    });
    // Sort numeric hashes (much faster than sorting strings)
    shipmentHashes.sort((a, b) => a - b);

    // Combine hashes deterministically
    return (
        shipmentHashes.reduce((acc, hash) => {
            // Combine using djb2-style hash combination
            return (acc << 5) + acc + hash;
        }, 0) >>> 0
    );
}

/**
 * Generates a stable cache key from basket data for pickup items using hash-based approach.
 * Uses incremental hashing optimization: only recalculates hashes for changed data.
 *
 * @param basket - The shopping basket
 * @param cachedHashData - Previously cached hash data for incremental updates
 * @returns Tuple of [cacheKey, updatedCachedHashData]
 */
export function getPickupItemsCacheKey(
    basket: ShopperBasketsV2.schemas['Basket'] | undefined,
    cachedHashData: CachedHashData | null
): [string, CachedHashData | null] {
    if (!basket) {
        return ['', null];
    }

    const basketId = basket.basketId || '';
    const basketIdHash = hashString(basketId);

    // Early exit: if basketId changed, we know it's a different basket
    // Still need to calculate full key, but can skip incremental checks
    if (!cachedHashData || cachedHashData.basketId !== basketId) {
        const productItemsHash = hashProductItems(basket.productItems);
        const shipmentsHash = hashShipments(basket.shipments);
        const key = `${basketIdHash}-${productItemsHash}-${shipmentsHash}`;

        const newCachedHashData: CachedHashData = {
            basketId,
            basketIdHash,
            productItems: basket.productItems,
            productItemsHash,
            shipments: basket.shipments,
            shipmentsHash,
        };

        return [key, newCachedHashData];
    }

    // Incremental hashing: only recalculate if arrays changed
    let productItemsHash = cachedHashData.productItemsHash;
    if (cachedHashData.productItems !== basket.productItems) {
        productItemsHash = hashProductItems(basket.productItems);
    }

    let shipmentsHash = cachedHashData.shipmentsHash;
    if (cachedHashData.shipments !== basket.shipments) {
        shipmentsHash = hashShipments(basket.shipments);
    }

    const key = `${basketIdHash}-${productItemsHash}-${shipmentsHash}`;

    // Update cached data if anything changed
    const updatedCachedHashData: CachedHashData = {
        basketId,
        basketIdHash,
        productItems: basket.productItems,
        productItemsHash,
        shipments: basket.shipments,
        shipmentsHash,
    };

    return [key, updatedCachedHashData];
}
