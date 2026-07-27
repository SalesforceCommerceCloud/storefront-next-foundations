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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    generateRandomShipmentId,
    isDeliveryShipment,
    updateBasketWithCustomerInfoFallback,
} from './basket-utils.server';
import type { ShopperBasketsV2 } from '@/scapi';
import type { RouterContextProvider } from 'react-router';

// Mock the dependencies
vi.mock('@/middlewares/basket.server', async () => ({
    ...(await vi.importActual('@/middlewares/basket.server')),
    updateBasketResource: vi.fn(),
}));

import { basketResourceContext, updateBasketResource } from '@/middlewares/basket.server';

describe('generateRandomShipmentId', () => {
    it('returns a string that starts with "Shipment_"', () => {
        const result = generateRandomShipmentId();
        expect(typeof result).toBe('string');
        expect(result.startsWith('Shipment_')).toBe(true);
    });
    it('should generate many unique IDs', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
            ids.add(generateRandomShipmentId());
        }
        expect(ids.size).toBe(100);
    });
});

describe('isDeliveryShipment', () => {
    it('returns true for shipment without c_fromStoreId', () => {
        const shipment = {
            shipmentId: 'ship-1',
        } as ShopperBasketsV2.schemas['Shipment'];
        expect(isDeliveryShipment(shipment)).toBe(true);
    });

    it('returns false for shipment with c_fromStoreId', () => {
        const shipment = {
            shipmentId: 'ship-1',
            c_fromStoreId: 'store-123',
        } as ShopperBasketsV2.schemas['Shipment'];
        expect(isDeliveryShipment(shipment)).toBe(false);
    });

    it('returns true for undefined shipment', () => {
        expect(isDeliveryShipment(undefined)).toBe(true);
    });

    it('returns true for shipment with null c_fromStoreId', () => {
        const shipment = {
            shipmentId: 'ship-1',
            c_fromStoreId: null,
        } as any;
        expect(isDeliveryShipment(shipment)).toBe(true);
    });
});

