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
    findOrCreateDeliveryShipment,
    assignProductsToDefaultShipment,
    removeEmptyShipments,
    resolveEmptyShipments,
} from './basket.server';
import type { ShopperBasketsV2 } from '@/scapi';
import type { RouterContextProvider } from 'react-router';

// Mock the dependencies
vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: vi.fn(),
}));

vi.mock('@/lib/api/shipping-methods.server', () => ({
    getShippingMethodsForShipment: vi.fn(),
}));

import { createApiClients } from '@/lib/api-clients.server';
import { getShippingMethodsForShipment } from '@/lib/api/shipping-methods.server';

describe('findOrCreateDeliveryShipment', () => {
    const mockContext = {} as Readonly<RouterContextProvider>;

    let mockShopperBasketsV2: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockShopperBasketsV2 = {
            createShipmentForBasket: vi.fn(),
            getBasket: vi.fn(),
            updateShippingAddressForShipment: vi.fn(),
        };

        vi.mocked(createApiClients).mockReturnValue({
            shopperBasketsV2: mockShopperBasketsV2,
        } as any);
    });

    describe('validation', () => {
        it('throws error when basket is missing basketId', async () => {
            const basket = {} as ShopperBasketsV2.schemas['Basket'];

            await expect(findOrCreateDeliveryShipment(basket, mockContext)).rejects.toThrow(
                'Basket is missing a basketId'
            );
        });
    });

    describe('delivery shipments', () => {
        it('returns existing delivery shipment when no address specified', async () => {
            const existingShipment = {
                shipmentId: 'existing-shipment',
                shippingAddress: { address1: '123 Main St' },
            };
            const basket = {
                basketId: 'basket-123',
                shipments: [existingShipment],
            } as ShopperBasketsV2.schemas['Basket'];

            const result = await findOrCreateDeliveryShipment(basket, mockContext);

            expect(result).toBe(existingShipment);
            expect(mockShopperBasketsV2.createShipmentForBasket).not.toHaveBeenCalled();
        });

        it('skips delivery shipments with store pickup flag', async () => {
            const storePickupShipment = {
                shipmentId: 'store-shipment',
                c_fromStoreId: 'store-123',
                shippingAddress: {
                    address1: '789 Store St',
                    city: 'Seattle',
                    stateCode: 'WA',
                    postalCode: '98101',
                    countryCode: 'US',
                },
            };
            const basket = {
                basketId: 'basket-123',
                shipments: [storePickupShipment],
            } as any;

            // Mock createShipmentForBasket to capture the shipmentId being created
            let capturedShipmentId!: string;
            mockShopperBasketsV2.createShipmentForBasket.mockImplementation(({ body }: any) => {
                capturedShipmentId = body.shipmentId;
                const newShipment = { shipmentId: capturedShipmentId };
                return Promise.resolve({ data: { shipments: [storePickupShipment, newShipment] } });
            });

            const result = await findOrCreateDeliveryShipment(basket, mockContext);

            expect(result.shipmentId).toBe(capturedShipmentId);
            expect(mockShopperBasketsV2.createShipmentForBasket).toHaveBeenCalled();
        });

        it('creates new delivery shipment when none exist', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [],
            } as ShopperBasketsV2.schemas['Basket'];

            let capturedShipmentId!: string;
            mockShopperBasketsV2.createShipmentForBasket.mockImplementation(({ body }: any) => {
                capturedShipmentId = body.shipmentId;
                const newShipment = { shipmentId: capturedShipmentId };
                return Promise.resolve({ data: { shipments: [newShipment] } });
            });

            const result = await findOrCreateDeliveryShipment(basket, mockContext);

            expect(mockShopperBasketsV2.createShipmentForBasket).toHaveBeenCalledWith({
                params: { path: { basketId: 'basket-123' } },
                body: { shipmentId: expect.stringContaining('Shipment_') },
            });
            expect(result.shipmentId).toBe(capturedShipmentId);
        });

        it('creates delivery shipment with address when address is provided', async () => {
            const address: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            let capturedBody: any;
            mockShopperBasketsV2.createShipmentForBasket.mockImplementation(({ body }: any) => {
                capturedBody = body;
                const newShipment = { shipmentId: body.shipmentId };
                return Promise.resolve({ data: { shipments: [newShipment] } });
            });

            const { createDeliveryShipment } = await import('./basket.server');
            const result = await createDeliveryShipment(mockContext, 'basket-123', address);

            expect(mockShopperBasketsV2.createShipmentForBasket).toHaveBeenCalledWith({
                params: { path: { basketId: 'basket-123' } },
                body: {
                    shipmentId: expect.stringContaining('Shipment_'),
                    shippingAddress: address,
                },
            });
            expect(capturedBody.shippingAddress).toEqual(address);
            expect(result.shipmentId).toBe(capturedBody.shipmentId);
        });

        it('throws error when shipment not found after creation', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [],
            } as ShopperBasketsV2.schemas['Basket'];

            mockShopperBasketsV2.createShipmentForBasket.mockResolvedValue({
                data: { shipments: [] }, // No shipments returned
            });

            await expect(findOrCreateDeliveryShipment(basket, mockContext)).rejects.toThrow('Shipment was not created');
        });
    });
});

