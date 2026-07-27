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
import { handleMultiShipShippingAddress } from './checkout-submit-multi-address.server';
import { ApiError, type ShopperBasketsV2, type ShopperCustomers } from '@/scapi';
import type { ActionFunctionArgs } from 'react-router';
import { createApiClients } from '@/lib/api-clients.server';
import { updateShipmentAddress, createDeliveryShipment } from '@/extensions/multiship/lib/api/basket.server';
import { updateBasketWithCustomerInfoFallback } from '@/extensions/multiship/lib/basket-utils.server';
import { isRegisteredCustomer, getCurrentCustomer, saveCustomerAddress } from '@/lib/api/customer.server';
import { getAddressKey, isAddressEqual, customerAddressToOrderAddress } from '@/lib/address/address-utils';
import { fetchShippingMethodsMapForBasket } from '@/lib/checkout/loaders.server';
import { extractResponseError } from '@/lib/utils';

// Mock dependencies
vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: vi.fn(),
}));

vi.mock('@/extensions/multiship/lib/api/basket.server', () => ({
    updateShipmentAddress: vi.fn(),
    createDeliveryShipment: vi.fn(),
}));

vi.mock('@/extensions/multiship/lib/basket-utils.server', () => ({
    updateBasketWithCustomerInfoFallback: vi.fn(),
}));

vi.mock('@/lib/api/customer.server', () => ({
    isRegisteredCustomer: vi.fn(),
    getCurrentCustomer: vi.fn(),
    saveCustomerAddress: vi.fn(),
}));

vi.mock('@/lib/address/address-utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/address/address-utils')>();
    return {
        ...actual,
        getAddressKey: vi.fn((addr) => `${addr.firstName}-${addr.lastName}-${addr.address1}`),
        isAddressEqual: vi.fn(() => false),
        customerAddressToOrderAddress: vi.fn(
            (addr: {
                firstName?: string;
                lastName?: string;
                address1?: string;
                city?: string;
                stateCode?: string;
                postalCode?: string;
                countryCode?: string;
            }) => ({
                firstName: addr.firstName,
                lastName: addr.lastName,
                address1: addr.address1,
                city: addr.city,
                stateCode: addr.stateCode,
                postalCode: addr.postalCode,
                countryCode: addr.countryCode,
            })
        ),
    };
});

vi.mock('@salesforce/storefront-next-runtime/i18n', () => ({
    getTranslation: vi.fn(() => ({
        t: (key: string) => key,
    })),
}));

vi.mock('@/lib/checkout/loaders.server', () => ({
    fetchShippingMethodsMapForBasket: vi.fn(),
}));

vi.mock('@/lib/utils', () => ({
    extractResponseError: vi.fn((error) => error),
}));

