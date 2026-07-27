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

import { describe, it, expect } from 'vitest';
import type { ShopperBasketsV2 } from '@/scapi';
import { hashString, hashProductItems, hashShipments, getPickupItemsCacheKey } from './cache-utils';

describe('hashString', () => {
    it('returns consistent hash for the same string', () => {
        const str = 'test-string';
        const hash1 = hashString(str);
        const hash2 = hashString(str);
        expect(hash1).toBe(hash2);
    });

    it('returns different hashes for different strings', () => {
        const hash1 = hashString('string1');
        const hash2 = hashString('string2');
        expect(hash1).not.toBe(hash2);
    });

    it('handles empty string', () => {
        const hash = hashString('');
        expect(typeof hash).toBe('number');
        expect(hash).toBeGreaterThanOrEqual(0);
    });

    it('returns unsigned 32-bit integer', () => {
        const hash = hashString('test');
        expect(hash).toBeGreaterThanOrEqual(0);
        expect(hash).toBeLessThanOrEqual(0xffffffff);
        expect(Number.isInteger(hash)).toBe(true);
    });

    it('handles long strings', () => {
        const longString = 'a'.repeat(1000);
        const hash = hashString(longString);
        expect(typeof hash).toBe('number');
        expect(Number.isInteger(hash)).toBe(true);
    });

    it('handles special characters', () => {
        const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const hash = hashString(specialChars);
        expect(typeof hash).toBe('number');
    });
});

describe('hashProductItems', () => {
    it('returns 0 for undefined', () => {
        expect(hashProductItems(undefined)).toBe(0);
    });

    it('returns 0 for empty array', () => {
        expect(hashProductItems([])).toBe(0);
    });

    it('returns consistent hash for the same product items', () => {
        const productItems: ShopperBasketsV2.schemas['ProductItem'][] = [
            {
                productId: 'product-1',
                inventoryId: 'inventory-A',
                shipmentId: 'shipment-1',
                quantity: 1,
            },
        ];
        const hash1 = hashProductItems(productItems);
        const hash2 = hashProductItems(productItems);
        expect(hash1).toBe(hash2);
    });

    it('returns same hash regardless of order (order-independent)', () => {
        const items1: ShopperBasketsV2.schemas['ProductItem'][] = [
            {
                productId: 'product-1',
                inventoryId: 'inventory-A',
                shipmentId: 'shipment-1',
                quantity: 1,
            },
            {
                productId: 'product-2',
                inventoryId: 'inventory-B',
                shipmentId: 'shipment-1',
                quantity: 2,
            },
        ];
        const items2: ShopperBasketsV2.schemas['ProductItem'][] = [
            {
                productId: 'product-2',
                inventoryId: 'inventory-B',
                shipmentId: 'shipment-1',
                quantity: 2,
            },
            {
                productId: 'product-1',
                inventoryId: 'inventory-A',
                shipmentId: 'shipment-1',
                quantity: 1,
            },
        ];
        const hash1 = hashProductItems(items1);
        const hash2 = hashProductItems(items2);
        expect(hash1).toBe(hash2);
    });

    it('returns different hash when product items differ', () => {
        const items1: ShopperBasketsV2.schemas['ProductItem'][] = [
            {
                productId: 'product-1',
                inventoryId: 'inventory-A',
                shipmentId: 'shipment-1',
                quantity: 1,
            },
        ];
        const items2: ShopperBasketsV2.schemas['ProductItem'][] = [
            {
                productId: 'product-2',
                inventoryId: 'inventory-B',
                shipmentId: 'shipment-1',
                quantity: 1,
            },
        ];
        const hash1 = hashProductItems(items1);
        const hash2 = hashProductItems(items2);
        expect(hash1).not.toBe(hash2);
    });

    it('handles items with missing optional fields', () => {
        const productItems: ShopperBasketsV2.schemas['ProductItem'][] = [
            {
                productId: 'product-1',
                inventoryId: 'inventory-A',
                shipmentId: 'shipment-1',
                quantity: 1,
            },
        ];
        const hash = hashProductItems(productItems);
        expect(typeof hash).toBe('number');
        expect(hash).not.toBe(0);
    });

    it('handles multiple product items', () => {
        const productItems: ShopperBasketsV2.schemas['ProductItem'][] = [
            {
                productId: 'product-1',
                inventoryId: 'inventory-A',
                shipmentId: 'shipment-1',
                quantity: 1,
            },
            {
                productId: 'product-2',
                inventoryId: 'inventory-B',
                shipmentId: 'shipment-1',
                quantity: 2,
            },
            {
                productId: 'product-3',
                inventoryId: 'inventory-C',
                shipmentId: 'shipment-2',
                quantity: 1,
            },
        ];
        const hash = hashProductItems(productItems);
        expect(typeof hash).toBe('number');
        expect(hash).not.toBe(0);
    });
});