describe('assign products to default shipment for single address checkout', () => {
    const mockContext = {} as Readonly<RouterContextProvider>;

    let mockShopperBasketsV2: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockShopperBasketsV2 = {
            updateItemsInBasket: vi.fn(),
            getBasket: vi.fn(),
        };

        vi.mocked(createApiClients).mockReturnValue({
            shopperBasketsV2: mockShopperBasketsV2,
        } as any);
    });

    describe('validation', () => {
        it('throws error when basket is missing basketId', async () => {
            const basket = {} as ShopperBasketsV2.schemas['Basket'];

            await expect(assignProductsToDefaultShipment(basket, mockContext)).rejects.toThrow(
                'Basket is missing a basketId'
            );
        });

        it('throws error when basket has no shipments', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [],
            } as ShopperBasketsV2.schemas['Basket'];

            await expect(assignProductsToDefaultShipment(basket, mockContext)).rejects.toThrow(
                'Basket has no delivery shipments'
            );
        });
    });

    describe('when default shipment exists', () => {
        it('returns basket unchanged when all items are already in default shipment', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [
                    {
                        shipmentId: 'me',
                    },
                ],
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 1,
                        shipmentId: 'me',
                    },
                    {
                        itemId: 'item-2',
                        productId: 'prod-2',
                        quantity: 2,
                        shipmentId: 'me',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const updatedBasket = {
                basketId: 'basket-123',
                shipments: basket.shipments,
                productItems: basket.productItems,
            };

            mockShopperBasketsV2.getBasket.mockResolvedValue({
                data: updatedBasket,
            });

            const result = await assignProductsToDefaultShipment(basket, mockContext);

            expect(mockShopperBasketsV2.updateItemsInBasket).not.toHaveBeenCalled();
            expect(mockShopperBasketsV2.getBasket).toHaveBeenCalledWith({
                params: { path: { basketId: 'basket-123' } },
            });
            expect(result).toEqual(updatedBasket);
        });

        it('moves items from other shipments to default shipment', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [
                    {
                        shipmentId: 'me',
                    },
                    {
                        shipmentId: 'ship-2',
                    },
                ],
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 1,
                        shipmentId: 'me',
                    },
                    {
                        itemId: 'item-2',
                        productId: 'prod-2',
                        quantity: 2,
                        shipmentId: 'ship-2',
                    },
                    {
                        itemId: 'item-3',
                        productId: 'prod-3',
                        quantity: 3,
                        shipmentId: 'ship-2',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const basketAfterMove = {
                basketId: 'basket-123',
                shipments: basket.shipments,
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 1,
                        shipmentId: 'me',
                    },
                    {
                        itemId: 'item-2',
                        productId: 'prod-2',
                        quantity: 2,
                        shipmentId: 'me',
                    },
                    {
                        itemId: 'item-3',
                        productId: 'prod-3',
                        quantity: 3,
                        shipmentId: 'me',
                    },
                ],
            };

            mockShopperBasketsV2.updateItemsInBasket.mockResolvedValue({
                data: basketAfterMove,
            });

            const latestBasket = {
                ...basketAfterMove,
                orderTotal: 100,
            };

            mockShopperBasketsV2.getBasket.mockResolvedValue({
                data: latestBasket,
            });

            const result = await assignProductsToDefaultShipment(basket, mockContext);

            expect(mockShopperBasketsV2.updateItemsInBasket).toHaveBeenCalledWith({
                params: {
                    path: { basketId: 'basket-123' },
                },
                body: [
                    {
                        itemId: 'item-2',
                        productId: 'prod-2',
                        quantity: 2,
                        shipmentId: 'me',
                    },
                    {
                        itemId: 'item-3',
                        productId: 'prod-3',
                        quantity: 3,
                        shipmentId: 'me',
                    },
                ],
            });
            expect(mockShopperBasketsV2.getBasket).toHaveBeenCalledWith({
                params: { path: { basketId: 'basket-123' } },
            });
            expect(result).toEqual(latestBasket);
        });

        it('skips items without itemId or shipmentId', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [
                    {
                        shipmentId: 'me',
                    },
                    {
                        shipmentId: 'ship-2',
                    },
                ],
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 1,
                        shipmentId: 'me',
                    },
                    {
                        // Missing itemId
                        productId: 'prod-2',
                        quantity: 2,
                        shipmentId: 'ship-2',
                    },
                    {
                        itemId: 'item-3',
                        // Missing shipmentId
                        productId: 'prod-3',
                        quantity: 3,
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const latestBasket = {
                basketId: 'basket-123',
                shipments: basket.shipments,
                productItems: basket.productItems,
            };

            mockShopperBasketsV2.getBasket.mockResolvedValue({
                data: latestBasket,
            });

            const result = await assignProductsToDefaultShipment(basket, mockContext);

            // Should not try to move items without itemId or shipmentId
            expect(mockShopperBasketsV2.updateItemsInBasket).not.toHaveBeenCalled();
            expect(result).toEqual(latestBasket);
        });
    });

    describe('when default shipment does not exist', () => {
        it('uses first shipment when default shipment does not exist', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [
                    {
                        shipmentId: 'ship-1',
                    },
                    {
                        shipmentId: 'ship-2',
                    },
                ],
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 1,
                        shipmentId: 'ship-1',
                    },
                    {
                        itemId: 'item-2',
                        productId: 'prod-2',
                        quantity: 2,
                        shipmentId: 'ship-2',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const basketAfterMove = {
                basketId: 'basket-123',
                shipments: basket.shipments,
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 1,
                        shipmentId: 'ship-1',
                    },
                    {
                        itemId: 'item-2',
                        productId: 'prod-2',
                        quantity: 2,
                        shipmentId: 'ship-1',
                    },
                ],
            };

            mockShopperBasketsV2.updateItemsInBasket.mockResolvedValue({
                data: basketAfterMove,
            });

            const latestBasket = {
                ...basketAfterMove,
                orderTotal: 150,
            };

            mockShopperBasketsV2.getBasket.mockResolvedValue({
                data: latestBasket,
            });

            const result = await assignProductsToDefaultShipment(basket, mockContext);

            // Should move items to first shipment (ship-1) instead of 'me'
            expect(mockShopperBasketsV2.updateItemsInBasket).toHaveBeenCalledWith({
                params: {
                    path: { basketId: 'basket-123' },
                },
                body: [
                    {
                        itemId: 'item-2',
                        productId: 'prod-2',
                        quantity: 2,
                        shipmentId: 'ship-1',
                    },
                ],
            });
            expect(result).toEqual(latestBasket);
        });

        it('throws error when first shipment has no shipmentId', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [
                    {
                        // Missing shipmentId
                    } as ShopperBasketsV2.schemas['Shipment'],
                ],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            await expect(assignProductsToDefaultShipment(basket, mockContext)).rejects.toThrow(
                'Basket has no delivery shipments'
            );
        });
    });

    describe('excluding pickup items', () => {
        it('excludes pickup items when consolidating to single shipment when multiship', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [
                    {
                        shipmentId: 'me',
                    },
                    {
                        shipmentId: 'delivery-ship-1',
                    },
                    {
                        shipmentId: 'pickup-ship-1',
                        c_fromStoreId: 'store-123',
                    },
                ],
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 1,
                        shipmentId: 'me',
                    },
                    {
                        itemId: 'item-2',
                        productId: 'prod-2',
                        quantity: 2,
                        shipmentId: 'delivery-ship-1',
                    },
                    {
                        itemId: 'item-3',
                        productId: 'prod-3',
                        quantity: 3,
                        shipmentId: 'pickup-ship-1',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const basketAfterMove = {
                basketId: 'basket-123',
                shipments: basket.shipments,
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 1,
                        shipmentId: 'me',
                    },
                    {
                        itemId: 'item-2',
                        productId: 'prod-2',
                        quantity: 2,
                        shipmentId: 'me',
                    },
                    {
                        itemId: 'item-3',
                        productId: 'prod-3',
                        quantity: 3,
                        shipmentId: 'pickup-ship-1',
                    },
                ],
            };

            mockShopperBasketsV2.updateItemsInBasket.mockResolvedValue({
                data: basketAfterMove,
            });

            const latestBasket = {
                ...basketAfterMove,
                orderTotal: 100,
            };

            mockShopperBasketsV2.getBasket.mockResolvedValue({
                data: latestBasket,
            });

            const result = await assignProductsToDefaultShipment(basket, mockContext);

            // Should only move item-2, not pickup item-3
            expect(mockShopperBasketsV2.updateItemsInBasket).toHaveBeenCalledWith({
                params: {
                    path: { basketId: 'basket-123' },
                },
                body: [
                    {
                        itemId: 'item-2',
                        productId: 'prod-2',
                        quantity: 2,
                        shipmentId: 'me',
                    },
                ],
            });
            expect(result).toEqual(latestBasket);
        });

        it('uses first delivery shipment when me is a pickup shipment', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [
                    {
                        shipmentId: 'me',
                        c_fromStoreId: 'store-123', // 'me' is a pickup shipment
                    },
                    {
                        shipmentId: 'delivery-ship-1',
                    },
                ],
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 1,
                        shipmentId: 'delivery-ship-1',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const basketAfterMove = {
                basketId: 'basket-123',
                shipments: basket.shipments,
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 1,
                        shipmentId: 'delivery-ship-1', // Should stay in delivery-ship-1 (target)
                    },
                ],
            };

            mockShopperBasketsV2.updateItemsInBasket.mockResolvedValue({
                data: basketAfterMove,
            });

            const latestBasket = {
                ...basketAfterMove,
                orderTotal: 100,
            };

            mockShopperBasketsV2.getBasket.mockResolvedValue({
                data: latestBasket,
            });

            const result = await assignProductsToDefaultShipment(basket, mockContext);

            // Should not move anything since item is already in target delivery shipment
            expect(mockShopperBasketsV2.updateItemsInBasket).not.toHaveBeenCalled();
            expect(result).toEqual(latestBasket);
        });

        it('throws error when basket has only pickup shipments', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [
                    {
                        shipmentId: 'pickup-ship-1',
                        c_fromStoreId: 'store-123',
                    },
                    {
                        shipmentId: 'pickup-ship-2',
                        c_fromStoreId: 'store-456',
                    },
                ],
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'prod-1',
                        quantity: 1,
                        shipmentId: 'pickup-ship-1',
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            await expect(assignProductsToDefaultShipment(basket, mockContext)).rejects.toThrow(
                'Basket has no delivery shipments'
            );
        });
    });

    describe('edge cases', () => {
        it('handles empty productItems array', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [
                    {
                        shipmentId: 'me',
                    },
                ],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            const latestBasket = {
                basketId: 'basket-123',
                shipments: basket.shipments,
                productItems: [],
            };

            mockShopperBasketsV2.getBasket.mockResolvedValue({
                data: latestBasket,
            });

            const result = await assignProductsToDefaultShipment(basket, mockContext);

            expect(mockShopperBasketsV2.updateItemsInBasket).not.toHaveBeenCalled();
            expect(result).toEqual(latestBasket);
        });

        it('handles undefined productItems', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [
                    {
                        shipmentId: 'me',
                    },
                ],
                productItems: undefined,
            } as ShopperBasketsV2.schemas['Basket'];

            const latestBasket = {
                basketId: 'basket-123',
                shipments: basket.shipments,
                productItems: [],
            };

            mockShopperBasketsV2.getBasket.mockResolvedValue({
                data: latestBasket,
            });

            const result = await assignProductsToDefaultShipment(basket, mockContext);

            expect(mockShopperBasketsV2.updateItemsInBasket).not.toHaveBeenCalled();
            expect(result).toEqual(latestBasket);
        });
    });
});

