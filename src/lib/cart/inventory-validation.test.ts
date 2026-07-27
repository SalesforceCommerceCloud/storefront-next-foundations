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

import { describe, test, expect } from 'vitest';
import { validateCartInventory } from './inventory-validation';
import type { ShopperBasketsV2, ShopperProducts } from '@/scapi';

describe('validateCartInventory', () => {
    describe('Basic validation', () => {
        test('returns no issues when all items are in stock', () => {
            const basket = {
                basketId: 'basket-1',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 2,
                        shipmentId: 'ship-1',
                        productName: 'Product 1',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const productsByItemId = {
                'item-1': {
                    id: 'prod-1',
                    name: 'Product 1',
                    inventory: { id: 'inv-1', ats: 10, orderable: true },
                },
            } as Record<string, ShopperProducts.schemas['Product']>;

            const result = validateCartInventory(basket, productsByItemId);

            expect(result.hasInventoryIssues).toBe(false);
            expect(result.itemsExceedingInventory).toHaveLength(0);
            expect(result.totalItemsWithIssues).toBe(0);
        });

        test('detects single item exceeding stock', () => {
            const basket = {
                basketId: 'basket-1',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 15,
                        shipmentId: 'ship-1',
                        productName: 'Product 1',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const productsByItemId = {
                'item-1': {
                    id: 'prod-1',
                    name: 'Product 1',
                    inventory: { id: 'inv-1', ats: 10, orderable: true },
                },
            } as Record<string, ShopperProducts.schemas['Product']>;

            const result = validateCartInventory(basket, productsByItemId);

            expect(result.hasInventoryIssues).toBe(true);
            expect(result.itemsExceedingInventory).toHaveLength(1);
            expect(result.totalItemsWithIssues).toBe(1);
            expect(result.itemsExceedingInventory[0]).toMatchObject({
                itemId: 'item-1',
                productId: 'prod-1',
                productName: 'Product 1',
                requestedQuantity: 15,
                availableStock: 10,
                isPickup: false,
            });
        });

        test('detects multiple items exceeding stock', () => {
            const basket = {
                basketId: 'basket-1',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 15,
                        shipmentId: 'ship-1',
                        productName: 'Product 1',
                    },
                    {
                        itemId: 'item-2',
                        productId: 'prod-2',
                        quantity: 20,
                        shipmentId: 'ship-1',
                        productName: 'Product 2',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const productsByItemId = {
                'item-1': {
                    id: 'prod-1',
                    name: 'Product 1',
                    inventory: { id: 'inv-1', ats: 10, orderable: true },
                },
                'item-2': {
                    id: 'prod-2',
                    name: 'Product 2',
                    inventory: { id: 'inv-2', ats: 5, orderable: true },
                },
            } as Record<string, ShopperProducts.schemas['Product']>;

            const result = validateCartInventory(basket, productsByItemId);

            expect(result.hasInventoryIssues).toBe(true);
            expect(result.itemsExceedingInventory).toHaveLength(2);
            expect(result.totalItemsWithIssues).toBe(2);
        });

        test('detects item with no stock (ats = 0)', () => {
            const basket = {
                basketId: 'basket-1',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 1,
                        shipmentId: 'ship-1',
                        productName: 'Out of Stock Product',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const productsByItemId = {
                'item-1': {
                    id: 'prod-1',
                    name: 'Out of Stock Product',
                    inventory: { id: 'inv-3', ats: 0, orderable: false },
                },
            } as Record<string, ShopperProducts.schemas['Product']>;

            const result = validateCartInventory(basket, productsByItemId);

            expect(result.hasInventoryIssues).toBe(true);
            expect(result.itemsExceedingInventory[0].availableStock).toBe(0);
        });

        test('uses productName from basket item when product name is missing', () => {
            const basket = {
                basketId: 'basket-1',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 15,
                        shipmentId: 'ship-1',
                        productName: 'Basket Product Name',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const productsByItemId = {
                'item-1': {
                    id: 'prod-1',
                    // No name property
                    inventory: { id: 'inv-1', ats: 10, orderable: true },
                },
            } as Record<string, ShopperProducts.schemas['Product']>;

            const result = validateCartInventory(basket, productsByItemId);

            expect(result.itemsExceedingInventory[0].productName).toBe('Basket Product Name');
        });

        test('uses "Unknown Product" when both basket and product name are missing', () => {
            const basket = {
                basketId: 'basket-1',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 15,
                        shipmentId: 'ship-1',
                        // No productName
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const productsByItemId = {
                'item-1': {
                    id: 'prod-1',
                    // No name
                    inventory: { id: 'inv-1', ats: 10, orderable: true },
                },
            } as Record<string, ShopperProducts.schemas['Product']>;

            const result = validateCartInventory(basket, productsByItemId);

            expect(result.itemsExceedingInventory[0].productName).toBe('Unknown Product');
        });
    });

    describe('Bonus products', () => {
        test('excludes bonus products from validation', () => {
            const basket = {
                basketId: 'basket-1',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 100,
                        bonusProductLineItem: true,
                        shipmentId: 'ship-1',
                        productName: 'Bonus Product',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const productsByItemId = {
                'item-1': {
                    id: 'prod-1',
                    name: 'Bonus Product',
                    inventory: { id: 'inv-2', ats: 5, orderable: true },
                },
            } as Record<string, ShopperProducts.schemas['Product']>;

            const result = validateCartInventory(basket, productsByItemId);

            expect(result.hasInventoryIssues).toBe(false);
            expect(result.itemsExceedingInventory).toHaveLength(0);
        });

        test('validates non-bonus items even when bonus items are present', () => {
            const basket = {
                basketId: 'basket-1',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 100,
                        bonusProductLineItem: true,
                        shipmentId: 'ship-1',
                        productName: 'Bonus Product',
                    },
                    {
                        itemId: 'item-2',
                        productId: 'prod-2',
                        quantity: 15,
                        shipmentId: 'ship-1',
                        productName: 'Regular Product',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const productsByItemId = {
                'item-1': {
                    id: 'prod-1',
                    name: 'Bonus Product',
                    inventory: { id: 'inv-2', ats: 5, orderable: true },
                },
                'item-2': {
                    id: 'prod-2',
                    name: 'Regular Product',
                    inventory: { id: 'inv-1', ats: 10, orderable: true },
                },
            } as Record<string, ShopperProducts.schemas['Product']>;

            const result = validateCartInventory(basket, productsByItemId);

            expect(result.hasInventoryIssues).toBe(true);
            expect(result.itemsExceedingInventory).toHaveLength(1);
            expect(result.itemsExceedingInventory[0].productId).toBe('prod-2');
        });
    });

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    describe('BOPIS (Store Pickup)', () => {
        test('validates pickup items against store inventory', () => {
            const basket = {
                basketId: 'basket-1',
                shipments: [{ shipmentId: 'ship-pickup', c_fromStoreId: 'store-123' }],
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 10,
                        shipmentId: 'ship-pickup',
                        inventoryId: 'inv-store-123',
                        productName: 'Product 1',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const productsByItemId = {
                'item-1': {
                    id: 'prod-1',
                    name: 'Product 1',
                    inventory: { id: 'inv-4', ats: 100, orderable: true },
                    inventories: [{ id: 'inv-store-123', stockLevel: 5, orderable: true }],
                },
            } as Record<string, ShopperProducts.schemas['Product']>;

            const result = validateCartInventory(basket, productsByItemId);

            expect(result.hasInventoryIssues).toBe(true);
            expect(result.itemsExceedingInventory[0]).toMatchObject({
                isPickup: true,
                storeId: 'store-123',
                availableStock: 5,
            });
        });

        test('validates delivery items against site inventory when store ID is not present', () => {
            const basket = {
                basketId: 'basket-1',
                shipments: [{ shipmentId: 'ship-delivery' }], // No c_fromStoreId
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 15,
                        shipmentId: 'ship-delivery',
                        productName: 'Product 1',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const productsByItemId = {
                'item-1': {
                    id: 'prod-1',
                    name: 'Product 1',
                    inventory: { id: 'inv-1', ats: 10, orderable: true },
                },
            } as Record<string, ShopperProducts.schemas['Product']>;

            const result = validateCartInventory(basket, productsByItemId);

            expect(result.hasInventoryIssues).toBe(true);
            expect(result.itemsExceedingInventory[0]).toMatchObject({
                isPickup: false,
                availableStock: 10,
            });
        });

        test('handles mixed pickup and delivery items', () => {
            const basket = {
                basketId: 'basket-1',
                shipments: [{ shipmentId: 'ship-pickup', c_fromStoreId: 'store-123' }, { shipmentId: 'ship-delivery' }],
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 8,
                        shipmentId: 'ship-pickup',
                        inventoryId: 'inv-store-123',
                        productName: 'Pickup Product',
                    },
                    {
                        itemId: 'item-2',
                        productId: 'prod-2',
                        quantity: 12,
                        shipmentId: 'ship-delivery',
                        productName: 'Delivery Product',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const productsByItemId = {
                'item-1': {
                    id: 'prod-1',
                    name: 'Pickup Product',
                    inventory: { id: 'inv-4', ats: 100, orderable: true },
                    inventories: [{ id: 'inv-store-123', stockLevel: 5, orderable: true }],
                },
                'item-2': {
                    id: 'prod-2',
                    name: 'Delivery Product',
                    inventory: { id: 'inv-1', ats: 10, orderable: true },
                },
            } as Record<string, ShopperProducts.schemas['Product']>;

            const result = validateCartInventory(basket, productsByItemId);

            expect(result.hasInventoryIssues).toBe(true);
            expect(result.itemsExceedingInventory).toHaveLength(2);
            expect(result.itemsExceedingInventory.find((i) => i.isPickup)).toBeTruthy();
            expect(result.itemsExceedingInventory.find((i) => !i.isPickup)).toBeTruthy();
        });
    });
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    describe('Edge cases', () => {
        test('handles empty basket', () => {
            const result = validateCartInventory(undefined, {});
            expect(result.hasInventoryIssues).toBe(false);
            expect(result.itemsExceedingInventory).toHaveLength(0);
            expect(result.totalItemsWithIssues).toBe(0);
        });

        test('handles basket with no product items', () => {
            const basket = {
                basketId: 'basket-1',
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            const result = validateCartInventory(basket, {});
            expect(result.hasInventoryIssues).toBe(false);
        });

        test('skips items without product data in mapping', () => {
            const basket = {
                basketId: 'basket-1',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 100,
                        shipmentId: 'ship-1',
                        productName: 'Product 1',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            // Empty product map - no product data available
            const result = validateCartInventory(basket, {});
            expect(result.hasInventoryIssues).toBe(false);
        });

        test('skips items missing itemId', () => {
            const basket = {
                basketId: 'basket-1',
                productItems: [
                    {
                        // Missing itemId
                        productId: 'prod-1',
                        quantity: 100,
                        shipmentId: 'ship-1',
                        productName: 'Product 1',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const productsByItemId = {
                'item-1': {
                    id: 'prod-1',
                    inventory: { id: 'inv-2', ats: 5, orderable: true },
                },
            } as Record<string, ShopperProducts.schemas['Product']>;

            const result = validateCartInventory(basket, productsByItemId);
            expect(result.hasInventoryIssues).toBe(false);
        });

        test('skips items missing productId', () => {
            const basket = {
                basketId: 'basket-1',
                productItems: [
                    {
                        itemId: 'item-1',
                        // Missing productId
                        quantity: 100,
                        shipmentId: 'ship-1',
                        productName: 'Product 1',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const result = validateCartInventory(basket, {});
            expect(result.hasInventoryIssues).toBe(false);
        });

        test('skips items missing quantity', () => {
            const basket = {
                basketId: 'basket-1',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        // Missing quantity
                        shipmentId: 'ship-1',
                        productName: 'Product 1',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const productsByItemId = {
                'item-1': {
                    id: 'prod-1',
                    inventory: { id: 'inv-2', ats: 5, orderable: true },
                },
            } as Record<string, ShopperProducts.schemas['Product']>;

            const result = validateCartInventory(basket, productsByItemId);
            expect(result.hasInventoryIssues).toBe(false);
        });

        test('handles basket with no shipments', () => {
            const basket = {
                basketId: 'basket-1',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 15,
                        shipmentId: 'ship-1',
                        productName: 'Product 1',
                    },
                ],
                // No shipments array
            } as ShopperBasketsV2.schemas['Basket'];

            const productsByItemId = {
                'item-1': {
                    id: 'prod-1',
                    name: 'Product 1',
                    inventory: { id: 'inv-1', ats: 10, orderable: true },
                },
            } as Record<string, ShopperProducts.schemas['Product']>;

            const result = validateCartInventory(basket, productsByItemId);

            expect(result.hasInventoryIssues).toBe(true);
            expect(result.itemsExceedingInventory[0].isPickup).toBe(false);
        });
    });
});
