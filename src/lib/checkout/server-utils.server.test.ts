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
import type { SessionData } from '@/lib/api/types';
import { getServerCustomerProfile, getServerCheckoutData, getServerShippingMethodsMap } from './server-utils.server';

// Mock the dependencies
vi.mock('react-router', async (importOriginal) => {
    const actual: any = await importOriginal();
    return {
        ...actual,
        createCookie: vi.fn(() => ({
            parse: vi.fn(),
        })),
        createContext: vi.fn(),
    };
});

vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: vi.fn(() => ({
        shopperBasketsV2: {
            getBasket: vi.fn(),
        },
        shopperCustomers: {
            getCustomer: vi.fn(),
        },
    })),
}));

vi.mock('@salesforce/storefront-next-runtime/config', async (importOriginal) => {
    const actual: any = await importOriginal();
    return {
        ...actual,
        getConfig: vi.fn(() => ({
            commerce: {
                api: {
                    organizationId: 'test-org-id',
                    siteId: 'test-site-id',
                },
            },
        })),
    };
});

vi.mock('@/lib/api/shipping-methods.server', () => ({
    getShippingMethodsForShipment: vi.fn(),
}));

vi.mock('@/middlewares/basket.server', () => ({
    getBasket: vi.fn(),
}));

vi.mock('@/lib/checkout/loaders.server', () => ({
    fetchShippingMethodsMapForBasket: vi.fn(),
}));