describe('removeEmptyShipments', () => {
    const mockContext = {} as Readonly<RouterContextProvider>;

    let mockShopperBasketsV2: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockShopperBasketsV2 = {
            removeShipmentFromBasket: vi.fn(),
        };

        vi.mocked(createApiClients).mockReturnValue({
            shopperBasketsV2: mockShopperBasketsV2,
        } as any);
    });

    describe('edge cases', () => {
        it('returns basket unchanged when basket has no shipments', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            const result = await removeEmptyShipments(mockContext, basket);

            expect(result).toBe(basket);
            expect(mockShopperBasketsV2.removeShipmentFromBasket).not.toHaveBeenCalled();
        });

        it('returns basket unchanged when basket has no productItems', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [{ shipmentId: 'shipment-1' }],
                productItems: undefined,
            } as ShopperBasketsV2.schemas['Basket'];

            const result = await removeEmptyShipments(mockContext, basket);

            expect(result).toBe(basket);
            expect(mockShopperBasketsV2.removeShipmentFromBasket).not.toHaveBeenCalled();
        });

        it('returns basket unchanged when basket has no basketId', async () => {
            const basket = {
                shipments: [{ shipmentId: 'shipment-1' }],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            const result = await removeEmptyShipments(mockContext, basket);

            expect(result).toBe(basket);
            expect(mockShopperBasketsV2.removeShipmentFromBasket).not.toHaveBeenCalled();
        });
    });

    describe('removing empty shipments', () => {
        it('does not remove the "me" shipment even if it has no items', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [{ shipmentId: 'me' }, { shipmentId: 'shipment-1' }],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            mockShopperBasketsV2.removeShipmentFromBasket.mockResolvedValue({
                data: {
                    basketId: 'basket-123',
                    shipments: [{ shipmentId: 'me' }],
                    productItems: [],
                },
            });

            const result = await removeEmptyShipments(mockContext, basket);

            expect(mockShopperBasketsV2.removeShipmentFromBasket).toHaveBeenCalledTimes(1);
            expect(mockShopperBasketsV2.removeShipmentFromBasket).toHaveBeenCalledWith({
                params: {
                    path: {
                        basketId: 'basket-123',
                        shipmentId: 'shipment-1',
                    },
                },
            });
            expect(result.shipments?.find((s) => s.shipmentId === 'me')).toBeDefined();
        });

        it('removes empty shipments but keeps shipments with items', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [
                    { shipmentId: 'me' },
                    { shipmentId: 'shipment-with-items' },
                    { shipmentId: 'empty-shipment-1' },
                    { shipmentId: 'empty-shipment-2' },
                ],
                productItems: [
                    { itemId: 'item-1', shipmentId: 'shipment-with-items' },
                    { itemId: 'item-2', shipmentId: 'shipment-with-items' },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const basketAfterFirstDelete = {
                basketId: 'basket-123',
                shipments: [
                    { shipmentId: 'me' },
                    { shipmentId: 'shipment-with-items' },
                    { shipmentId: 'empty-shipment-2' },
                ],
                productItems: basket.productItems,
            };

            const basketAfterSecondDelete = {
                basketId: 'basket-123',
                shipments: [{ shipmentId: 'me' }, { shipmentId: 'shipment-with-items' }],
                productItems: basket.productItems,
            };

            mockShopperBasketsV2.removeShipmentFromBasket
                .mockResolvedValueOnce({ data: basketAfterFirstDelete })
                .mockResolvedValueOnce({ data: basketAfterSecondDelete });

            const result = await removeEmptyShipments(mockContext, basket);

            expect(mockShopperBasketsV2.removeShipmentFromBasket).toHaveBeenCalledTimes(2);
            expect(mockShopperBasketsV2.removeShipmentFromBasket).toHaveBeenNthCalledWith(1, {
                params: {
                    path: {
                        basketId: 'basket-123',
                        shipmentId: 'empty-shipment-1',
                    },
                },
            });
            expect(mockShopperBasketsV2.removeShipmentFromBasket).toHaveBeenNthCalledWith(2, {
                params: {
                    path: {
                        basketId: 'basket-123',
                        shipmentId: 'empty-shipment-2',
                    },
                },
            });
            expect(result.shipments?.length).toBe(2);
            expect(result.shipments?.find((s) => s.shipmentId === 'me')).toBeDefined();
            expect(result.shipments?.find((s) => s.shipmentId === 'shipment-with-items')).toBeDefined();
        });

        it('does not remove shipments that have items assigned', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [{ shipmentId: 'me' }, { shipmentId: 'shipment-1' }, { shipmentId: 'shipment-2' }],
                productItems: [
                    { itemId: 'item-1', shipmentId: 'shipment-1' },
                    { itemId: 'item-2', shipmentId: 'shipment-2' },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const result = await removeEmptyShipments(mockContext, basket);

            expect(mockShopperBasketsV2.removeShipmentFromBasket).not.toHaveBeenCalled();
            expect(result).toBe(basket);
        });

        it('handles shipments without shipmentId', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [
                    { shipmentId: 'me' },
                    { shipmentId: 'empty-shipment-1' },
                    {}, // shipment without shipmentId
                ],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            mockShopperBasketsV2.removeShipmentFromBasket.mockResolvedValue({
                data: {
                    basketId: 'basket-123',
                    shipments: [{ shipmentId: 'me' }, {}],
                    productItems: [],
                },
            });

            await removeEmptyShipments(mockContext, basket);

            expect(mockShopperBasketsV2.removeShipmentFromBasket).toHaveBeenCalledTimes(1);
            expect(mockShopperBasketsV2.removeShipmentFromBasket).toHaveBeenCalledWith({
                params: {
                    path: {
                        basketId: 'basket-123',
                        shipmentId: 'empty-shipment-1',
                    },
                },
            });
        });

        it('returns updated basket after removing empty shipments', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [{ shipmentId: 'me' }, { shipmentId: 'empty-shipment-1' }],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            const updatedBasket = {
                basketId: 'basket-123',
                shipments: [{ shipmentId: 'me' }],
                productItems: [],
            };

            mockShopperBasketsV2.removeShipmentFromBasket.mockResolvedValue({
                data: updatedBasket,
            });

            const result = await removeEmptyShipments(mockContext, basket);

            expect(result).toEqual(updatedBasket);
            expect(result).not.toBe(basket);
        });

        it('handles multiple empty shipments sequentially', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [
                    { shipmentId: 'me' },
                    { shipmentId: 'empty-1' },
                    { shipmentId: 'empty-2' },
                    { shipmentId: 'empty-3' },
                ],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            const basketAfterDelete1 = {
                basketId: 'basket-123',
                shipments: [{ shipmentId: 'me' }, { shipmentId: 'empty-2' }, { shipmentId: 'empty-3' }],
                productItems: [],
            };

            const basketAfterDelete2 = {
                basketId: 'basket-123',
                shipments: [{ shipmentId: 'me' }, { shipmentId: 'empty-3' }],
                productItems: [],
            };

            const basketAfterDelete3 = {
                basketId: 'basket-123',
                shipments: [{ shipmentId: 'me' }],
                productItems: [],
            };

            mockShopperBasketsV2.removeShipmentFromBasket
                .mockResolvedValueOnce({ data: basketAfterDelete1 })
                .mockResolvedValueOnce({ data: basketAfterDelete2 })
                .mockResolvedValueOnce({ data: basketAfterDelete3 });

            const result = await removeEmptyShipments(mockContext, basket);

            expect(mockShopperBasketsV2.removeShipmentFromBasket).toHaveBeenCalledTimes(3);
            expect(result.shipments?.length).toBe(1);
            expect(result.shipments?.[0].shipmentId).toBe('me');
        });

        it('uses provided shipmentIdsWithItems set when passed', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [{ shipmentId: 'me' }, { shipmentId: 'shipment-1' }, { shipmentId: 'empty-shipment-1' }],
                productItems: [{ itemId: 'item-1', shipmentId: 'shipment-1' }],
            } as ShopperBasketsV2.schemas['Basket'];

            // Provide a custom set that excludes 'shipment-1' to test it uses the provided set
            const customSet = new Set<string>(['shipment-1']);

            const updatedBasket = {
                basketId: 'basket-123',
                shipments: [{ shipmentId: 'me' }, { shipmentId: 'shipment-1' }],
                productItems: basket.productItems,
            };

            mockShopperBasketsV2.removeShipmentFromBasket.mockResolvedValue({
                data: updatedBasket,
            });

            await removeEmptyShipments(mockContext, basket, customSet);

            // Should not remove 'shipment-1' because it's in the provided set
            // Should remove 'empty-shipment-1' because it's not in the set
            expect(mockShopperBasketsV2.removeShipmentFromBasket).toHaveBeenCalledTimes(1);
            expect(mockShopperBasketsV2.removeShipmentFromBasket).toHaveBeenCalledWith({
                params: {
                    path: {
                        basketId: 'basket-123',
                        shipmentId: 'empty-shipment-1',
                    },
                },
            });
        });
    });
});

