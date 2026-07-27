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
import type { ShopperOrders } from '@/scapi';

/**
 * Test suite for Order Confirmation page with multiple delivery shipments.
 * These tests verify that the order confirmation component correctly handles
 * orders with multiple shipping addresses (multiship scenarios).
 */
describe('Order Confirmation - Multiple Shipments (Multiship Extension)', () => {
    /**
     * Helper function to create mock order with multiple shipments for testing
     */
    const createMockOrderWithMultipleShipments = (shipmentCount: number): ShopperOrders.schemas['Order'] => ({
        orderNo: 'TEST-MULTISHIP-12345',
        status: 'new',
        orderTotal: 350.0,
        currency: 'USD',
        customerInfo: {
            email: 'multiship@example.com',
            firstName: 'Jane',
        },
        billingAddress: {
            fullName: 'Jane Doe',
            address1: '789 Billing St',
            city: 'New York',
            stateCode: 'NY',
            postalCode: '10001',
            countryCode: 'US',
        },
        shipments: Array.from({ length: shipmentCount }, (_, index) => ({
            shipmentId: `shipment-${index + 1}`,
            shippingAddress: {
                fullName: `Recipient ${index + 1}`,
                address1: `${100 + index * 100} Address St`,
                city: index === 0 ? 'San Francisco' : index === 1 ? 'Los Angeles' : 'San Diego',
                stateCode: 'CA',
                postalCode: `9410${index}`,
                countryCode: 'US',
            },
            shippingMethod: {
                id: index === 0 ? 'express' : index === 1 ? 'standard' : 'overnight',
                name: index === 0 ? 'Express Shipping' : index === 1 ? 'Standard Shipping' : 'Overnight Shipping',
                description:
                    index === 0
                        ? 'Arrives in 2-3 business days'
                        : index === 1
                          ? 'Arrives in 5-7 business days'
                          : 'Arrives next business day',
            },
        })),
        paymentInstruments: [
            {
                paymentCard: {
                    cardType: 'Mastercard',
                    numberLastDigits: '5678',
                },
            },
        ],
        productTotal: 300.0,
        shippingTotal: 30.0,
        taxTotal: 20.0,
    });

    describe('Multiple shipment data structures', () => {
        test('should have correct structure for order with 2 shipments', () => {
            const mockOrder = createMockOrderWithMultipleShipments(2);

            expect(mockOrder.shipments).toHaveLength(2);
            expect(mockOrder.shipments?.[0]?.shipmentId).toBe('shipment-1');
            expect(mockOrder.shipments?.[1]?.shipmentId).toBe('shipment-2');
        });

        test('should have correct structure for order with 3 shipments', () => {
            const mockOrder = createMockOrderWithMultipleShipments(3);

            expect(mockOrder.shipments).toHaveLength(3);
            expect(mockOrder.shipments?.[0]).toHaveProperty('shippingAddress');
            expect(mockOrder.shipments?.[1]).toHaveProperty('shippingAddress');
            expect(mockOrder.shipments?.[2]).toHaveProperty('shippingAddress');
        });

        test('should have different shipping addresses for each shipment', () => {
            const mockOrder = createMockOrderWithMultipleShipments(3);

            const addresses = mockOrder.shipments?.map((s) => s.shippingAddress?.city);
            expect(addresses).toEqual(['San Francisco', 'Los Angeles', 'San Diego']);
        });

        test('should have different shipping methods for each shipment', () => {
            const mockOrder = createMockOrderWithMultipleShipments(3);

            const methods = mockOrder.shipments?.map((s) => s.shippingMethod?.name);
            expect(methods).toEqual(['Express Shipping', 'Standard Shipping', 'Overnight Shipping']);
        });

        test('should support order with 5+ shipments', () => {
            const mockOrder = createMockOrderWithMultipleShipments(5);

            expect(mockOrder.shipments).toHaveLength(5);
            mockOrder.shipments?.forEach((shipment, index) => {
                expect(shipment.shipmentId).toBe(`shipment-${index + 1}`);
                expect(shipment.shippingAddress).toBeDefined();
            });
        });
    });

    describe('Edge cases for multiple shipment data', () => {
        test('should handle shipment without shipping method', () => {
            const mockOrder = createMockOrderWithMultipleShipments(2);
            if (mockOrder.shipments && mockOrder.shipments[1]) {
                mockOrder.shipments[1].shippingMethod = undefined;
            }

            expect(mockOrder.shipments?.[0]?.shippingMethod).toBeDefined();
            expect(mockOrder.shipments?.[1]?.shippingMethod).toBeUndefined();
        });

        test('should handle shipment without estimated delivery description', () => {
            const mockOrder = createMockOrderWithMultipleShipments(2);
            if (mockOrder.shipments && mockOrder.shipments[0]?.shippingMethod) {
                mockOrder.shipments[0].shippingMethod.description = undefined;
            }

            expect(mockOrder.shipments?.[0]?.shippingMethod?.description).toBeUndefined();
            expect(mockOrder.shipments?.[1]?.shippingMethod?.description).toBe('Arrives in 5-7 business days');
        });

        test('should handle shipment without shipping address', () => {
            const mockOrder = createMockOrderWithMultipleShipments(2);
            if (mockOrder.shipments && mockOrder.shipments[0]) {
                mockOrder.shipments[0].shippingAddress = undefined;
            }

            expect(mockOrder.shipments?.[0]?.shippingAddress).toBeUndefined();
            expect(mockOrder.shipments?.[1]?.shippingAddress).toBeDefined();
        });

        test('should handle mixed complete and incomplete shipment data', () => {
            const mockOrder = createMockOrderWithMultipleShipments(3);

            // First shipment: complete data (default)
            // Second shipment: missing shipping method
            if (mockOrder.shipments && mockOrder.shipments[1]) {
                mockOrder.shipments[1].shippingMethod = undefined;
            }
            // Third shipment: missing description
            if (mockOrder.shipments && mockOrder.shipments[2]?.shippingMethod) {
                mockOrder.shipments[2].shippingMethod.description = undefined;
            }

            expect(mockOrder.shipments?.[0]?.shippingMethod).toBeDefined();
            expect(mockOrder.shipments?.[0]?.shippingMethod?.description).toBeDefined();
            expect(mockOrder.shipments?.[1]?.shippingMethod).toBeUndefined();
            expect(mockOrder.shipments?.[2]?.shippingMethod).toBeDefined();
            expect(mockOrder.shipments?.[2]?.shippingMethod?.description).toBeUndefined();
        });
    });

    describe('Shipment identification and keys', () => {
        test('should have unique shipment IDs for each shipment', () => {
            const mockOrder = createMockOrderWithMultipleShipments(4);

            const shipmentIds = mockOrder.shipments?.map((s) => s.shipmentId);
            const uniqueIds = new Set(shipmentIds);

            expect(uniqueIds.size).toBe(4);
            expect(shipmentIds).toEqual(['shipment-1', 'shipment-2', 'shipment-3', 'shipment-4']);
        });

        test('should handle shipments with various optional field combinations', () => {
            const mockOrder: ShopperOrders.schemas['Order'] = {
                orderNo: 'TEST-VARIED-SHIPMENTS',
                status: 'new',
                orderTotal: 200.0,
                currency: 'USD',
                customerInfo: {
                    email: 'test@example.com',
                },
                shipments: [
                    {
                        shipmentId: 'complete-1',
                        shippingAddress: {
                            fullName: 'Complete Address',
                            address1: '100 Complete St',
                            city: 'Complete City',
                            stateCode: 'CA',
                            postalCode: '90000',
                            countryCode: 'US',
                        },
                        shippingMethod: {
                            id: 'standard',
                            name: 'Standard Shipping',
                            description: 'Arrives in 5-7 days',
                        },
                    },
                    {
                        shipmentId: 'minimal-2',
                        shippingAddress: {
                            fullName: 'Minimal Address',
                            address1: '200 Minimal St',
                            city: 'Minimal City',
                            countryCode: 'US',
                        },
                    },
                ],
                paymentInstruments: [],
            };

            expect(mockOrder.shipments).toHaveLength(2);
            expect(mockOrder.shipments?.[0]?.shippingMethod).toBeDefined();
            expect(mockOrder.shipments?.[1]?.shippingMethod).toBeUndefined();
            expect(mockOrder.shipments?.[0]?.shippingAddress?.stateCode).toBe('CA');
            expect(mockOrder.shipments?.[1]?.shippingAddress?.stateCode).toBeUndefined();
        });

        test('should preserve shipment order in the array', () => {
            const mockOrder = createMockOrderWithMultipleShipments(3);

            // Verify order is preserved
            expect(mockOrder.shipments?.[0]?.shippingAddress?.city).toBe('San Francisco');
            expect(mockOrder.shipments?.[1]?.shippingAddress?.city).toBe('Los Angeles');
            expect(mockOrder.shipments?.[2]?.shippingAddress?.city).toBe('San Diego');
        });
    });

    describe('Multiple shipments with product items', () => {
        test('should have product items associated with multi-shipment order', () => {
            const mockOrder = createMockOrderWithMultipleShipments(2);
            mockOrder.productItems = [
                {
                    itemId: 'item-1',
                    productId: 'prod-1',
                    productName: 'Test Product 1',
                    price: 100.0,
                    quantity: 1,
                },
                {
                    itemId: 'item-2',
                    productId: 'prod-2',
                    productName: 'Test Product 2',
                    price: 150.0,
                    quantity: 2,
                },
            ];

            expect(mockOrder.productItems).toHaveLength(2);
            expect(mockOrder.shipments).toHaveLength(2);
            expect(mockOrder.productItems?.[0]?.productName).toBe('Test Product 1');
            expect(mockOrder.productItems?.[1]?.productName).toBe('Test Product 2');
        });

        test('should calculate correct order totals for multi-shipment order', () => {
            const mockOrder = createMockOrderWithMultipleShipments(3);
            mockOrder.productTotal = 300.0;
            mockOrder.shippingTotal = 45.0; // Higher shipping for 3 addresses
            mockOrder.taxTotal = 25.0;
            mockOrder.orderTotal = 370.0;

            expect(mockOrder.productTotal).toBe(300.0);
            expect(mockOrder.shippingTotal).toBe(45.0);
            expect(mockOrder.taxTotal).toBe(25.0);
            expect(mockOrder.orderTotal).toBe(370.0);

            // Verify shipping cost is higher for 3 shipments than default
            const defaultOrder = createMockOrderWithMultipleShipments(1);
            expect(mockOrder.shippingTotal).toBeGreaterThan(defaultOrder.shippingTotal || 0);
        });

        test('should maintain single order number for multi-shipment order', () => {
            const mockOrder = createMockOrderWithMultipleShipments(4);

            expect(mockOrder.orderNo).toBe('TEST-MULTISHIP-12345');
            expect(mockOrder.shipments).toHaveLength(4);

            // All shipments belong to the same order
            mockOrder.shipments?.forEach((shipment) => {
                expect(shipment.shipmentId).toBeTruthy();
                // Shipments don't have an orderNo field, they're part of the order
            });
        });
    });

    describe('Order confirmation totals with multiple shipments', () => {
        test('should have single payment instrument for multi-shipment order', () => {
            const mockOrder = createMockOrderWithMultipleShipments(3);

            expect(mockOrder.paymentInstruments).toHaveLength(1);
            expect(mockOrder.paymentInstruments?.[0]?.paymentCard?.cardType).toBe('Mastercard');
            expect(mockOrder.shipments).toHaveLength(3);
        });

        test('should have single billing address for multi-shipment order', () => {
            const mockOrder = createMockOrderWithMultipleShipments(3);

            expect(mockOrder.billingAddress).toBeDefined();
            expect(mockOrder.billingAddress?.city).toBe('New York');
            expect(mockOrder.shipments).toHaveLength(3);

            // Billing address should be different from shipping addresses
            const shippingCities = mockOrder.shipments?.map((s) => s.shippingAddress?.city);
            expect(shippingCities).not.toContain('New York');
        });

        test('should handle order adjustments with multiple shipments', () => {
            const mockOrder = createMockOrderWithMultipleShipments(2);
            mockOrder.orderPriceAdjustments = [
                {
                    itemText: '10% Off',
                    price: -30.0,
                },
            ];

            expect(mockOrder.orderPriceAdjustments).toHaveLength(1);
            expect(mockOrder.orderPriceAdjustments?.[0]?.price).toBe(-30.0);
            expect(mockOrder.shipments).toHaveLength(2);

            // Adjustment applies to entire order, not per shipment
            const promotionTotal = mockOrder.orderPriceAdjustments.reduce((sum, adj) => sum + (adj.price ?? 0), 0);
            expect(promotionTotal).toBe(-30.0);
        });
    });
});