describe('hashShipments', () => {
    it('returns 0 for undefined', () => {
        expect(hashShipments(undefined)).toBe(0);
    });

    it('returns 0 for empty array', () => {
        expect(hashShipments([])).toBe(0);
    });

    it('returns consistent hash for the same shipments', () => {
        const shipments: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                shipmentId: 'shipment-1',
                c_fromStoreId: 'store-123',
            },
        ];
        const hash1 = hashShipments(shipments);
        const hash2 = hashShipments(shipments);
        expect(hash1).toBe(hash2);
    });

    it('returns same hash regardless of order (order-independent)', () => {
        const shipments1: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                shipmentId: 'shipment-1',
                c_fromStoreId: 'store-123',
            },
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
        ];
        const shipments2: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
            {
                shipmentId: 'shipment-1',
                c_fromStoreId: 'store-123',
            },
        ];
        const hash1 = hashShipments(shipments1);
        const hash2 = hashShipments(shipments2);
        expect(hash1).toBe(hash2);
    });

    it('returns different hash when shipments differ', () => {
        const shipments1: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                shipmentId: 'shipment-1',
                c_fromStoreId: 'store-123',
            },
        ];
        const shipments2: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                shipmentId: 'shipment-1',
                c_fromStoreId: 'store-456',
            },
        ];
        const hash1 = hashShipments(shipments1);
        const hash2 = hashShipments(shipments2);
        expect(hash1).not.toBe(hash2);
    });

    it('handles shipments without c_fromStoreId', () => {
        const shipments: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                shipmentId: 'shipment-1',
            },
        ];
        const hash = hashShipments(shipments);
        expect(typeof hash).toBe('number');
        expect(hash).toBe(0); // Should return 0 since no valid pickup shipments
    });

    it('skips shipments without shipmentId even if they have c_fromStoreId', () => {
        const shipments: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                // Missing shipmentId
                c_fromStoreId: 'store-123',
            } as unknown as ShopperBasketsV2.schemas['Shipment'],
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
        ];
        const hash = hashShipments(shipments);
        expect(typeof hash).toBe('number');
        expect(hash).not.toBe(0); // Should include shipment-2
        // Verify only shipment-2 is included by comparing with a single shipment
        const singleShipmentHash = hashShipments([
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
        ]);
        expect(hash).toBe(singleShipmentHash);
    });

    it('skips shipments where c_fromStoreId is not a string (number)', () => {
        const shipments: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                shipmentId: 'shipment-1',
                c_fromStoreId: 123 as unknown, // Not a string
            } as unknown as ShopperBasketsV2.schemas['Shipment'],
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
        ];
        const hash = hashShipments(shipments);
        expect(typeof hash).toBe('number');
        expect(hash).not.toBe(0); // Should include shipment-2
        // Verify only shipment-2 is included
        const singleShipmentHash = hashShipments([
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
        ]);
        expect(hash).toBe(singleShipmentHash);
    });

    it('skips shipments where c_fromStoreId is not a string (object)', () => {
        const shipments: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                shipmentId: 'shipment-1',
                c_fromStoreId: { id: 'store-123' } as unknown, // Not a string
            } as unknown as ShopperBasketsV2.schemas['Shipment'],
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
        ];
        const hash = hashShipments(shipments);
        expect(typeof hash).toBe('number');
        expect(hash).not.toBe(0); // Should include shipment-2
        // Verify only shipment-2 is included
        const singleShipmentHash = hashShipments([
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
        ]);
        expect(hash).toBe(singleShipmentHash);
    });

    it('skips shipments where c_fromStoreId is undefined', () => {
        const shipments: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                shipmentId: 'shipment-1',
                c_fromStoreId: undefined,
            } as unknown as ShopperBasketsV2.schemas['Shipment'],
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
        ];
        const hash = hashShipments(shipments);
        expect(typeof hash).toBe('number');
        expect(hash).not.toBe(0); // Should include shipment-2
        // Verify only shipment-2 is included
        const singleShipmentHash = hashShipments([
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
        ]);
        expect(hash).toBe(singleShipmentHash);
    });

    it('skips shipments where c_fromStoreId is null', () => {
        const shipments: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                shipmentId: 'shipment-1',
                c_fromStoreId: null as unknown, // Not a string
            } as unknown as ShopperBasketsV2.schemas['Shipment'],
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
        ];
        const hash = hashShipments(shipments);
        expect(typeof hash).toBe('number');
        expect(hash).not.toBe(0); // Should include shipment-2
        // Verify only shipment-2 is included
        const singleShipmentHash = hashShipments([
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
        ]);
        expect(hash).toBe(singleShipmentHash);
    });

    it('skips shipments with both missing shipmentId and invalid c_fromStoreId', () => {
        const shipments: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                // Missing shipmentId
                c_fromStoreId: 123 as unknown, // Also not a string
            } as unknown as ShopperBasketsV2.schemas['Shipment'],
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
        ];
        const hash = hashShipments(shipments);
        expect(typeof hash).toBe('number');
        expect(hash).not.toBe(0); // Should include shipment-2
        // Verify only shipment-2 is included
        const singleShipmentHash = hashShipments([
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
        ]);
        expect(hash).toBe(singleShipmentHash);
    });

    it('handles mixed valid and invalid shipments', () => {
        const shipments: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                shipmentId: 'shipment-1',
                c_fromStoreId: 'store-123', // Valid
            },
            {
                shipmentId: 'shipment-2',
                // Missing c_fromStoreId - invalid
            },
            {
                // Missing shipmentId - invalid
                c_fromStoreId: 'store-456',
            } as unknown as ShopperBasketsV2.schemas['Shipment'],
            {
                shipmentId: 'shipment-3',
                c_fromStoreId: 789 as unknown, // Not a string - invalid
            } as unknown as ShopperBasketsV2.schemas['Shipment'],
            {
                shipmentId: 'shipment-4',
                c_fromStoreId: 'store-789', // Valid
            },
        ];
        const hash = hashShipments(shipments);
        expect(typeof hash).toBe('number');
        expect(hash).not.toBe(0); // Should include shipment-1 and shipment-4
        // Verify only valid shipments are included
        const validShipmentsHash = hashShipments([
            {
                shipmentId: 'shipment-1',
                c_fromStoreId: 'store-123',
            },
            {
                shipmentId: 'shipment-4',
                c_fromStoreId: 'store-789',
            },
        ]);
        expect(hash).toBe(validShipmentsHash);
    });

    it('handles multiple shipments', () => {
        const shipments: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                shipmentId: 'shipment-1',
                c_fromStoreId: 'store-123',
            },
            {
                shipmentId: 'shipment-2',
                c_fromStoreId: 'store-456',
            },
        ];
        const hash = hashShipments(shipments);
        expect(typeof hash).toBe('number');
        expect(hash).not.toBe(0);
    });
});

