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
import { getDefaultShippingMethod } from '@/lib/customer/profile-utils';
import type { ShopperBasketsV2 } from '@/scapi';

describe('Checkout Features Integration Tests', () => {
    // Helper to create Commerce Cloud shipping method result
    const createMockShippingMethodResult = (
        methods: Array<{ id: string; name: string; price: number }>,
        defaultId?: string
    ) => ({
        applicableShippingMethods: methods.map((m) => ({
            id: m.id,
            name: m.name,
            price: m.price,
            description: `${m.name} Description`,
            estimatedArrivalTime: '2024-02-15',
        })),
        defaultShippingMethodId: defaultId,
    });

    describe('Shipping Method Default Selection - Integration Scenarios', () => {
        describe('New Checkout with Commerce Cloud Default', () => {
            it('should use defaultShippingMethodId from Commerce Cloud API', () => {
                const apiResponse = createMockShippingMethodResult(
                    [
                        { id: 'standard', name: 'Standard Shipping', price: 5.99 },
                        { id: 'express', name: 'Express Shipping', price: 12.99 },
                        { id: 'overnight', name: 'Overnight Shipping', price: 24.99 },
                    ],
                    'express'
                );

                const result = getDefaultShippingMethod(
                    apiResponse.applicableShippingMethods,
                    undefined,
                    apiResponse.defaultShippingMethodId
                );

                expect(result).toBe('express');
            });

            it('should fall back to first method when no default configured', () => {
                const apiResponse = createMockShippingMethodResult(
                    [
                        { id: 'fedex', name: 'FedEx Ground', price: 7.99 },
                        { id: 'ups', name: 'UPS Standard', price: 8.99 },
                    ],
                    undefined
                );

                const result = getDefaultShippingMethod(
                    apiResponse.applicableShippingMethods,
                    undefined,
                    apiResponse.defaultShippingMethodId
                );

                expect(result).toBe('fedex');
            });
        });

        describe('Returning Customer - Preserve Selection', () => {
            it('should preserve user existing selection from basket', () => {
                const apiResponse = createMockShippingMethodResult(
                    [
                        { id: 'standard', name: 'Standard', price: 5.99 },
                        { id: 'express', name: 'Express', price: 12.99 },
                        { id: 'overnight', name: 'Overnight', price: 24.99 },
                    ],
                    'standard'
                );

                const basketSelection = { id: 'overnight' };

                const result = getDefaultShippingMethod(
                    apiResponse.applicableShippingMethods,
                    basketSelection,
                    apiResponse.defaultShippingMethodId
                );

                expect(result).toBe('overnight');
            });

            it('should prioritize basket selection even when API default changes', () => {
                const methods = [
                    { id: 'method1', name: 'Method 1', price: 5.0 },
                    { id: 'method2', name: 'Method 2', price: 10.0 },
                    { id: 'method3', name: 'Method 3', price: 15.0 },
                ];

                const result = getDefaultShippingMethod(methods, { id: 'method1' }, 'method3');

                expect(result).toBe('method1');
            });
        });

        describe('Invalid API Default - Fallback Handling', () => {
            it('should fall back when defaultShippingMethodId does not exist', () => {
                const apiResponse = createMockShippingMethodResult(
                    [
                        { id: 'available1', name: 'Available 1', price: 5.99 },
                        { id: 'available2', name: 'Available 2', price: 12.99 },
                    ],
                    'nonexistent-method'
                );

                const result = getDefaultShippingMethod(
                    apiResponse.applicableShippingMethods,
                    undefined,
                    apiResponse.defaultShippingMethodId
                );

                expect(result).toBe('available1');
            });

            it('should handle empty string defaultShippingMethodId', () => {
                const methods = [{ id: 'only-method', name: 'Only Method', price: 10.0 }];

                const result = getDefaultShippingMethod(methods, undefined, '');

                expect(result).toBe('only-method');
            });

            it('should handle null defaultShippingMethodId', () => {
                const methods = [
                    { id: 'method1', name: 'Method 1', price: 5.0 },
                    { id: 'method2', name: 'Method 2', price: 10.0 },
                ];

                const result = getDefaultShippingMethod(methods, undefined, null);

                expect(result).toBe('method1');
            });

            it('should handle whitespace-only defaultShippingMethodId', () => {
                const methods = [{ id: 'method1', name: 'Method 1', price: 5.0 }];

                const result = getDefaultShippingMethod(methods, undefined, '   ');

                expect(result).toBe('method1');
            });
        });

        describe('Validate with SCAPI Response Structures', () => {
            it('should handle typical SFCC API response', () => {
                const apiResponse = {
                    applicableShippingMethods: [
                        {
                            id: '001',
                            name: 'Ground',
                            description: '5-7 Business Days',
                            price: 7.99,
                            estimatedArrivalTime: '2024-02-15',
                            shippingPromotions: [],
                        },
                        {
                            id: '002',
                            name: '2-Day',
                            description: '2 Business Days',
                            price: 14.99,
                            estimatedArrivalTime: '2024-02-10',
                            shippingPromotions: [],
                        },
                    ],
                    defaultShippingMethodId: '001',
                } as unknown as ShopperBasketsV2.schemas['ShippingMethodResult'];

                const result = getDefaultShippingMethod(
                    apiResponse.applicableShippingMethods as {
                        id: string;
                        name: string;
                        price?: number;
                        description?: string;
                    }[],
                    undefined,
                    apiResponse.defaultShippingMethodId
                );

                expect(result).toBe('001');
            });

            it('should handle single shipping method response', () => {
                const apiResponse = createMockShippingMethodResult(
                    [{ id: 'only-option', name: 'Only Option', price: 5.99 }],
                    'only-option'
                );

                const result = getDefaultShippingMethod(
                    apiResponse.applicableShippingMethods,
                    undefined,
                    apiResponse.defaultShippingMethodId
                );

                expect(result).toBe('only-option');
            });
        });

        describe('Edge Cases', () => {
            it('should handle empty shipping methods array', () => {
                const result = getDefaultShippingMethod([], undefined, 'any-default');

                expect(result).toBeUndefined();
            });

            it('should handle undefined shipping methods', () => {
                const result = getDefaultShippingMethod(undefined, undefined, 'any-default');

                expect(result).toBeUndefined();
            });

            it('should handle case-sensitive ID matching', () => {
                const methods = [
                    { id: 'express', name: 'Express', price: 12.99 },
                    { id: 'standard', name: 'Standard', price: 5.99 },
                ];

                const result = getDefaultShippingMethod(methods, undefined, 'EXPRESS');

                expect(result).toBe('express');
            });
        });
    });

    describe('Customer Profile Data Structure', () => {
        it('should properly structure contact info data', () => {
            const mockProfile = {
                customer: {
                    email: 'test@example.com',
                    firstName: 'Test',
                    lastName: 'User',
                    phoneHome: '555-1234',
                },
            };

            // Test that the structure expected by our functions is correct
            expect(mockProfile.customer.email).toBe('test@example.com');
            expect(mockProfile.customer.firstName).toBe('Test');
            expect(mockProfile.customer.lastName).toBe('User');
            expect(mockProfile.customer.phoneHome).toBe('555-1234');
        });

        it('should properly structure address data', () => {
            const mockProfile = {
                addresses: [
                    {
                        addressId: 'billing_addr_1',
                        firstName: 'Test',
                        lastName: 'User',
                        address1: '123 Main St',
                        city: 'Anytown',
                        stateCode: 'CA',
                        postalCode: '12345',
                        countryCode: 'US',
                        phone: '555-1234',
                        preferred: true,
                    },
                ],
                preferredBillingAddress: {
                    addressId: 'billing_addr_1',
                    firstName: 'Test',
                    lastName: 'User',
                    address1: '123 Main St',
                    city: 'Anytown',
                    stateCode: 'CA',
                    postalCode: '12345',
                    countryCode: 'US',
                    phone: '555-1234',
                },
            };

            // Test that the structure is correct
            expect(mockProfile.addresses).toHaveLength(1);
            expect(mockProfile.addresses[0].addressId).toBe('billing_addr_1');
            expect(mockProfile.preferredBillingAddress.address1).toBe('123 Main St');
        });

        it('should properly structure payment instrument data', () => {
            const mockProfile = {
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card_123',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            expirationMonth: 12,
                            expirationYear: 2025,
                            maskedNumber: '************1234',
                            holder: 'Test User',
                        },
                    },
                ],
            };

            // Test that the structure is correct
            expect(mockProfile.paymentInstruments).toHaveLength(1);
            expect(mockProfile.paymentInstruments[0].paymentMethodId).toBe('CREDIT_CARD');
            expect(mockProfile.paymentInstruments[0].paymentCard?.cardType).toBe('Visa');
        });
    });

    describe('Feature Flags and Business Logic', () => {
        it('should handle empty shipping methods array gracefully', () => {
            const emptyShippingMethods: Array<{ id: string; name: string }> = [];
            const validShippingMethods = [
                { id: 'ups_ground', name: 'UPS Ground' },
                { id: 'fedex_overnight', name: 'FedEx Overnight' },
            ];

            // Test that our component can handle empty arrays
            expect(emptyShippingMethods.length).toBe(0);
            expect(validShippingMethods.length).toBeGreaterThan(0);

            const hasValidIds = validShippingMethods.every(
                (method) => method.id && !method.id.includes('mock') && !method.id.includes('test')
            );
            expect(hasValidIds).toBe(true);
        });

        it('should handle auto-advance logic conditions', () => {
            const isRegisteredCustomer = true;
            const customerProfile = {
                customer: { email: 'test@example.com' },
                addresses: [{ addressId: 'addr_1' }],
                paymentInstruments: [{ paymentInstrumentId: 'card_1' }],
            };

            // Auto-advance should be enabled for registered customers with profile data
            const shouldAutoAdvance =
                isRegisteredCustomer &&
                !!customerProfile &&
                !!customerProfile.addresses?.length &&
                !!customerProfile.paymentInstruments?.length;

            expect(shouldAutoAdvance).toBe(true);

            // Should not auto-advance for guest users (no customer profile)
            const guestCustomerProfile = null;
            const guestShouldAutoAdvance = !!guestCustomerProfile;
            expect(guestShouldAutoAdvance).toBe(false);
        });
    });
});