describe('checkout-submit-multi-address', () => {
    const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
        basketId: 'test-basket-123',
        productItems: [
            {
                itemId: 'item-1',
                productId: 'product-1',
                quantity: 1,
            },
            {
                itemId: 'item-2',
                productId: 'product-2',
                quantity: 2,
            },
        ],
        shipments: [
            {
                shipmentId: 'ship-1',
                shippingAddress: {
                    firstName: 'John',
                    lastName: 'Doe',
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                },
            },
        ],
    } as ShopperBasketsV2.schemas['Basket'];

    const mockContext = {} as ActionFunctionArgs['context'];

    let mockShopperBasketsV2: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockShopperBasketsV2 = {
            updateItemsInBasket: vi.fn(),
        };

        vi.mocked(createApiClients).mockReturnValue({
            shopperBasketsV2: mockShopperBasketsV2,
        } as any);
    });

    describe('handleMultiShipShippingAddress', () => {
        it('returns null when formData does not indicate multi-ship', async () => {
            const formData = new FormData();
            formData.append('address1', '123 Main St');
            formData.append('city', 'San Francisco');

            const result = await handleMultiShipShippingAddress(formData, mockBasket, mockContext);

            expect(result).toBeNull();
        });

        it('returns error response when addresses JSON is missing', async () => {
            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            // Missing addresses

            const result = await handleMultiShipShippingAddress(formData, mockBasket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(false);
            expect(json.step).toBe('shippingAddress');
        });

        it('returns error response when deliveryShipmentIds JSON is missing', async () => {
            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append('addresses', JSON.stringify({}));
            // Missing deliveryShipmentIds

            const result = await handleMultiShipShippingAddress(formData, mockBasket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(false);
            expect(json.step).toBe('shippingAddress');
        });

        it('returns error response when addresses JSON is invalid', async () => {
            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append('addresses', 'invalid json');
            formData.append('deliveryShipmentIds', JSON.stringify(['ship-1']));

            const result = await handleMultiShipShippingAddress(formData, mockBasket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(false);
            expect(json.step).toBe('shippingAddress');
        });

        it('returns error response when deliveryShipmentIds JSON is invalid', async () => {
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append(
                'addresses',
                JSON.stringify({
                    'John-Doe-123 Main St': {
                        address: customerAddress,
                        itemIds: ['item-1'],
                    },
                })
            );
            formData.append('deliveryShipmentIds', 'invalid json');

            const result = await handleMultiShipShippingAddress(formData, mockBasket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(false);
            expect(json.step).toBe('shippingAddress');
        });

        it('successfully processes multi-ship submission with existing shipments', async () => {
            const customerAddress1: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            const customerAddress2: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-2',
                firstName: 'Jane',
                lastName: 'Smith',
                address1: '456 Oak Ave',
                city: 'Portland',
                stateCode: 'OR',
                postalCode: '97201',
                countryCode: 'US',
            };

            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'test-basket-123',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                    },
                    {
                        itemId: 'item-2',
                        productId: 'product-2',
                        quantity: 2,
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'Springfield',
                            stateCode: 'IL',
                            postalCode: '62701',
                            countryCode: 'US',
                        },
                    },
                    {
                        shipmentId: 'ship-2',
                        shippingAddress: {
                            firstName: 'Jane',
                            lastName: 'Smith',
                            address1: '456 Oak Ave',
                            city: 'Portland',
                            stateCode: 'OR',
                            postalCode: '97201',
                            countryCode: 'US',
                        },
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append(
                'addresses',
                JSON.stringify({
                    'John-Doe-123 Main St': {
                        address: customerAddress1,
                        itemIds: ['item-1'],
                    },
                    'Jane-Smith-456 Oak Ave': {
                        address: customerAddress2,
                        itemIds: ['item-2'],
                    },
                })
            );
            // Addresses are sorted alphabetically, so 'Jane-Smith-456 Oak Ave' comes first
            // Match them to shipments in sorted order
            formData.append('deliveryShipmentIds', JSON.stringify(['ship-2', 'ship-1']));

            // Mock isAddressEqual to return true for matching addresses
            // Also ensure customerAddressToOrderAddress returns the correct structure
            vi.mocked(customerAddressToOrderAddress).mockImplementation((addr) => ({
                firstName: addr.firstName,
                lastName: addr.lastName,
                address1: addr.address1,
                city: addr.city,
                stateCode: addr.stateCode,
                postalCode: addr.postalCode,
                countryCode: addr.countryCode,
            }));
            vi.mocked(isAddressEqual).mockImplementation((addr1, addr2) => {
                if (!addr1 || !addr2) return false;
                return addr1.address1 === addr2.address1 && addr1.city === addr2.city;
            });

            const updatedBasket = { ...basket, orderTotal: 100 };
            mockShopperBasketsV2.updateItemsInBasket.mockResolvedValue({
                data: updatedBasket,
            });

            vi.mocked(fetchShippingMethodsMapForBasket).mockResolvedValue({
                'ship-1': {
                    applicableShippingMethods: [],
                },
                'ship-2': {
                    applicableShippingMethods: [],
                },
            });

            vi.mocked(isRegisteredCustomer).mockReturnValue(false);

            const result = await handleMultiShipShippingAddress(formData, basket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(true);
            expect(json.step).toBe('shippingAddress');
            expect(json.basket).toEqual(updatedBasket);
            expect(mockShopperBasketsV2.updateItemsInBasket).toHaveBeenCalled();
        });

        it('creates new shipments when existing shipments are insufficient', async () => {
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            // Start with no shipments to force creation of a new one
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'test-basket-123',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                    },
                ],
                shipments: [],
            } as ShopperBasketsV2.schemas['Basket'];

            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append(
                'addresses',
                JSON.stringify({
                    'John-Doe-123 Main St': {
                        address: customerAddress,
                        itemIds: ['item-1'],
                    },
                })
            );
            formData.append('deliveryShipmentIds', JSON.stringify([]));

            vi.mocked(customerAddressToOrderAddress).mockImplementation((addr) => ({
                firstName: addr.firstName,
                lastName: addr.lastName,
                address1: addr.address1,
                city: addr.city,
                stateCode: addr.stateCode,
                postalCode: addr.postalCode,
                countryCode: addr.countryCode,
            }));

            const newShipment = {
                shipmentId: 'ship-1',
                shippingAddress: customerAddressToOrderAddress(customerAddress),
            };
            const updatedBasket = {
                ...basket,
                shipments: [newShipment],
            };
            vi.mocked(createDeliveryShipment).mockResolvedValue({
                basket: updatedBasket,
                shipmentId: 'ship-1',
            });

            mockShopperBasketsV2.updateItemsInBasket.mockResolvedValue({
                data: updatedBasket,
            });

            vi.mocked(fetchShippingMethodsMapForBasket).mockResolvedValue({});
            vi.mocked(isRegisteredCustomer).mockReturnValue(false);

            const result = await handleMultiShipShippingAddress(formData, basket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(true);
            expect(json.step).toBe('shippingAddress');
            expect(createDeliveryShipment).toHaveBeenCalled();
        });

        it('updates shipment address when address differs', async () => {
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'test-basket-123',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: {
                            firstName: 'Old',
                            lastName: 'Address',
                            address1: '999 Old St',
                            city: 'Old City',
                            stateCode: 'CA',
                            postalCode: '90001',
                            countryCode: 'US',
                        },
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append(
                'addresses',
                JSON.stringify({
                    'John-Doe-123 Main St': {
                        address: customerAddress,
                        itemIds: ['item-1'],
                    },
                })
            );
            formData.append('deliveryShipmentIds', JSON.stringify(['ship-1']));

            vi.mocked(isAddressEqual).mockReturnValue(false);

            const updatedBasketAfterAddress = {
                ...basket,
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: customerAddressToOrderAddress(customerAddress),
                    },
                ],
            };
            vi.mocked(updateShipmentAddress).mockResolvedValue(updatedBasketAfterAddress);

            mockShopperBasketsV2.updateItemsInBasket.mockResolvedValue({
                data: updatedBasketAfterAddress,
            });

            vi.mocked(fetchShippingMethodsMapForBasket).mockResolvedValue({});
            vi.mocked(isRegisteredCustomer).mockReturnValue(false);

            const result = await handleMultiShipShippingAddress(formData, basket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(true);
            expect(updateShipmentAddress).toHaveBeenCalled();
        });

        it('saves addresses to customer profile for registered customers', async () => {
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'test-basket-123',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: customerAddressToOrderAddress(customerAddress),
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append(
                'addresses',
                JSON.stringify({
                    'John-Doe-123 Main St': {
                        address: customerAddress,
                        itemIds: ['item-1'],
                    },
                })
            );
            formData.append('deliveryShipmentIds', JSON.stringify(['ship-1']));

            vi.mocked(isAddressEqual).mockReturnValue(true);
            vi.mocked(isRegisteredCustomer).mockReturnValue(true);
            vi.mocked(getCurrentCustomer).mockResolvedValue({
                customerId: 'customer-123',
                addresses: [], // No existing addresses
            } as any);

            vi.mocked(getAddressKey).mockReturnValue('John-Doe-123 Main St');
            vi.mocked(saveCustomerAddress).mockResolvedValue(true);

            const updatedBasket = { ...basket };
            mockShopperBasketsV2.updateItemsInBasket.mockResolvedValue({
                data: updatedBasket,
            });

            vi.mocked(fetchShippingMethodsMapForBasket).mockResolvedValue({});

            const result = await handleMultiShipShippingAddress(formData, basket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(true);
            expect(saveCustomerAddress).toHaveBeenCalledWith(mockContext, 'customer-123', customerAddress);
        });

        it('does not save addresses that already exist in customer profile', async () => {
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'test-basket-123',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: customerAddressToOrderAddress(customerAddress),
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append(
                'addresses',
                JSON.stringify({
                    'John-Doe-123 Main St': {
                        address: customerAddress,
                        itemIds: ['item-1'],
                    },
                })
            );
            formData.append('deliveryShipmentIds', JSON.stringify(['ship-1']));

            vi.mocked(isAddressEqual).mockReturnValue(true);
            vi.mocked(isRegisteredCustomer).mockReturnValue(true);
            vi.mocked(getCurrentCustomer).mockResolvedValue({
                customerId: 'customer-123',
                addresses: [customerAddress], // Address already exists
            } as any);

            vi.mocked(getAddressKey).mockReturnValue('John-Doe-123 Main St');

            const updatedBasket = { ...basket };
            mockShopperBasketsV2.updateItemsInBasket.mockResolvedValue({
                data: updatedBasket,
            });

            vi.mocked(fetchShippingMethodsMapForBasket).mockResolvedValue({});

            const result = await handleMultiShipShippingAddress(formData, basket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(true);
            expect(saveCustomerAddress).not.toHaveBeenCalled();
        });

        it('handles profile update errors gracefully', async () => {
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'test-basket-123',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: customerAddressToOrderAddress(customerAddress),
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append(
                'addresses',
                JSON.stringify({
                    'John-Doe-123 Main St': {
                        address: customerAddress,
                        itemIds: ['item-1'],
                    },
                })
            );
            formData.append('deliveryShipmentIds', JSON.stringify(['ship-1']));

            vi.mocked(isAddressEqual).mockReturnValue(true);
            vi.mocked(isRegisteredCustomer).mockReturnValue(true);
            vi.mocked(getCurrentCustomer).mockResolvedValue({
                customerId: 'customer-123',
                addresses: [],
            } as any);

            vi.mocked(getAddressKey).mockReturnValue('John-Doe-123 Main St');
            vi.mocked(saveCustomerAddress).mockResolvedValue(false); // Save fails

            const updatedBasket = { ...basket };
            mockShopperBasketsV2.updateItemsInBasket.mockResolvedValue({
                data: updatedBasket,
            });

            vi.mocked(fetchShippingMethodsMapForBasket).mockResolvedValue({});

            const result = await handleMultiShipShippingAddress(formData, basket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(true);
            expect(json.profileUpdateError).toBe(true);
        });

        it('handles ApiError and extracts error message', async () => {
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'test-basket-123',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                    },
                ],
                shipments: [],
            } as ShopperBasketsV2.schemas['Basket'];

            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append(
                'addresses',
                JSON.stringify({
                    'John-Doe-123 Main St': {
                        address: customerAddress,
                        itemIds: ['item-1'],
                    },
                })
            );
            formData.append('deliveryShipmentIds', JSON.stringify(['ship-1']));

            const apiError = new ApiError({
                status: 400,
                statusText: 'Bad Request',
                body: { detail: 'Invalid shipment ID' },
            } as any);

            vi.mocked(createDeliveryShipment).mockRejectedValue(apiError);
            vi.mocked(extractResponseError).mockResolvedValue({
                responseMessage: 'Invalid shipment ID',
            } as any);

            const result = await handleMultiShipShippingAddress(formData, basket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(false);
            expect(json.error).toBe('Invalid shipment ID');
            expect(json.step).toBe('shippingAddress');
        });

        it('handles generic errors with default message', async () => {
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'test-basket-123',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                    },
                ],
                shipments: [],
            } as ShopperBasketsV2.schemas['Basket'];

            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append(
                'addresses',
                JSON.stringify({
                    'John-Doe-123 Main St': {
                        address: customerAddress,
                        itemIds: ['item-1'],
                    },
                })
            );
            formData.append('deliveryShipmentIds', JSON.stringify(['ship-1']));

            vi.mocked(createDeliveryShipment).mockRejectedValue(new Error('Network error'));

            const result = await handleMultiShipShippingAddress(formData, basket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(false);
            expect(json.error).toBe('errors:checkout.addressValidationFailed');
            expect(json.step).toBe('shippingAddress');
        });

        it('handles case when no items need to be updated', async () => {
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'test-basket-123',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                        shipmentId: 'ship-1', // Already assigned
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: customerAddressToOrderAddress(customerAddress),
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append(
                'addresses',
                JSON.stringify({
                    'John-Doe-123 Main St': {
                        address: customerAddress,
                        itemIds: ['nonexistent-item'], // Item doesn't exist in basket
                    },
                })
            );
            formData.append('deliveryShipmentIds', JSON.stringify(['ship-1']));

            vi.mocked(isAddressEqual).mockReturnValue(true);

            vi.mocked(fetchShippingMethodsMapForBasket).mockResolvedValue({});
            vi.mocked(isRegisteredCustomer).mockReturnValue(false);

            const result = await handleMultiShipShippingAddress(formData, basket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(true);
            // Should not call updateItemsInBasket when no items to update
            expect(mockShopperBasketsV2.updateItemsInBasket).not.toHaveBeenCalled();
        });

        it('handles multiple addresses with different shipments', async () => {
            const customerAddress1: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            const customerAddress2: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-2',
                firstName: 'Jane',
                lastName: 'Smith',
                address1: '456 Oak Ave',
                city: 'Portland',
                stateCode: 'OR',
                postalCode: '97201',
                countryCode: 'US',
            };

            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'test-basket-123',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                    },
                    {
                        itemId: 'item-2',
                        productId: 'product-2',
                        quantity: 2,
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: {
                            firstName: 'Old',
                            lastName: 'Address',
                            address1: '999 Old St',
                            city: 'Old City',
                            stateCode: 'CA',
                            postalCode: '90001',
                            countryCode: 'US',
                        },
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append(
                'addresses',
                JSON.stringify({
                    'John-Doe-123 Main St': {
                        address: customerAddress1,
                        itemIds: ['item-1'],
                    },
                    'Jane-Smith-456 Oak Ave': {
                        address: customerAddress2,
                        itemIds: ['item-2'],
                    },
                })
            );
            // Addresses are sorted alphabetically: 'Jane-Smith-456 Oak Ave' comes first
            // First address (Jane) will update existing shipment, second (John) will create new one
            formData.append('deliveryShipmentIds', JSON.stringify(['ship-1']));

            // Mock isAddressEqual to return false (addresses don't match)
            vi.mocked(isAddressEqual).mockReturnValue(false);
            vi.mocked(customerAddressToOrderAddress).mockImplementation((addr) => ({
                firstName: addr.firstName,
                lastName: addr.lastName,
                address1: addr.address1,
                city: addr.city,
                stateCode: addr.stateCode,
                postalCode: addr.postalCode,
                countryCode: addr.countryCode,
            }));

            // First address (Jane-Smith) updates existing shipment
            const basketAfterFirstUpdate = {
                ...basket,
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: customerAddressToOrderAddress(customerAddress2),
                    },
                ],
            };
            vi.mocked(updateShipmentAddress).mockResolvedValue(basketAfterFirstUpdate);

            // Second address (John-Doe) creates new shipment
            const basketAfterCreate = {
                ...basketAfterFirstUpdate,
                shipments: [
                    ...basketAfterFirstUpdate.shipments,
                    {
                        shipmentId: 'ship-2',
                        shippingAddress: customerAddressToOrderAddress(customerAddress1),
                    },
                ],
            };
            vi.mocked(createDeliveryShipment).mockResolvedValue({
                basket: basketAfterCreate,
                shipmentId: 'ship-2',
            });

            mockShopperBasketsV2.updateItemsInBasket.mockResolvedValue({
                data: basketAfterCreate,
            });

            vi.mocked(fetchShippingMethodsMapForBasket).mockResolvedValue({});
            vi.mocked(isRegisteredCustomer).mockReturnValue(false);

            const result = await handleMultiShipShippingAddress(formData, basket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(true);
            expect(updateShipmentAddress).toHaveBeenCalled();
            expect(createDeliveryShipment).toHaveBeenCalled();
            expect(mockShopperBasketsV2.updateItemsInBasket).toHaveBeenCalledWith({
                params: {
                    path: { basketId: 'test-basket-123' },
                },
                body: [
                    {
                        itemId: 'item-2',
                        productId: 'product-2',
                        quantity: 2,
                        shipmentId: 'ship-1',
                    },
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                        shipmentId: 'ship-2',
                    },
                ],
            });
        });

        it('calls updateBasketWithCustomerInfoFallback with final basket', async () => {
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'test-basket-123',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: customerAddressToOrderAddress(customerAddress),
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append(
                'addresses',
                JSON.stringify({
                    'John-Doe-123 Main St': {
                        address: customerAddress,
                        itemIds: ['item-1'],
                    },
                })
            );
            formData.append('deliveryShipmentIds', JSON.stringify(['ship-1']));

            vi.mocked(isAddressEqual).mockReturnValue(true);

            const updatedBasket = { ...basket, orderTotal: 100 };
            mockShopperBasketsV2.updateItemsInBasket.mockResolvedValue({
                data: updatedBasket,
            });

            vi.mocked(fetchShippingMethodsMapForBasket).mockResolvedValue({});
            vi.mocked(isRegisteredCustomer).mockReturnValue(false);

            const result = await handleMultiShipShippingAddress(formData, basket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(true);
            expect(updateBasketWithCustomerInfoFallback).toHaveBeenCalledWith(mockContext, updatedBasket);
        });

        it('fetches shipping methods map for updated basket', async () => {
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'test-basket-123',
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: customerAddressToOrderAddress(customerAddress),
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket'];

            const formData = new FormData();
            formData.append('isMultiShip', 'true');
            formData.append(
                'addresses',
                JSON.stringify({
                    'John-Doe-123 Main St': {
                        address: customerAddress,
                        itemIds: ['item-1'],
                    },
                })
            );
            formData.append('deliveryShipmentIds', JSON.stringify(['ship-1']));

            vi.mocked(isAddressEqual).mockReturnValue(true);

            const updatedBasket = { ...basket };
            mockShopperBasketsV2.updateItemsInBasket.mockResolvedValue({
                data: updatedBasket,
            });

            const shippingMethodsMap = {
                'ship-1': {
                    applicableShippingMethods: [
                        {
                            id: 'standard',
                            name: 'Standard Shipping',
                            price: 5.99,
                        },
                    ],
                },
            };
            vi.mocked(fetchShippingMethodsMapForBasket).mockResolvedValue(shippingMethodsMap);
            vi.mocked(isRegisteredCustomer).mockReturnValue(false);

            const result = await handleMultiShipShippingAddress(formData, basket, mockContext);

            expect(result).not.toBeNull();
            if (!result) {
                throw new Error('Expected result to be non-null');
            }
            const json = await result.json();
            expect(json.success).toBe(true);
            expect(json.data.shippingMethodsMap).toEqual(shippingMethodsMap);
            expect(fetchShippingMethodsMapForBasket).toHaveBeenCalledWith(mockContext, updatedBasket);
        });
    });
});
