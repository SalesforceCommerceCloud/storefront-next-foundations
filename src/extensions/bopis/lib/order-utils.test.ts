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
import type { ShopperOrders } from '@/scapi';
import { getOrderPickupShipment, getOrderDeliveryShipments, getStoreIdsFromOrder } from './order-utils';

describe('getOrderPickupShipment', () => {
    it('returns undefined when order is undefined', () => {
        const result = getOrderPickupShipment(undefined);
        expect(result).toBeUndefined();
    });

    it('returns undefined when order is null', () => {
        const result = getOrderPickupShipment(null);
        expect(result).toBeUndefined();
    });

    it('returns undefined when order has no shipments', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
        };
        const result = getOrderPickupShipment(order);
        expect(result).toBeUndefined();
    });

    it('returns undefined when order has empty shipments array', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [],
        };
        const result = getOrderPickupShipment(order);
        expect(result).toBeUndefined();
    });

    it('returns undefined when no shipments have c_fromStoreId', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    // No c_fromStoreId - regular delivery
                },
                {
                    shipmentId: 'shipment-2',
                    // No c_fromStoreId - regular delivery
                },
            ],
        };
        const result = getOrderPickupShipment(order);
        expect(result).toBeUndefined();
    });

    it('returns first shipment with c_fromStoreId', () => {
        const pickupShipment: ShopperOrders.schemas['Shipment'] = {
            shipmentId: 'shipment-1',
            c_fromStoreId: 'store-123',
        };
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [pickupShipment],
        };
        const result = getOrderPickupShipment(order);
        expect(result).toEqual(pickupShipment);
    });

    it('returns first pickup shipment in mixed shipment order', () => {
        const deliveryShipment: ShopperOrders.schemas['Shipment'] = {
            shipmentId: 'shipment-delivery',
            // No c_fromStoreId
        };
        const pickupShipment: ShopperOrders.schemas['Shipment'] = {
            shipmentId: 'shipment-pickup',
            c_fromStoreId: 'store-123',
        };
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [deliveryShipment, pickupShipment],
        };
        const result = getOrderPickupShipment(order);
        expect(result).toEqual(pickupShipment);
    });
});

describe('getOrderDeliveryShipments', () => {
    it('returns empty array when order is undefined', () => {
        const result = getOrderDeliveryShipments(undefined);
        expect(result).toEqual([]);
    });

    it('returns empty array when order is null', () => {
        const result = getOrderDeliveryShipments(null);
        expect(result).toEqual([]);
    });

    it('returns empty array when order has no shipments', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
        };
        const result = getOrderDeliveryShipments(order);
        expect(result).toEqual([]);
    });

    it('returns empty array when order has empty shipments array', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [],
        };
        const result = getOrderDeliveryShipments(order);
        expect(result).toEqual([]);
    });

    it('returns all shipments when no shipments have c_fromStoreId', () => {
        const delivery1: ShopperOrders.schemas['Shipment'] = {
            shipmentId: 'shipment-1',
        };
        const delivery2: ShopperOrders.schemas['Shipment'] = {
            shipmentId: 'shipment-2',
        };
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [delivery1, delivery2],
        };
        const result = getOrderDeliveryShipments(order);
        expect(result).toEqual([delivery1, delivery2]);
    });

    it('returns empty array when all shipments are pickup shipments', () => {
        const pickup1: ShopperOrders.schemas['Shipment'] = {
            shipmentId: 'shipment-1',
            c_fromStoreId: 'store-123',
        };
        const pickup2: ShopperOrders.schemas['Shipment'] = {
            shipmentId: 'shipment-2',
            c_fromStoreId: 'store-456',
        };
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [pickup1, pickup2],
        };
        const result = getOrderDeliveryShipments(order);
        expect(result).toEqual([]);
    });

    it('returns only delivery shipments in original order for mixed shipments', () => {
        const delivery1: ShopperOrders.schemas['Shipment'] = {
            shipmentId: 'shipment-delivery-1',
        };
        const pickup1: ShopperOrders.schemas['Shipment'] = {
            shipmentId: 'shipment-pickup-1',
            c_fromStoreId: 'store-123',
        };
        const delivery2: ShopperOrders.schemas['Shipment'] = {
            shipmentId: 'shipment-delivery-2',
        };
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [delivery1, pickup1, delivery2],
        };
        const result = getOrderDeliveryShipments(order);
        expect(result).toEqual([delivery1, delivery2]);
    });

    it('treats empty string c_fromStoreId as delivery (falsy)', () => {
        const deliveryLikePickup: ShopperOrders.schemas['Shipment'] = {
            shipmentId: 'shipment-1',
            c_fromStoreId: '',
        };
        const pickup: ShopperOrders.schemas['Shipment'] = {
            shipmentId: 'shipment-2',
            c_fromStoreId: 'store-123',
        };
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [deliveryLikePickup, pickup],
        };
        const result = getOrderDeliveryShipments(order);
        expect(result).toEqual([deliveryLikePickup]);
    });
});