describe('getPickupItemsCacheKey', () => {
    function createMockBasket(
        overrides?: Partial<ShopperBasketsV2.schemas['Basket']>
    ): ShopperBasketsV2.schemas['Basket'] {
        return {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
            productItems: [
                {
                    productId: 'product-1',
                    inventoryId: 'inventory-A',
                    shipmentId: 'shipment-1',
                    quantity: 1,
                },
            ],
            ...overrides,
        };
    }

    it('returns empty key and null hash data for undefined basket', () => {
        const [key, hashData] = getPickupItemsCacheKey(undefined, null);
        expect(key).toBe('');
        expect(hashData).toBeNull();
    });

    it('generates cache key for basket with no cached data', () => {
        const basket = createMockBasket();
        const [key, hashData] = getPickupItemsCacheKey(basket, null);

        expect(key).toBeTruthy();
        expect(key).toContain('-');
        expect(hashData).not.toBeNull();
        expect(hashData?.basketId).toBe('basket-1');
        expect(hashData?.productItems).toBe(basket.productItems);
        expect(hashData?.shipments).toBe(basket.shipments);
    });

    it('returns same key for same basket data', () => {
        const basket1 = createMockBasket();
        const basket2 = createMockBasket(); // Same data, different object reference

        const [key1] = getPickupItemsCacheKey(basket1, null);
        const [key2] = getPickupItemsCacheKey(basket2, null);

        expect(key1).toBe(key2);
    });

    it('returns different key when basketId changes', () => {
        const basket1 = createMockBasket({ basketId: 'basket-1' });
        const basket2 = createMockBasket({ basketId: 'basket-2' });

        const [key1] = getPickupItemsCacheKey(basket1, null);
        const [key2] = getPickupItemsCacheKey(basket2, null);

        expect(key1).not.toBe(key2);
    });

    it('returns different key when productItems change', () => {
        const basket1 = createMockBasket({
            productItems: [
                {
                    productId: 'product-1',
                    inventoryId: 'inventory-A',
                    shipmentId: 'shipment-1',
                    quantity: 1,
                },
            ],
        });
        const basket2 = createMockBasket({
            productItems: [
                {
                    productId: 'product-1',
                    inventoryId: 'inventory-A',
                    shipmentId: 'shipment-1',
                    quantity: 1,
                },
                {
                    productId: 'product-2',
                    inventoryId: 'inventory-B',
                    shipmentId: 'shipment-1',
                    quantity: 2,
                },
            ],
        });

        const [key1] = getPickupItemsCacheKey(basket1, null);
        const [key2] = getPickupItemsCacheKey(basket2, null);

        expect(key1).not.toBe(key2);
    });

    it('returns different key when shipments change', () => {
        const basket1 = createMockBasket({
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
        });
        const basket2 = createMockBasket({
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-456',
                },
            ],
        });

        const [key1] = getPickupItemsCacheKey(basket1, null);
        const [key2] = getPickupItemsCacheKey(basket2, null);

        expect(key1).not.toBe(key2);
    });

    it('uses incremental hashing when cached hash data exists and basketId matches', () => {
        const basket1 = createMockBasket();
        const [, hashData1] = getPickupItemsCacheKey(basket1, null);

        // Same basket, should reuse cached hash data
        const basket2 = createMockBasket();
        const [key2, hashData2] = getPickupItemsCacheKey(basket2, hashData1 ?? null);

        expect(key2).toBeTruthy();
        expect(hashData2).not.toBeNull();
    });

    it('recalculates all hashes when basketId changes (early exit)', () => {
        const basket1 = createMockBasket({ basketId: 'basket-1' });
        const [, hashData1] = getPickupItemsCacheKey(basket1, null);

        const basket2 = createMockBasket({ basketId: 'basket-2' });
        const [key2, hashData2] = getPickupItemsCacheKey(basket2, hashData1 ?? null);

        expect(key2).toBeTruthy();
        expect(hashData2?.basketId).toBe('basket-2');
        expect(hashData2?.basketIdHash).not.toBe(hashData1?.basketIdHash);
    });

    it('recalculates productItems hash when productItems array reference changes', () => {
        const basket1 = createMockBasket();
        const [, hashData1] = getPickupItemsCacheKey(basket1, null);

        const basket2 = createMockBasket({
            productItems: [
                {
                    productId: 'product-2',
                    inventoryId: 'inventory-B',
                    shipmentId: 'shipment-1',
                    quantity: 1,
                },
            ],
        });
        const [key2, hashData2] = getPickupItemsCacheKey(basket2, hashData1 ?? null);

        expect(key2).toBeTruthy();
        expect(hashData2?.productItemsHash).not.toBe(hashData1?.productItemsHash);
        expect(hashData2?.shipmentsHash).toBe(hashData1?.shipmentsHash); // Should reuse
    });

    it('recalculates shipments hash when shipments array reference changes', () => {
        const basket1 = createMockBasket();
        const [, hashData1] = getPickupItemsCacheKey(basket1, null);

        const basket2 = createMockBasket({
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-456',
                },
            ],
        });
        const [key2, hashData2] = getPickupItemsCacheKey(basket2, hashData1 ?? null);

        expect(key2).toBeTruthy();
        expect(hashData2?.shipmentsHash).not.toBe(hashData1?.shipmentsHash);
        expect(hashData2?.productItemsHash).toBe(hashData1?.productItemsHash); // Should reuse
    });

    it('reuses cached hashes when arrays have same reference', () => {
        const basket1 = createMockBasket();
        const [, hashData1] = getPickupItemsCacheKey(basket1, null);

        // Same basket object (same references)
        if (hashData1) {
            const [key2, hashData2] = getPickupItemsCacheKey(basket1, hashData1);

            expect(key2).toBeTruthy();
            expect(hashData2?.productItemsHash).toBe(hashData1.productItemsHash);
            expect(hashData2?.shipmentsHash).toBe(hashData1.shipmentsHash);
        }
    });

    it('handles basket with empty productItems and shipments', () => {
        const basket = createMockBasket({
            productItems: [],
            shipments: [],
        });
        const [key, hashData] = getPickupItemsCacheKey(basket, null);

        expect(key).toBeTruthy();
        expect(hashData).not.toBeNull();
        expect(hashData?.productItemsHash).toBe(0);
        expect(hashData?.shipmentsHash).toBe(0);
    });

    it('handles basket with undefined productItems and shipments', () => {
        const basket: ShopperBasketsV2.schemas['Basket'] = {
            basketId: 'basket-1',
        };
        const [key, hashData] = getPickupItemsCacheKey(basket, null);

        expect(key).toBeTruthy();
        expect(hashData).not.toBeNull();
        expect(hashData?.productItemsHash).toBe(0);
        expect(hashData?.shipmentsHash).toBe(0);
    });

    it('handles basket with empty basketId', () => {
        const basket = createMockBasket({ basketId: '' });
        const [key, hashData] = getPickupItemsCacheKey(basket, null);

        expect(key).toBeTruthy();
        expect(hashData).not.toBeNull();
        expect(hashData?.basketId).toBe('');
    });

    it('handles basket with undefined basketId', () => {
        const basket: ShopperBasketsV2.schemas['Basket'] = {
            basketId: undefined,
            productItems: [],
            shipments: [],
        };
        const [key, hashData] = getPickupItemsCacheKey(basket, null);

        expect(key).toBeTruthy();
        expect(hashData).not.toBeNull();
        expect(hashData?.basketId).toBe('');
    });
});