describe('updateBasketWithCustomerInfoFallback', () => {
    let mockBasketResource: { current: ShopperBasketsV2.schemas['Basket'] | null } | undefined;
    const mockContext = {
        get: vi.fn((context) => (context === basketResourceContext ? mockBasketResource : undefined)),
    } as unknown as Readonly<RouterContextProvider>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('updates basket directly when updated basket has customer email', () => {
        const updatedBasket = {
            basketId: 'basket-123',
            customerInfo: {
                email: 'test@example.com',
            },
            shipments: [{ shipmentId: 'ship-1' }],
            orderTotal: 100,
        } as ShopperBasketsV2.schemas['Basket'];

        const currentBasket = {
            basketId: 'basket-123',
            customerInfo: {
                email: 'test@example.com',
            },
        } as ShopperBasketsV2.schemas['Basket'];

        mockBasketResource = { current: currentBasket };

        updateBasketWithCustomerInfoFallback(mockContext, updatedBasket);

        expect(updateBasketResource).toHaveBeenCalledWith(mockContext, updatedBasket);
        expect(updateBasketResource).toHaveBeenCalledTimes(1);
    });

    it('merges customer info when updated basket is missing email but current basket has it', () => {
        const updatedBasket = {
            basketId: 'basket-123',
            customerInfo: undefined,
            shipments: [{ shipmentId: 'ship-1' }],
            orderTotal: 150,
            productTotal: 100,
            shippingTotal: 30,
            merchandizeTotalTax: 10,
            taxTotal: 10,
        } as ShopperBasketsV2.schemas['Basket'];

        const currentBasket = {
            basketId: 'basket-123',
            customerInfo: {
                email: 'test@example.com',
            },
            shipments: [{ shipmentId: 'ship-0' }],
            orderTotal: 100,
            productTotal: 80,
            shippingTotal: 15,
            merchandizeTotalTax: 5,
            taxTotal: 5,
        } as ShopperBasketsV2.schemas['Basket'];

        mockBasketResource = { current: currentBasket };

        updateBasketWithCustomerInfoFallback(mockContext, updatedBasket);

        expect(updateBasketResource).toHaveBeenCalledWith(mockContext, {
            ...currentBasket,
            shipments: updatedBasket.shipments,
            orderTotal: updatedBasket.orderTotal,
            productTotal: updatedBasket.productTotal,
            shippingTotal: updatedBasket.shippingTotal,
            merchandizeTotalTax: updatedBasket.merchandizeTotalTax,
            taxTotal: updatedBasket.taxTotal,
        });
        expect(updateBasketResource).toHaveBeenCalledTimes(1);
    });

    it('uses current basket values when updated basket values are missing', () => {
        const updatedBasket = {
            basketId: 'basket-123',
            customerInfo: undefined,
            shipments: undefined,
            orderTotal: undefined,
            productTotal: undefined,
            shippingTotal: undefined,
            merchandizeTotalTax: undefined,
            taxTotal: undefined,
        } as ShopperBasketsV2.schemas['Basket'];

        const currentBasket = {
            basketId: 'basket-123',
            customerInfo: {
                email: 'test@example.com',
            },
            shipments: [{ shipmentId: 'ship-0' }],
            orderTotal: 100,
            productTotal: 80,
            shippingTotal: 15,
            merchandizeTotalTax: 5,
            taxTotal: 5,
        } as ShopperBasketsV2.schemas['Basket'];

        mockBasketResource = { current: currentBasket };

        updateBasketWithCustomerInfoFallback(mockContext, updatedBasket);

        expect(updateBasketResource).toHaveBeenCalledWith(mockContext, {
            ...currentBasket,
            shipments: currentBasket.shipments,
            orderTotal: currentBasket.orderTotal,
            productTotal: currentBasket.productTotal,
            shippingTotal: currentBasket.shippingTotal,
            merchandizeTotalTax: currentBasket.merchandizeTotalTax,
            taxTotal: currentBasket.taxTotal,
        });
    });

    it('updates basket directly when current basket also has no email', () => {
        const updatedBasket = {
            basketId: 'basket-123',
            customerInfo: undefined,
            shipments: [{ shipmentId: 'ship-1' }],
            orderTotal: 100,
        } as ShopperBasketsV2.schemas['Basket'];

        const currentBasket = {
            basketId: 'basket-123',
            customerInfo: undefined,
        } as ShopperBasketsV2.schemas['Basket'];

        mockBasketResource = { current: currentBasket };

        updateBasketWithCustomerInfoFallback(mockContext, updatedBasket);

        expect(updateBasketResource).toHaveBeenCalledWith(mockContext, updatedBasket);
        expect(updateBasketResource).toHaveBeenCalledTimes(1);
    });

    it('merges customer info when updated basket has empty email string', () => {
        const updatedBasket = {
            basketId: 'basket-123',
            customerInfo: {
                email: '',
            },
            shipments: [{ shipmentId: 'ship-1' }],
            orderTotal: 100,
            productTotal: 80,
            shippingTotal: 15,
            merchandizeTotalTax: 5,
            taxTotal: 5,
        } as ShopperBasketsV2.schemas['Basket'];

        const currentBasket = {
            basketId: 'basket-123',
            customerInfo: {
                email: 'test@example.com',
            },
            shipments: [{ shipmentId: 'ship-0' }],
            orderTotal: 50,
            productTotal: 40,
            shippingTotal: 8,
            merchandizeTotalTax: 2,
            taxTotal: 2,
        } as ShopperBasketsV2.schemas['Basket'];

        mockBasketResource = { current: currentBasket };

        updateBasketWithCustomerInfoFallback(mockContext, updatedBasket);

        expect(updateBasketResource).toHaveBeenCalledWith(mockContext, {
            ...currentBasket,
            shipments: updatedBasket.shipments,
            orderTotal: updatedBasket.orderTotal,
            productTotal: updatedBasket.productTotal,
            shippingTotal: updatedBasket.shippingTotal,
            merchandizeTotalTax: updatedBasket.merchandizeTotalTax,
            taxTotal: updatedBasket.taxTotal,
        });
        expect(updateBasketResource).toHaveBeenCalledTimes(1);
    });
});
