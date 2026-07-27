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
import { customerLookup, getCustomerProfileForCheckout } from './customer.server';
import { getAuth } from '@/middlewares/auth.server';
import { createApiClients } from '@/lib/api-clients.server';
import { createTestContext } from '@/lib/test-utils';

// Define proper types for the mock client
interface MockShopperCustomersClient {
    getCustomer: ReturnType<typeof vi.fn>;
}

// Mock the Commerce Cloud client
const mockClient: MockShopperCustomersClient = {
    getCustomer: vi.fn(),
};

// Mock the dependencies
vi.mock('@/middlewares/auth.server');
vi.mock('@/lib/api-clients.server');

const mockContext = createTestContext();

describe('Customer Lookup Functions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('customerLookup', () => {
        beforeEach(() => {
            // Set up mocks for each test
            vi.mocked(createApiClients).mockReturnValue({
                shopperCustomers: mockClient,
            } as any);
        });

        it('should return guest for unregistered email', async () => {
            vi.mocked(getAuth).mockReturnValue({ userType: 'guest' });
            mockClient.getCustomer.mockRejectedValue(new Error('Customer not found'));

            const result = await customerLookup(mockContext, 'newuser@example.com');

            expect(result).toEqual({
                isRegistered: false,
                recommendation: 'guest',
                message: 'Continuing as guest. You can log in later if you have an account.',
                error: undefined,
                requiresLogin: false,
            });
        });

        it('should return current_user for matching registered customer', async () => {
            const mockCustomer = {
                customerId: 'customer123',
                login: 'existing@example.com',
                firstName: 'John',
                lastName: 'Doe',
            };
            vi.mocked(getAuth).mockReturnValue({
                userType: 'registered',
                customerId: 'customer123',
                accessToken: 'token123',
                accessTokenExpiry: Date.now() + 3600000,
            });
            mockClient.getCustomer.mockResolvedValue({ data: mockCustomer });

            const result = await customerLookup(mockContext, 'existing@example.com');

            expect(result).toEqual({
                isRegistered: true,
                customer: mockCustomer,
                requiresLogin: false,
                recommendation: 'current_user',
                message: 'Using your account information',
            });
        });

        it('should handle API errors gracefully', async () => {
            vi.mocked(getAuth).mockReturnValue({ userType: 'guest' });
            mockClient.getCustomer.mockRejectedValue(new Error('Network error'));

            const result = await customerLookup(mockContext, 'test@example.com');

            expect(result).toEqual({
                isRegistered: false,
                recommendation: 'guest',
                message: 'Continuing as guest. You can log in later if you have an account.',
                error: undefined,
                requiresLogin: false,
            });
        });

        it('should handle invalid email format', async () => {
            const result = await customerLookup(mockContext, 'invalid-email');

            expect(result).toEqual({
                isRegistered: false,
                error: 'Invalid email format',
                recommendation: 'guest',
                message: 'Continuing as guest. You can log in later if you have an account.',
            });
        });

        it('should handle registered user with non-matching email', async () => {
            const mockCustomer = {
                customerId: 'customer123',
                login: 'different@example.com',
            };
            vi.mocked(getAuth).mockReturnValue({
                userType: 'registered',
                customerId: 'customer123',
                accessToken: 'token123',
                accessTokenExpiry: Date.now() + 3600000,
            });
            mockClient.getCustomer.mockResolvedValue({ data: mockCustomer });

            const result = await customerLookup(mockContext, 'test@example.com');

            expect(result).toEqual({
                isRegistered: false,
                requiresLogin: false,
                recommendation: 'guest',
                message: 'Continuing as guest. You can log in later if you have an account.',
            });
        });
    });

    describe('getCustomerProfileForCheckout', () => {
        beforeEach(() => {
            // Set up mocks for each test
            vi.mocked(createApiClients).mockReturnValue({
                shopperCustomers: mockClient,
            } as any);
        });

        it('should return customer profile with addresses and payment instruments', async () => {
            const mockCustomer = {
                customerId: 'customer123',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                phoneHome: '555-1234',
                addresses: [
                    {
                        addressId: 'billing_addr_1',
                        firstName: 'John',
                        lastName: 'Doe',
                        address1: '123 Main St',
                        city: 'Anytown',
                        stateCode: 'CA',
                        postalCode: '12345',
                        countryCode: 'US',
                        phone: '555-1234',
                        preferred: true,
                    },
                ],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card_123',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            expirationMonth: 12,
                            expirationYear: 2025,
                            maskedNumber: '************1234',
                        },
                    },
                ],
            };

            vi.mocked(getAuth).mockReturnValue({ customerId: 'customer123', accessToken: 'token123' });
            mockClient.getCustomer.mockResolvedValue({ data: mockCustomer });

            const result = await getCustomerProfileForCheckout(mockContext, 'customer123');
            if (!result) {
                throw new Error('Expected customer profile');
            }

            // The function now returns a structured object with customer data
            expect(result).toEqual({
                customer: mockCustomer,
                addresses: mockCustomer.addresses,
                paymentInstruments: mockCustomer.paymentInstruments,
                preferredBillingAddress: mockCustomer.addresses[0], // First address as preferred
                preferredShippingAddress: mockCustomer.addresses[0], // First address as preferred
            });
            expect(mockClient.getCustomer).toHaveBeenCalledWith({
                params: {
                    path: {
                        customerId: 'customer123',
                    },
                    query: {
                        expand: ['addresses', 'paymentinstruments'],
                    },
                },
            });
        });

        it('should throw error when customer not found', async () => {
            vi.mocked(getAuth).mockReturnValue({ customerId: 'invalid_id', accessToken: 'token123' });
            mockClient.getCustomer.mockRejectedValue(new Error('Customer not found'));

            await expect(getCustomerProfileForCheckout(mockContext, 'invalid_id')).rejects.toThrow(
                'Customer not found'
            );
        });

        it('should handle customer with empty addresses and payment instruments', async () => {
            const mockCustomer = {
                customerId: 'customer456',
                email: 'simple@example.com',
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'dummy',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {},
                    },
                ],
            };

            vi.mocked(getAuth).mockReturnValue({ customerId: 'customer456', accessToken: 'token456' });
            mockClient.getCustomer.mockResolvedValue({ data: mockCustomer });

            const result = await getCustomerProfileForCheckout(mockContext, 'customer456');
            if (!result) {
                throw new Error('Expected customer profile');
            }

            expect(result).toEqual({
                customer: mockCustomer,
                addresses: mockCustomer.addresses,
                paymentInstruments: mockCustomer.paymentInstruments,
                preferredBillingAddress: undefined,
                preferredShippingAddress: undefined,
            });
            expect(result.addresses).toEqual([]);
            expect(result.paymentInstruments).toHaveLength(1);
        });

        it('should handle customer with only addresses', async () => {
            const mockCustomer = {
                customerId: 'customer789',
                email: 'address-only@example.com',
                addresses: [
                    {
                        addressId: 'addr_1',
                        firstName: 'Jane',
                        lastName: 'Smith',
                        address1: '456 Oak St',
                        city: 'Springfield',
                        stateCode: 'IL',
                        postalCode: '62701',
                        countryCode: 'US',
                    },
                ],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'dummy',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {},
                    },
                ],
            };

            vi.mocked(getAuth).mockReturnValue({ customerId: 'customer789', accessToken: 'token789' });
            mockClient.getCustomer.mockResolvedValue({ data: mockCustomer });

            const result = await getCustomerProfileForCheckout(mockContext, 'customer789');
            if (!result) {
                throw new Error('Expected customer profile');
            }

            expect(result).toEqual({
                customer: mockCustomer,
                addresses: mockCustomer.addresses,
                paymentInstruments: mockCustomer.paymentInstruments,
                preferredBillingAddress: mockCustomer.addresses[0], // First address as preferred
                preferredShippingAddress: mockCustomer.addresses[0], // First address as preferred
            });
            expect(result.addresses).toHaveLength(1);
            expect(result.paymentInstruments).toHaveLength(1);
        });

        it('should handle customer with only payment instruments', async () => {
            const mockCustomer = {
                customerId: 'customer999',
                email: 'payment-only@example.com',
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card_999',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Mastercard',
                            expirationMonth: 6,
                            expirationYear: 2026,
                        },
                    },
                ],
            };

            vi.mocked(getAuth).mockReturnValue({ customerId: 'customer999', accessToken: 'token999' });
            mockClient.getCustomer.mockResolvedValue({ data: mockCustomer });

            const result = await getCustomerProfileForCheckout(mockContext, 'customer999');
            if (!result) {
                throw new Error('Expected customer profile');
            }

            expect(result).toEqual({
                customer: mockCustomer,
                addresses: mockCustomer.addresses,
                paymentInstruments: mockCustomer.paymentInstruments,
                preferredBillingAddress: undefined,
                preferredShippingAddress: undefined,
            });
            expect(result.addresses).toEqual([]);
            expect(result.paymentInstruments).toHaveLength(1);
        });
    });
});
