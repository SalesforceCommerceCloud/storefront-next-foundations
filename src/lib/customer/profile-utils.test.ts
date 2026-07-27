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
import {
    getContactInfoFromCustomer,
    getShippingAddressFromCustomer,
    getPaymentMethodsFromCustomer,
    getDefaultShippingMethod,
} from './profile-utils';

describe('Checkout Prefill Utilities', () => {
    describe('getContactInfoFromCustomer', () => {
        it('should extract contact info from customer profile', () => {
            const customerProfile = {
                customer: {
                    email: 'john.doe@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    phoneHome: '555-1234',
                },
                addresses: [],
                paymentInstruments: [],
            };

            const result = getContactInfoFromCustomer(customerProfile);

            expect(result).toEqual({
                email: 'john.doe@example.com',
                firstName: 'John',
                lastName: 'Doe',
                phone: '555-1234',
            });
        });

        it('should handle missing optional fields', () => {
            const customerProfile = {
                customer: {
                    email: 'jane@example.com',
                },
                addresses: [],
                paymentInstruments: [],
            };

            const result = getContactInfoFromCustomer(customerProfile);

            expect(result).toEqual({
                email: 'jane@example.com',
                firstName: '',
                lastName: '',
                phone: '',
            });
        });

        it('should return empty object for missing customer', () => {
            const result = getContactInfoFromCustomer(undefined);
            expect(result).toEqual({});
        });

        it('should use customer.email over login for social login users', () => {
            const customerProfile = {
                customer: {
                    login: 'Google-111292267709658666876',
                    email: 'user@example.com',
                    firstName: 'Social',
                    lastName: 'User',
                },
                addresses: [],
                paymentInstruments: [],
            };

            const result = getContactInfoFromCustomer(customerProfile);

            expect(result.email).toBe('user@example.com');
        });

        it('should not use login as email when it is a social provider ID', () => {
            const customerProfile = {
                customer: {
                    login: 'Google-111292267709658666876',
                    firstName: 'Social',
                    lastName: 'User',
                },
                addresses: [],
                paymentInstruments: [],
            };

            const result = getContactInfoFromCustomer(customerProfile);

            expect(result.email).toBe('');
        });

        it('should fall back to login when it looks like an email', () => {
            const customerProfile = {
                customer: {
                    login: 'john@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                },
                addresses: [],
                paymentInstruments: [],
            };

            const result = getContactInfoFromCustomer(customerProfile);

            expect(result.email).toBe('john@example.com');
        });
    });

    describe('getShippingAddressFromCustomer', () => {
        it('should prioritize preferred shipping address', () => {
            const customerProfile = {
                addresses: [
                    {
                        addressId: 'shipping_addr_1',
                        firstName: 'John',
                        lastName: 'Doe',
                        address1: '456 Oak St',
                        city: 'Springfield',
                        stateCode: 'IL',
                        postalCode: '62701',
                        countryCode: 'US',
                        phone: '555-5678',
                    },
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
                preferredShippingAddress: {
                    addressId: 'shipping_addr_1',
                    firstName: 'John',
                    lastName: 'Doe',
                    address1: '456 Oak St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                    phone: '555-5678',
                },
                preferredBillingAddress: {
                    addressId: 'billing_addr_1',
                    firstName: 'John',
                    lastName: 'Doe',
                    address1: '123 Main St',
                    city: 'Anytown',
                    stateCode: 'CA',
                    postalCode: '12345',
                    countryCode: 'US',
                    phone: '555-1234',
                },
                paymentInstruments: [],
            };

            const result = getShippingAddressFromCustomer(customerProfile);

            expect(result).toEqual({
                firstName: 'John',
                lastName: 'Doe',
                address1: '456 Oak St',
                address2: '',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
                phone: '555-5678',
            });
        });

        it('should fall back to billing address when no preferred shipping address', () => {
            const customerProfile = {
                addresses: [
                    {
                        addressId: 'shipping_addr_1',
                        firstName: 'John',
                        lastName: 'Doe',
                        address1: '456 Oak St',
                        city: 'Springfield',
                        stateCode: 'IL',
                        postalCode: '62701',
                        countryCode: 'US',
                        phone: '555-5678',
                    },
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
                // No preferredShippingAddress, only billing
                preferredBillingAddress: {
                    addressId: 'billing_addr_1',
                    firstName: 'John',
                    lastName: 'Doe',
                    address1: '123 Main St',
                    city: 'Anytown',
                    stateCode: 'CA',
                    postalCode: '12345',
                    countryCode: 'US',
                    phone: '555-1234',
                },
                paymentInstruments: [],
            };

            const result = getShippingAddressFromCustomer(customerProfile);

            expect(result).toEqual({
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                address2: '',
                city: 'Anytown',
                stateCode: 'CA',
                postalCode: '12345',
                countryCode: 'US',
                phone: '555-1234',
            });
        });

        it('should fall back to shipping address when no billing', () => {
            const customerProfile = {
                addresses: [
                    {
                        addressId: 'shipping_addr_1',
                        firstName: 'Jane',
                        lastName: 'Smith',
                        address1: '789 Pine Ave',
                        city: 'Portland',
                        stateCode: 'OR',
                        postalCode: '97201',
                        countryCode: 'US',
                        phone: '555-9876',
                        preferred: true,
                    },
                ],
                preferredShippingAddress: {
                    addressId: 'shipping_addr_1',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    address1: '789 Pine Ave',
                    city: 'Portland',
                    stateCode: 'OR',
                    postalCode: '97201',
                    countryCode: 'US',
                    phone: '555-9876',
                },
                paymentInstruments: [],
            };

            const result = getShippingAddressFromCustomer(customerProfile);

            expect(result).toEqual({
                firstName: 'Jane',
                lastName: 'Smith',
                address1: '789 Pine Ave',
                address2: '',
                city: 'Portland',
                stateCode: 'OR',
                postalCode: '97201',
                countryCode: 'US',
                phone: '555-9876',
            });
        });

        it('should return empty object when no addresses', () => {
            const customerProfile = { addresses: [], paymentInstruments: [] };
            const result = getShippingAddressFromCustomer(customerProfile);
            expect(result).toEqual({});
        });
    });

    describe('getPaymentMethodsFromCustomer', () => {
        it('should format payment methods with card type and expiration', () => {
            const customerProfile = {
                addresses: [],
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
                    {
                        paymentInstrumentId: 'card_456',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Mastercard',
                            expirationMonth: 6,
                            expirationYear: 2026,
                            maskedNumber: '************5678',
                        },
                    },
                ],
            };

            const result = getPaymentMethodsFromCustomer(customerProfile);

            expect(result).toEqual([
                {
                    id: 'card_123',
                    type: 'CREDIT_CARD',
                    cardType: 'Visa',
                    maskedNumber: '************1234',
                    expirationMonth: 12,
                    expirationYear: 2025,
                    cardholderName: '',
                    preferred: true,
                },
                {
                    id: 'card_456',
                    type: 'CREDIT_CARD',
                    cardType: 'Mastercard',
                    maskedNumber: '************5678',
                    expirationMonth: 6,
                    expirationYear: 2026,
                    cardholderName: '',
                    preferred: false,
                },
            ]);
        });

        it('should handle missing payment methods', () => {
            const customerProfile = { addresses: [], paymentInstruments: [] };
            const result = getPaymentMethodsFromCustomer(customerProfile);
            expect(result).toEqual([]);
        });

        it('should include all payment methods regardless of type', () => {
            const customerProfile = {
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card_123',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            expirationMonth: 12,
                            expirationYear: 2025,
                        },
                    },
                    {
                        paymentInstrumentId: 'paypal_456',
                        paymentMethodId: 'PAYPAL',
                    },
                ],
            };

            const result = getPaymentMethodsFromCustomer(customerProfile);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('card_123');
            expect(result[1].id).toBe('paypal_456');
        });
    });

    describe('getDefaultShippingMethod', () => {
        const mockShippingMethods = [
            { id: 'standard', name: 'Standard Shipping', price: 5.99 },
            { id: 'express', name: 'Express Shipping', price: 12.99 },
            { id: 'overnight', name: 'Overnight Shipping', price: 24.99 },
        ];

        describe('Priority 1: Current Selection', () => {
            it('should keep current selection if already selected', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, { id: 'express' });

                expect(result).toBe('express');
            });

            it('should prioritize current selection over defaultShippingMethodId', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, { id: 'overnight' }, 'express');

                expect(result).toBe('overnight'); // Current selection takes priority
            });

            it('should handle empty string in current selection', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, { id: '' });

                expect(result).toBe('standard'); // Falls back since empty string is falsy
            });

            it('should handle null current selection', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, null, 'express');

                expect(result).toBe('express'); // Uses defaultShippingMethodId
            });

            it('should handle undefined id in current selection', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, { id: undefined }, 'express');

                expect(result).toBe('express'); // Uses defaultShippingMethodId
            });
        });

        describe('Priority 2: Empty Methods Array', () => {
            it('should return undefined when methods array is empty', () => {
                const result = getDefaultShippingMethod([]);

                expect(result).toBeUndefined();
            });

            it('should return undefined when methods array is undefined', () => {
                const result = getDefaultShippingMethod(undefined);

                expect(result).toBeUndefined();
            });

            it('should return undefined for empty array even with defaultShippingMethodId', () => {
                const result = getDefaultShippingMethod([], undefined, 'express');

                expect(result).toBeUndefined();
            });
        });

        describe('Priority 3: defaultShippingMethodId from API', () => {
            it('should use defaultShippingMethodId from Commerce Cloud API', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, undefined, 'express');

                expect(result).toBe('express'); // API's default
            });

            it('should validate defaultShippingMethodId exists in available methods', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, undefined, 'nonexistent');

                expect(result).toBe('standard'); // Falls back to first method when invalid
            });

            it('should handle empty string defaultShippingMethodId', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, undefined, '');

                expect(result).toBe('standard'); // Falls back to first method
            });

            it('should handle whitespace-only defaultShippingMethodId', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, undefined, '   ');

                expect(result).toBe('standard'); // Falls back to first method
            });

            it('should handle null defaultShippingMethodId', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, undefined, null);

                expect(result).toBe('standard'); // Falls back to first method
            });

            it('should be case-sensitive when matching defaultShippingMethodId', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, undefined, 'EXPRESS');

                expect(result).toBe('standard'); // Falls back since 'EXPRESS' !== 'express'
            });

            it('should use defaultShippingMethodId for last method in array', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, undefined, 'overnight');

                expect(result).toBe('overnight'); // Works for any valid ID
            });
        });

        describe('Priority 4: First Method Fallback', () => {
            it('should fall back to first method when no defaultShippingMethodId provided', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, undefined, undefined);

                expect(result).toBe('standard');
            });

            it('should use first method when defaultShippingMethodId is invalid', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, undefined, 'invalid-id');

                expect(result).toBe('standard');
            });

            it('should handle array with single method', () => {
                const singleMethod = [{ id: 'only-one', name: 'Only Method', price: 9.99 }];
                const result = getDefaultShippingMethod(singleMethod);

                expect(result).toBe('only-one');
            });

            it('should return undefined for empty array even with fallback logic', () => {
                const result = getDefaultShippingMethod([]);

                expect(result).toBeUndefined();
            });
        });

        describe('Real-World Scenarios', () => {
            it('should handle new customer checkout (no selection, with API default)', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, undefined, 'express');

                expect(result).toBe('express'); // Uses merchant's configured default
            });

            it('should handle returning customer with previous selection', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, { id: 'overnight' }, 'standard');

                expect(result).toBe('overnight'); // Keeps customer's previous choice
            });

            it('should handle guest checkout (no selection, no API default)', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, undefined, undefined);

                expect(result).toBe('standard'); // Uses first method
            });

            it('should handle navigation back to shipping options', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, { id: 'express' }, 'standard');

                expect(result).toBe('express'); // Preserves selection during navigation
            });

            it('should handle merchant changing default while user is in checkout', () => {
                // User selected express, merchant changes default to overnight
                const result = getDefaultShippingMethod(mockShippingMethods, { id: 'express' }, 'overnight');

                expect(result).toBe('express'); // User's choice takes precedence
            });

            it('should handle Commerce Cloud API returning no default', () => {
                const result = getDefaultShippingMethod(mockShippingMethods, undefined, null);

                expect(result).toBe('standard'); // Falls back to first method
            });
        });

        describe('Edge Cases', () => {
            it('should handle methods with minimal data', () => {
                const minimalMethods = [
                    { id: 'method1', name: 'Method 1' },
                    { id: 'method2', name: 'Method 2' },
                ];
                const result = getDefaultShippingMethod(minimalMethods, undefined, 'method2');

                expect(result).toBe('method2');
            });

            it('should handle methods with special characters in ID', () => {
                const specialMethods = [
                    { id: 'ups-ground_2024', name: 'UPS Ground', price: 5.99 },
                    { id: 'fedex.overnight', name: 'FedEx Overnight', price: 25.99 },
                ];
                const result = getDefaultShippingMethod(specialMethods, undefined, 'fedex.overnight');

                expect(result).toBe('fedex.overnight');
            });

            it('should handle undefined for all parameters', () => {
                const result = getDefaultShippingMethod(undefined, undefined, undefined);

                expect(result).toBeUndefined();
            });

            it('should handle null for all parameters', () => {
                const result = getDefaultShippingMethod(undefined, null, null);

                expect(result).toBeUndefined();
            });
        });
    });
});