describe('Checkout Server Utils', () => {
    let mockContext: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock context
        mockContext = {};
    });

    describe('getServerCustomerProfile', () => {
        it('should fetch customer profile for registered users', async () => {
            const { createApiClients } = await import('@/lib/api-clients.server');

            const mockAuthSession: SessionData = {
                accessToken: 'test-token',
                customerId: 'test-customer-id',
                userType: 'registered',
            };

            const mockCustomer = {
                customerId: 'test-customer-id',
                addresses: [],
                paymentInstruments: [],
            };

            const mockProfile = {
                customer: mockCustomer,
                addresses: [],
                paymentInstruments: [],
                preferredShippingAddress: undefined,
                preferredBillingAddress: undefined,
            };

            const mockCustomerClient = {
                getCustomer: vi.fn().mockResolvedValue({ data: mockCustomer }),
            };

            const mockClients = {
                shopperCustomers: mockCustomerClient,
            };

            vi.mocked(createApiClients).mockReturnValue(mockClients as any);

            const result = await getServerCustomerProfile(mockContext, mockAuthSession);

            expect(result).toEqual(mockProfile);
            expect(mockCustomerClient.getCustomer).toHaveBeenCalledWith({
                params: {
                    path: {
                        customerId: 'test-customer-id',
                    },
                },
            });
        });

        it('should return null for guest users', async () => {
            const mockAuthSession: SessionData = {
                accessToken: 'test-token',
                customerId: 'test-customer-id',
                userType: 'guest',
            };

            const result = await getServerCustomerProfile(mockContext, mockAuthSession);

            expect(result).toBeNull();
        });

        it('should return null when no auth session is available', async () => {
            const result = await getServerCustomerProfile(mockContext, null as any);

            expect(result).toBeNull();
        });

        it('should return null when customer_id is missing', async () => {
            const mockAuthSession: SessionData = {
                accessToken: 'test-token',
                customerId: undefined,
                userType: 'registered',
            };

            const result = await getServerCustomerProfile(mockContext, mockAuthSession);

            expect(result).toBeNull();
        });
    });

    describe('getServerShippingMethodsMap', () => {
        it('should fetch shipping methods for basket', async () => {
            const { getBasket } = await import('@/middlewares/basket.server');
            const { fetchShippingMethodsMapForBasket } = await import('@/lib/checkout/loaders.server');

            const mockBasket = {
                basketId: 'test-basket',
                shipments: [{ shipmentId: 'shipment-1', shippingAddress: { address1: '123 Main St' } }],
            };

            const mockShippingMethods = {
                'shipment-1': {
                    applicableShippingMethods: [{ id: 'standard', name: 'Standard' }],
                },
            };

            vi.mocked(getBasket).mockResolvedValue({ current: mockBasket, snapshot: null } as any);
            vi.mocked(fetchShippingMethodsMapForBasket).mockResolvedValue(mockShippingMethods as any);

            const result = await getServerShippingMethodsMap(mockContext);

            expect(result).toEqual(mockShippingMethods);
            expect(fetchShippingMethodsMapForBasket).toHaveBeenCalledWith(mockContext, mockBasket);
        });
    });

    describe('getServerCheckoutData', () => {
        it('should fetch all checkout data successfully for registered user', async () => {
            const { createApiClients } = await import('@/lib/api-clients.server');
            const { getBasket } = await import('@/middlewares/basket.server');
            const { fetchShippingMethodsMapForBasket } = await import('@/lib/checkout/loaders.server');

            const mockAuthSession: SessionData = {
                accessToken: 'test-token',
                customerId: 'test-customer-id',
                userType: 'registered',
            };

            const mockBasket = {
                basketId: 'test-basket-id',
                shipments: [{ shipmentId: 'shipment-1', shippingAddress: { address1: '123 Main St' } }],
            };

            const mockCustomer = {
                customerId: 'test-customer-id',
                addresses: [],
                paymentInstruments: [],
            };

            const mockShippingMethods = {
                'shipment-1': {
                    applicableShippingMethods: [{ id: 'standard', name: 'Standard' }],
                },
            };

            const mockCustomerClient = {
                getCustomer: vi.fn().mockResolvedValue({ data: mockCustomer }),
            };

            const mockClients = {
                shopperCustomers: mockCustomerClient,
            };

            vi.mocked(createApiClients).mockReturnValue(mockClients as any);
            vi.mocked(getBasket).mockResolvedValue({ current: mockBasket, snapshot: null } as any);
            vi.mocked(fetchShippingMethodsMapForBasket).mockResolvedValue(mockShippingMethods as any);

            const result = await getServerCheckoutData(
                {
                    context: mockContext,
                } as any,
                mockAuthSession
            );

            expect(result).toEqual({
                basket: mockBasket,
                customerProfile: expect.any(Promise),
                shippingMethodsMap: expect.any(Promise),
                isRegisteredCustomer: true,
            });
        });

        it('should handle null authSession', async () => {
            const mockAuthSession = null as any;

            const result = await getServerCheckoutData(
                {
                    context: mockContext,
                } as any,
                mockAuthSession
            );

            expect(result).toEqual({
                basket: null,
                customerProfile: expect.any(Promise),
                shippingMethodsMap: expect.any(Promise),
                isRegisteredCustomer: false,
            });
        });

        it('should handle guest user', async () => {
            const { getBasket } = await import('@/middlewares/basket.server');
            const { fetchShippingMethodsMapForBasket } = await import('@/lib/checkout/loaders.server');

            const mockAuthSession: SessionData = {
                accessToken: 'test-token',
                customerId: 'guest-customer-id',
                userType: 'guest',
            };

            const mockBasket = {
                basketId: 'guest-basket-id',
                shipments: [{ shipmentId: 'shipment-1', shippingAddress: { address1: '789 Elm St' } }],
            };

            vi.mocked(getBasket).mockResolvedValue({ current: mockBasket, snapshot: null } as any);
            vi.mocked(fetchShippingMethodsMapForBasket).mockResolvedValue({} as any);

            const result = await getServerCheckoutData(
                {
                    context: mockContext,
                } as any,
                mockAuthSession
            );

            expect(result.isRegisteredCustomer).toBe(false);
            expect(result.basket).toBe(mockBasket);
            expect(result.customerProfile).toBeInstanceOf(Promise);

            // Guest users should get null customer profile
            const customerProfile = await result.customerProfile;
            expect(customerProfile).toBeNull();
        });
    });
});