describe('getStoreIdsFromOrder', () => {
    it('returns empty array when order is undefined', () => {
        const result = getStoreIdsFromOrder(undefined);
        expect(result).toEqual([]);
    });

    it('returns empty array when order is null', () => {
        const result = getStoreIdsFromOrder(null);
        expect(result).toEqual([]);
    });

    it('returns empty array when order has no shipments', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
        };
        const result = getStoreIdsFromOrder(order);
        expect(result).toEqual([]);
    });

    it('returns empty array when order has empty shipments array', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [],
        };
        const result = getStoreIdsFromOrder(order);
        expect(result).toEqual([]);
    });

    it('returns empty array when no shipments have c_fromStoreId', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    // No c_fromStoreId - regular delivery shipment
                },
                {
                    shipmentId: 'shipment-2',
                    // No c_fromStoreId - regular delivery shipment
                },
            ],
        };
        const result = getStoreIdsFromOrder(order);
        expect(result).toEqual([]);
    });

    it('extracts single store ID from pickup shipment', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
        };
        const result = getStoreIdsFromOrder(order);
        expect(result).toEqual(['store-123']);
    });

    it('extracts unique store IDs from multiple pickup shipments', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-2',
                    c_fromStoreId: 'store-456',
                },
            ],
        };
        const result = getStoreIdsFromOrder(order);
        expect(result).toHaveLength(2);
        expect(result).toContain('store-123');
        expect(result).toContain('store-456');
    });

    it('returns sorted array of store IDs', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-zebra',
                },
                {
                    shipmentId: 'shipment-2',
                    c_fromStoreId: 'store-apple',
                },
                {
                    shipmentId: 'shipment-3',
                    c_fromStoreId: 'store-banana',
                },
            ],
        };
        const result = getStoreIdsFromOrder(order);
        expect(result).toEqual(['store-apple', 'store-banana', 'store-zebra']);
    });

    it('removes duplicate store IDs', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-2',
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-3',
                    c_fromStoreId: 'store-456',
                },
            ],
        };
        const result = getStoreIdsFromOrder(order);
        expect(result).toEqual(['store-123', 'store-456']);
    });

    it('ignores shipments without c_fromStoreId in mixed order', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-2',
                    // No c_fromStoreId - regular delivery
                },
                {
                    shipmentId: 'shipment-3',
                    c_fromStoreId: 'store-456',
                },
            ],
        };
        const result = getStoreIdsFromOrder(order);
        expect(result).toEqual(['store-123', 'store-456']);
    });

    it('handles numeric store IDs as strings', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: '123',
                },
                {
                    shipmentId: 'shipment-2',
                    c_fromStoreId: '456',
                },
                {
                    shipmentId: 'shipment-3',
                    c_fromStoreId: '001',
                },
            ],
        };
        const result = getStoreIdsFromOrder(order);
        // Alphabetical sort treats them as strings
        expect(result).toEqual(['001', '123', '456']);
    });

    it('handles mixed shipments (pickup and delivery) correctly', () => {
        const order: ShopperOrders.schemas['Order'] = {
            orderNo: 'order-1',
            shipments: [
                {
                    shipmentId: 'shipment-pickup',
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-delivery',
                    // No c_fromStoreId
                },
            ],
        };
        const result = getStoreIdsFromOrder(order);
        // Should only include store from pickup shipment, not delivery
        expect(result).toEqual(['store-123']);
    });
});
