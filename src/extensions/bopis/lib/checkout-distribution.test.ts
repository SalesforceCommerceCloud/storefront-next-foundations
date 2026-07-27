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
import { getPickupShipmentDistribution } from './checkout-distribution';

describe('getPickupShipmentDistribution', () => {
    describe('edge cases', () => {
        it('returns all false flags when basket is undefined', () => {
            const result = getPickupShipmentDistribution(undefined);
            expect(result).toEqual({
                hasPickupItems: false,
                hasDeliveryItems: false,
                enableMultiAddress: false,
                hasMultipleDeliveryAddresses: false,
                hasUnaddressedDeliveryItems: false,
                needsShippingMethods: false,
                hasEmptyShipments: false,
                isDeliveryProductItem: expect.any(Function),
                deliveryShipments: [],
            });
            // Verify the function returns false for any item
            expect(result.isDeliveryProductItem({ itemId: 'test' })).toBe(false);
        });

        it('returns all false flags when basket has no shipments', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 1,
                        itemId: 'item-1',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result).toEqual({
                hasPickupItems: false,
                hasDeliveryItems: false,
                enableMultiAddress: false,
                hasMultipleDeliveryAddresses: false,
                hasUnaddressedDeliveryItems: false,
                needsShippingMethods: false,
                hasEmptyShipments: false,
                isDeliveryProductItem: expect.any(Function),
                deliveryShipments: [],
            });
            // Verify the function returns false for any item
            expect(result.isDeliveryProductItem({ itemId: 'test' })).toBe(false);
        });

        it('returns all false flags except hasEmptyShipments when basket has shipments but no product items', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        c_fromStoreId: 'store-1',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result).toEqual({
                hasPickupItems: false,
                hasDeliveryItems: false,
                enableMultiAddress: false,
                hasMultipleDeliveryAddresses: false,
                hasUnaddressedDeliveryItems: false,
                needsShippingMethods: false,
                hasEmptyShipments: true,
                isDeliveryProductItem: expect.any(Function),
                deliveryShipments: [],
            });
            // Verify the function returns false for any item (no delivery shipments)
            expect(result.isDeliveryProductItem({ itemId: 'test' })).toBe(false);
        });

        it('returns hasEmptyShipments true when basket has empty shipments', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                    },
                    {
                        shipmentId: 'shipment-2',
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasEmptyShipments).toBe(true);
        });
    });

    describe('pickup items detection', () => {
        it('detects pickup items when shipment has c_fromStoreId', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
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
                        inventoryId: 'inventory-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasPickupItems).toBe(true);
            expect(result.hasDeliveryItems).toBe(false);
        });

        it('detects multiple pickup shipments', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        c_fromStoreId: 'store-1',
                    },
                    {
                        shipmentId: 'shipment-2',
                        c_fromStoreId: 'store-2',
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        inventoryId: 'inventory-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                    {
                        productId: 'product-2',
                        inventoryId: 'inventory-2',
                        quantity: 1,
                        itemId: 'item-2',
                        shipmentId: 'shipment-2',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasPickupItems).toBe(true);
            expect(result.hasDeliveryItems).toBe(false);
        });
    });

    describe('delivery items detection', () => {
        it('detects delivery items when shipment has no c_fromStoreId', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'San Francisco',
                            stateCode: 'CA',
                            postalCode: '94102',
                            countryCode: 'US',
                        },
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasPickupItems).toBe(false);
            expect(result.hasDeliveryItems).toBe(true);
            expect(result.enableMultiAddress).toBe(false);
        });

        it('detects multiple delivery items', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'San Francisco',
                            stateCode: 'CA',
                            postalCode: '94102',
                            countryCode: 'US',
                        },
                    },
                    {
                        shipmentId: 'shipment-2',
                        shippingAddress: {
                            firstName: 'Jane',
                            lastName: 'Smith',
                            address1: '456 Oak Ave',
                            city: 'Los Angeles',
                            stateCode: 'CA',
                            postalCode: '90001',
                            countryCode: 'US',
                        },
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                    {
                        productId: 'product-2',
                        quantity: 1,
                        itemId: 'item-2',
                        shipmentId: 'shipment-2',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasDeliveryItems).toBe(true);
            expect(result.enableMultiAddress).toBe(true);
        });
    });

    describe('mixed pickup and delivery', () => {
        it('detects both pickup and delivery items', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        c_fromStoreId: 'store-123',
                    },
                    {
                        shipmentId: 'shipment-2',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'San Francisco',
                            stateCode: 'CA',
                            postalCode: '94102',
                            countryCode: 'US',
                        },
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        inventoryId: 'inventory-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                    {
                        productId: 'product-2',
                        quantity: 1,
                        itemId: 'item-2',
                        shipmentId: 'shipment-2',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasPickupItems).toBe(true);
            expect(result.hasDeliveryItems).toBe(true);
        });
    });

    describe('multiple delivery addresses', () => {
        it('detects multiple unique delivery addresses', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'San Francisco',
                            stateCode: 'CA',
                            postalCode: '94102',
                            countryCode: 'US',
                        },
                    },
                    {
                        shipmentId: 'shipment-2',
                        shippingAddress: {
                            firstName: 'Jane',
                            lastName: 'Smith',
                            address1: '456 Oak Ave',
                            city: 'Los Angeles',
                            stateCode: 'CA',
                            postalCode: '90001',
                            countryCode: 'US',
                        },
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                    {
                        productId: 'product-2',
                        quantity: 1,
                        itemId: 'item-2',
                        shipmentId: 'shipment-2',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasMultipleDeliveryAddresses).toBe(true);
        });

        it('does not detect multiple addresses when addresses are the same', () => {
            const sameAddress = {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'San Francisco',
                stateCode: 'CA',
                postalCode: '94102',
                countryCode: 'US',
            };
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: sameAddress,
                    },
                    {
                        shipmentId: 'shipment-2',
                        shippingAddress: { ...sameAddress },
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                    {
                        productId: 'product-2',
                        quantity: 1,
                        itemId: 'item-2',
                        shipmentId: 'shipment-2',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasMultipleDeliveryAddresses).toBe(false);
        });

        it('normalizes address fields for comparison', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'San Francisco',
                            stateCode: 'CA',
                            postalCode: '94102',
                            countryCode: 'US',
                        },
                    },
                    {
                        shipmentId: 'shipment-2',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'San Francisco',
                            stateCode: 'CA',
                            postalCode: '94102',
                            countryCode: 'US',
                            phone: '555-1234', // Additional field should not affect comparison
                        },
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                    {
                        productId: 'product-2',
                        quantity: 1,
                        itemId: 'item-2',
                        shipmentId: 'shipment-2',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasMultipleDeliveryAddresses).toBe(false);
        });
    });

    describe('unaddressed delivery items', () => {
        it('detects unaddressed delivery items', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        // No shippingAddress
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasUnaddressedDeliveryItems).toBe(true);
            expect(result.hasDeliveryItems).toBe(true);
        });

        it('does not flag pickup shipments without addresses as unaddressed', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        c_fromStoreId: 'store-123',
                        // No shippingAddress - this is fine for pickup
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        inventoryId: 'inventory-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasUnaddressedDeliveryItems).toBe(false);
            expect(result.hasPickupItems).toBe(true);
        });

        it('does not flag addressed delivery shipments as unaddressed', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'San Francisco',
                            stateCode: 'CA',
                            postalCode: '94102',
                            countryCode: 'US',
                        },
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasUnaddressedDeliveryItems).toBe(false);
        });
    });

    describe('needsShippingMethods', () => {
        it('detects when delivery shipment needs a shipping method', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'San Francisco',
                            stateCode: 'CA',
                            postalCode: '94102',
                            countryCode: 'US',
                        },
                        // No shippingMethod
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.needsShippingMethods).toBe(true);
            expect(result.hasDeliveryItems).toBe(true);
        });

        it('does not flag pickup shipments without shipping methods', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        c_fromStoreId: 'store-123',
                        // No shippingMethod - this is fine for pickup
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        inventoryId: 'inventory-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.needsShippingMethods).toBe(false);
            expect(result.hasPickupItems).toBe(true);
        });

        it('does not flag delivery shipments with shipping methods', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'San Francisco',
                            stateCode: 'CA',
                            postalCode: '94102',
                            countryCode: 'US',
                        },
                        shippingMethod: {
                            id: 'method-1',
                            name: 'Standard Shipping',
                        },
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.needsShippingMethods).toBe(false);
        });

        it('detects when any delivery shipment needs a shipping method', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'San Francisco',
                            stateCode: 'CA',
                            postalCode: '94102',
                            countryCode: 'US',
                        },
                        shippingMethod: {
                            id: 'method-1',
                            name: 'Standard Shipping',
                        },
                    },
                    {
                        shipmentId: 'shipment-2',
                        shippingAddress: {
                            firstName: 'Jane',
                            lastName: 'Smith',
                            address1: '456 Oak Ave',
                            city: 'Los Angeles',
                            stateCode: 'CA',
                            postalCode: '90001',
                            countryCode: 'US',
                        },
                        // No shippingMethod
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                    {
                        productId: 'product-2',
                        quantity: 1,
                        itemId: 'item-2',
                        shipmentId: 'shipment-2',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.needsShippingMethods).toBe(true);
        });

        it('does not flag empty shipments', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        // Empty shipment - no items assigned
                        // No shippingMethod, but should not be flagged
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-2', // Different shipment
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.needsShippingMethods).toBe(false);
            expect(result.hasEmptyShipments).toBe(true);
        });
    });

    describe('empty shipments exclusion', () => {
        it('excludes empty shipments from pickup/delivery calculations', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        c_fromStoreId: 'store-123',
                    },
                    {
                        shipmentId: 'shipment-2',
                        // Empty shipment - no items assigned
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        inventoryId: 'inventory-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasPickupItems).toBe(true);
            expect(result.hasDeliveryItems).toBe(false);
            expect(result.hasEmptyShipments).toBe(true);
        });

        it('excludes empty shipments from address calculations', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'San Francisco',
                            stateCode: 'CA',
                            postalCode: '94102',
                            countryCode: 'US',
                        },
                    },
                    {
                        shipmentId: 'shipment-2',
                        shippingAddress: {
                            firstName: 'Jane',
                            lastName: 'Smith',
                            address1: '456 Oak Ave',
                            city: 'Los Angeles',
                            stateCode: 'CA',
                            postalCode: '90001',
                            countryCode: 'US',
                        },
                        // Empty shipment - no items assigned
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasMultipleDeliveryAddresses).toBe(false);
            expect(result.enableMultiAddress).toBe(false);
            expect(result.hasEmptyShipments).toBe(true);
        });
    });

    describe('complex scenarios', () => {
        it('handles mixed basket with pickup, delivery, and empty shipments', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        c_fromStoreId: 'store-123',
                    },
                    {
                        shipmentId: 'shipment-2',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'San Francisco',
                            stateCode: 'CA',
                            postalCode: '94102',
                            countryCode: 'US',
                        },
                        shippingMethod: {
                            id: 'method-1',
                            name: 'Standard Shipping',
                        },
                    },
                    {
                        shipmentId: 'shipment-3',
                        shippingAddress: {
                            firstName: 'Jane',
                            lastName: 'Smith',
                            address1: '456 Oak Ave',
                            city: 'Los Angeles',
                            stateCode: 'CA',
                            postalCode: '90001',
                            countryCode: 'US',
                        },
                        shippingMethod: {
                            id: 'method-2',
                            name: 'Express Shipping',
                        },
                    },
                    {
                        shipmentId: 'shipment-4',
                        // Empty shipment
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        inventoryId: 'inventory-1',
                        quantity: 1,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                    {
                        productId: 'product-2',
                        quantity: 1,
                        itemId: 'item-2',
                        shipmentId: 'shipment-2',
                    },
                    {
                        productId: 'product-3',
                        quantity: 1,
                        itemId: 'item-3',
                        shipmentId: 'shipment-3',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasPickupItems).toBe(true);
            expect(result.hasDeliveryItems).toBe(true);
            expect(result.enableMultiAddress).toBe(true);
            expect(result.hasMultipleDeliveryAddresses).toBe(true);
            expect(result.hasUnaddressedDeliveryItems).toBe(false);
            expect(result.needsShippingMethods).toBe(false);
            expect(result.hasEmptyShipments).toBe(true);
        });

        it('handles multiple items in same shipment', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'San Francisco',
                            stateCode: 'CA',
                            postalCode: '94102',
                            countryCode: 'US',
                        },
                    },
                ],
                productItems: [
                    {
                        productId: 'product-1',
                        quantity: 2,
                        itemId: 'item-1',
                        shipmentId: 'shipment-1',
                    },
                    {
                        productId: 'product-2',
                        quantity: 3,
                        itemId: 'item-2',
                        shipmentId: 'shipment-1',
                    },
                ],
            };
            const result = getPickupShipmentDistribution(basket);
            expect(result.hasDeliveryItems).toBe(true);
            // enableMultiAddress is true when deliveryItemCount > 1 (2 items in this case)
            expect(result.enableMultiAddress).toBe(true);
            expect(result.hasEmptyShipments).toBe(false);
        });
    });
});