describe('resolveEmptyShipments', () => {
    const mockContext = {} as Readonly<RouterContextProvider>;

    let mockShopperBasketsV2: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockShopperBasketsV2 = {
            removeShipmentFromBasket: vi.fn(),
            updateShippingAddressForShipment: vi.fn(),
            updateShippingMethodForShipment: vi.fn(),
            getBasket: vi.fn(),
        };

        vi.mocked(createApiClients).mockReturnValue({
            shopperBasketsV2: mockShopperBasketsV2,
        } as any);
    });

    describe('edge cases', () => {
        it('returns early when basket has no shipments', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            await resolveEmptyShipments(mockContext, basket);

            expect(mockShopperBasketsV2.removeShipmentFromBasket).not.toHaveBeenCalled();
        });

        it('returns early when basket has no productItems', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [{ shipmentId: 'me' }],
                productItems: undefined,
            } as ShopperBasketsV2.schemas['Basket'];

            await resolveEmptyShipments(mockContext, basket);

            expect(mockShopperBasketsV2.removeShipmentFromBasket).not.toHaveBeenCalled();
        });

        it('returns early when basket has no basketId', async () => {
            const basket = {
                shipments: [{ shipmentId: 'me' }],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            await resolveEmptyShipments(mockContext, basket);

            expect(mockShopperBasketsV2.removeShipmentFromBasket).not.toHaveBeenCalled();
        });
    });

    describe('removing empty shipments and setting up me shipment', () => {
        it('removes empty shipments and sets up me shipment when it has no items', async () => {
            const billingAddress = {
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            } as ShopperBasketsV2.schemas['OrderAddress'];

            const basket = {
                basketId: 'basket-123',
                billingAddress,
                shipments: [{ shipmentId: 'me', shippingAddress: {} }, { shipmentId: 'empty-shipment-1' }],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            const basketAfterRemoveEmpty = {
                basketId: 'basket-123',
                billingAddress,
                shipments: [{ shipmentId: 'me', shippingAddress: {} }],
                productItems: [],
            };

            const basketAfterAddressUpdate = {
                basketId: 'basket-123',
                billingAddress,
                shipments: [{ shipmentId: 'me', shippingAddress: billingAddress }],
                productItems: [],
            };

            mockShopperBasketsV2.removeShipmentFromBasket.mockResolvedValue({
                data: basketAfterRemoveEmpty,
            });

            mockShopperBasketsV2.updateShippingAddressForShipment.mockResolvedValue({
                data: basketAfterAddressUpdate,
            });

            vi.mocked(getShippingMethodsForShipment).mockResolvedValue({
                defaultShippingMethodId: 'standard-shipping',
                applicableShippingMethods: [{ id: 'standard-shipping' }],
            });

            await resolveEmptyShipments(mockContext, basket);

            expect(mockShopperBasketsV2.removeShipmentFromBasket).toHaveBeenCalledTimes(1);
            expect(mockShopperBasketsV2.updateShippingAddressForShipment).toHaveBeenCalledWith({
                params: {
                    path: {
                        basketId: 'basket-123',
                        shipmentId: 'me',
                    },
                    query: {
                        useAsBilling: false,
                    },
                },
                body: billingAddress,
            });
        });

        it('does not set up me shipment when it already has items', async () => {
            const basket = {
                basketId: 'basket-123',
                billingAddress: { address1: '123 Main St' },
                shipments: [{ shipmentId: 'me', shippingAddress: {} }, { shipmentId: 'empty-shipment-1' }],
                productItems: [{ itemId: 'item-1', shipmentId: 'me' }],
            } as ShopperBasketsV2.schemas['Basket'];

            const basketAfterRemoveEmpty = {
                basketId: 'basket-123',
                billingAddress: basket.billingAddress,
                shipments: [{ shipmentId: 'me', shippingAddress: {} }],
                productItems: basket.productItems,
            };

            mockShopperBasketsV2.removeShipmentFromBasket.mockResolvedValue({
                data: basketAfterRemoveEmpty,
            });

            await resolveEmptyShipments(mockContext, basket);

            expect(mockShopperBasketsV2.removeShipmentFromBasket).toHaveBeenCalledTimes(1);
            expect(mockShopperBasketsV2.updateShippingAddressForShipment).not.toHaveBeenCalled();
        });

        it('does not set up me shipment when address is not empty', async () => {
            const basket = {
                basketId: 'basket-123',
                billingAddress: { address1: '123 Main St' },
                shipments: [
                    { shipmentId: 'me', shippingAddress: { address1: '456 Oak Ave' } },
                    { shipmentId: 'empty-shipment-1' },
                ],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            const basketAfterRemoveEmpty = {
                basketId: 'basket-123',
                billingAddress: basket.billingAddress,
                shipments: [{ shipmentId: 'me', shippingAddress: { address1: '456 Oak Ave' } }],
                productItems: [],
            };

            mockShopperBasketsV2.removeShipmentFromBasket.mockResolvedValue({
                data: basketAfterRemoveEmpty,
            });

            await resolveEmptyShipments(mockContext, basket);

            expect(mockShopperBasketsV2.removeShipmentFromBasket).toHaveBeenCalledTimes(1);
            expect(mockShopperBasketsV2.updateShippingAddressForShipment).not.toHaveBeenCalled();
        });

        it('sets shipping method when me shipment has no method', async () => {
            const billingAddress = {
                address1: '123 Main St',
                city: 'Springfield',
            } as ShopperBasketsV2.schemas['OrderAddress'];

            const basket = {
                basketId: 'basket-123',
                billingAddress,
                shipments: [{ shipmentId: 'me', shippingAddress: {}, shippingMethod: undefined }],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            const basketAfterRemoveEmpty = {
                basketId: 'basket-123',
                billingAddress,
                shipments: [{ shipmentId: 'me', shippingAddress: {}, shippingMethod: undefined }],
                productItems: [],
            };

            mockShopperBasketsV2.removeShipmentFromBasket.mockResolvedValue({
                data: basketAfterRemoveEmpty,
            });

            mockShopperBasketsV2.updateShippingAddressForShipment.mockResolvedValue({
                data: {
                    ...basketAfterRemoveEmpty,
                    shipments: [{ shipmentId: 'me', shippingAddress: billingAddress }],
                },
            });

            vi.mocked(getShippingMethodsForShipment).mockResolvedValue({
                defaultShippingMethodId: 'standard-shipping',
                applicableShippingMethods: [{ id: 'standard-shipping' }],
            });

            await resolveEmptyShipments(mockContext, basket);

            expect(mockShopperBasketsV2.updateShippingMethodForShipment).toHaveBeenCalledWith({
                params: {
                    path: {
                        basketId: 'basket-123',
                        shipmentId: 'me',
                    },
                },
                body: {
                    id: 'standard-shipping',
                },
            });
        });

        it('does not set shipping method when me shipment already has one', async () => {
            const billingAddress = {
                address1: '123 Main St',
            } as ShopperBasketsV2.schemas['OrderAddress'];

            const basket = {
                basketId: 'basket-123',
                billingAddress,
                shipments: [
                    {
                        shipmentId: 'me',
                        shippingAddress: {},
                        shippingMethod: { id: 'existing-method' },
                    },
                ] as ShopperBasketsV2.schemas['Shipment'][],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            const basketAfterRemoveEmpty = {
                basketId: 'basket-123',
                billingAddress,
                shipments: [
                    {
                        shipmentId: 'me',
                        shippingAddress: {},
                        shippingMethod: { id: 'existing-method' },
                    },
                ],
                productItems: [],
            };

            mockShopperBasketsV2.removeShipmentFromBasket.mockResolvedValue({
                data: basketAfterRemoveEmpty,
            });

            mockShopperBasketsV2.updateShippingAddressForShipment.mockResolvedValue({
                data: {
                    ...basketAfterRemoveEmpty,
                    shipments: [{ shipmentId: 'me', shippingAddress: billingAddress }],
                },
            });

            await resolveEmptyShipments(mockContext, basket);

            expect(mockShopperBasketsV2.updateShippingMethodForShipment).not.toHaveBeenCalled();
        });

        it('returns early when updatedBasket has no basketId after removing empty shipments', async () => {
            const basket = {
                basketId: 'basket-123',
                shipments: [{ shipmentId: 'empty-shipment-1' }],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            // Mock removeEmptyShipments to return a basket without basketId
            const basketWithoutId = {
                shipments: [],
                productItems: [],
            } as ShopperBasketsV2.schemas['Basket'];

            mockShopperBasketsV2.removeShipmentFromBasket.mockResolvedValue({
                data: basketWithoutId,
            });

            await resolveEmptyShipments(mockContext, basket);

            // Should return early, so no further API calls should be made
            expect(mockShopperBasketsV2.updateShippingAddressForShipment).not.toHaveBeenCalled();
            expect(mockShopperBasketsV2.updateShippingMethodForShipment).not.toHaveBeenCalled();
        });
    });
});
