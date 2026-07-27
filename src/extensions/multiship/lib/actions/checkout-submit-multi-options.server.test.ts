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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleMultiShipShippingOptions } from './checkout-submit-multi-options.server';
import { type ShopperBasketsV2 } from '@/scapi';
import type { ActionFunctionArgs } from 'react-router';

// Mock the dependencies
vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: vi.fn(),
}));

vi.mock('@/extensions/multiship/lib/basket-utils.server', () => ({
    updateBasketWithCustomerInfoFallback: vi.fn(),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    })),
}));

import { createApiClients } from '@/lib/api-clients.server';
import { updateBasketWithCustomerInfoFallback } from '@/extensions/multiship/lib/basket-utils.server';

describe('checkout-submit-multi-options', () => {
    const mockBasket = {
        basketId: 'test-basket-123',
    } as ShopperBasketsV2.schemas['Basket'];

    const mockContext = {} as ActionFunctionArgs['context'];

    let mockShopperBasketsV2: any;
    let sessionStorageMock: Storage;

    beforeEach(() => {
        vi.clearAllMocks();

        mockShopperBasketsV2 = {
            updateShippingMethodForShipment: vi.fn(),
        };

        vi.mocked(createApiClients).mockReturnValue({
            shopperBasketsV2: mockShopperBasketsV2,
        } as any);

        // Mock sessionStorage
        sessionStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
            length: 0,
            key: vi.fn(),
        };
        Object.defineProperty(window, 'sessionStorage', {
            value: sessionStorageMock,
            writable: true,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('handleMultiShipShippingOptions', () => {
        it('returns null when formData does not contain multi-ship fields', async () => {
            const formData = new FormData();
            formData.append('shippingMethod', 'standard');

            const result = await handleMultiShipShippingOptions(formData, mockBasket, mockContext);

            expect(result).toBeNull();
            expect(mockShopperBasketsV2.updateShippingMethodForShipment).not.toHaveBeenCalled();
        });

        it('updates shipping method when shipment does not have one set', async () => {
            const basket = {
                basketId: 'test-basket-123',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingMethod: undefined,
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const updatedBasket = {
                ...basket,
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingMethod: { id: 'method-1' },
                    },
                ],
            };

            mockShopperBasketsV2.updateShippingMethodForShipment.mockResolvedValue({
                data: updatedBasket,
            });

            const formData = new FormData();
            formData.append('shippingMethod_shipment-1', 'method-1');

            const result = await handleMultiShipShippingOptions(formData, basket, mockContext);

            expect(result).not.toBeNull();
            expect(mockShopperBasketsV2.updateShippingMethodForShipment).toHaveBeenCalledTimes(1);
            expect(mockShopperBasketsV2.updateShippingMethodForShipment).toHaveBeenCalledWith({
                params: {
                    path: {
                        basketId: 'test-basket-123',
                        shipmentId: 'shipment-1',
                    },
                },
                body: {
                    id: 'method-1',
                },
            });
            expect(updateBasketWithCustomerInfoFallback).toHaveBeenCalledWith(mockContext, updatedBasket);
        });

        it('updates shipping method when shipment has a different method set', async () => {
            const basket = {
                basketId: 'test-basket-123',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingMethod: { id: 'method-old' },
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const updatedBasket = {
                ...basket,
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingMethod: { id: 'method-1' },
                    },
                ],
            };

            mockShopperBasketsV2.updateShippingMethodForShipment.mockResolvedValue({
                data: updatedBasket,
            });

            const formData = new FormData();
            formData.append('shippingMethod_shipment-1', 'method-1');

            const result = await handleMultiShipShippingOptions(formData, basket, mockContext);

            expect(result).not.toBeNull();
            expect(mockShopperBasketsV2.updateShippingMethodForShipment).toHaveBeenCalledTimes(1);
            expect(mockShopperBasketsV2.updateShippingMethodForShipment).toHaveBeenCalledWith({
                params: {
                    path: {
                        basketId: 'test-basket-123',
                        shipmentId: 'shipment-1',
                    },
                },
                body: {
                    id: 'method-1',
                },
            });
        });

        it('skips API call when shipment already has the correct shipping method set', async () => {
            const basket = {
                basketId: 'test-basket-123',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingMethod: { id: 'method-1' },
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const formData = new FormData();
            formData.append('shippingMethod_shipment-1', 'method-1');

            const result = await handleMultiShipShippingOptions(formData, basket, mockContext);

            expect(result).not.toBeNull();
            expect(mockShopperBasketsV2.updateShippingMethodForShipment).not.toHaveBeenCalled();
            expect(updateBasketWithCustomerInfoFallback).toHaveBeenCalledWith(mockContext, basket);
        });

        it('handles multiple shipments: skips correct ones and updates incorrect ones', async () => {
            const shipments = [
                {
                    shipmentId: 'shipment-1',
                    shippingMethod: { id: 'method-1' }, // Already correct
                },
                {
                    shipmentId: 'shipment-2',
                    shippingMethod: { id: 'method-old' }, // Needs update
                },
                {
                    shipmentId: 'shipment-3',
                    shippingMethod: undefined, // Needs update
                },
            ];
            const basket = {
                basketId: 'test-basket-123',
                shipments,
            } as ShopperBasketsV2.schemas['Basket'];

            const updatedBasketAfterShipment2 = {
                ...basket,
                shipments: [
                    shipments[0],
                    {
                        shipmentId: 'shipment-2',
                        shippingMethod: { id: 'method-2' },
                    },
                    shipments[2],
                ],
            };

            const updatedBasketAfterShipment3 = {
                ...updatedBasketAfterShipment2,
                shipments: [
                    updatedBasketAfterShipment2.shipments[0],
                    updatedBasketAfterShipment2.shipments[1],
                    {
                        shipmentId: 'shipment-3',
                        shippingMethod: { id: 'method-3' },
                    },
                ],
            };

            mockShopperBasketsV2.updateShippingMethodForShipment
                .mockResolvedValueOnce({
                    data: updatedBasketAfterShipment2,
                })
                .mockResolvedValueOnce({
                    data: updatedBasketAfterShipment3,
                });

            const formData = new FormData();
            formData.append('shippingMethod_shipment-1', 'method-1'); // Already correct
            formData.append('shippingMethod_shipment-2', 'method-2'); // Needs update
            formData.append('shippingMethod_shipment-3', 'method-3'); // Needs update

            const result = await handleMultiShipShippingOptions(formData, basket, mockContext);

            expect(result).not.toBeNull();
            // Should only call API for shipment-2 and shipment-3, not shipment-1
            expect(mockShopperBasketsV2.updateShippingMethodForShipment).toHaveBeenCalledTimes(2);
            expect(mockShopperBasketsV2.updateShippingMethodForShipment).toHaveBeenCalledWith({
                params: {
                    path: {
                        basketId: 'test-basket-123',
                        shipmentId: 'shipment-2',
                    },
                },
                body: {
                    id: 'method-2',
                },
            });
            expect(mockShopperBasketsV2.updateShippingMethodForShipment).toHaveBeenCalledWith({
                params: {
                    path: {
                        basketId: 'test-basket-123',
                        shipmentId: 'shipment-3',
                    },
                },
                body: {
                    id: 'method-3',
                },
            });
            expect(updateBasketWithCustomerInfoFallback).toHaveBeenCalledWith(mockContext, updatedBasketAfterShipment3);
        });

        it('skips empty shipping method IDs', async () => {
            const basket = {
                basketId: 'test-basket-123',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingMethod: { id: 'method-1' },
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const formData = new FormData();
            formData.append('shippingMethod_shipment-1', 'method-1');
            formData.append('shippingMethod_shipment-2', ''); // Empty, should be skipped

            const result = await handleMultiShipShippingOptions(formData, basket, mockContext);

            expect(result).not.toBeNull();
            // Should only check shipment-1 (which is already correct), shipment-2 should be skipped
            expect(mockShopperBasketsV2.updateShippingMethodForShipment).not.toHaveBeenCalled();
        });

        it('handles error when API call fails', async () => {
            const basket = {
                basketId: 'test-basket-123',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingMethod: { id: 'method-old' },
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const apiError = new Error('API Error');
            mockShopperBasketsV2.updateShippingMethodForShipment.mockRejectedValue(apiError);

            const formData = new FormData();
            formData.append('shippingMethod_shipment-1', 'method-1');

            const result = await handleMultiShipShippingOptions(formData, basket, mockContext);

            expect(result).not.toBeNull();
            const jsonResult = await result?.json();
            expect(jsonResult.success).toBe(false);
            expect(jsonResult.error).toBe('Server error. Try again later.');
        });
    });
});
