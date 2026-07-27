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
import type { ShopperBasketsV2 } from '@/scapi';
import {
    computeStepFromBasket,
    shouldAutoAdvanceForReturningCustomer,
    computeFinalStepForReturningCustomer,
} from './checkout-utils';
import { CHECKOUT_STEPS } from './checkout-context-types';

// Mock shipment distribution for tests (default: no pickup items)
const mockShipmentDistribution = {
    hasPickupItems: false,
    hasDeliveryItems: true,
    enableMultiAddress: false,
    hasMultipleDeliveryAddresses: false,
    hasUnaddressedDeliveryItems: false,
    needsShippingMethods: false,
    hasEmptyShipments: false,
    isDeliveryProductItem: () => false as const,
    deliveryShipments: [] as ShopperBasketsV2.schemas['Shipment'][],
};

// Mock basket data for testing
const mockBasketWithAllInfo = {
    customerInfo: {
        email: 'test@example.com',
    },
    billingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'Anytown',
        stateCode: 'CA',
        postalCode: '12345',
        countryCode: 'US',
    },
    shipments: [
        {
            shipmentId: 'me',
            shippingAddress: {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Anytown',
                stateCode: 'CA',
                postalCode: '12345',
                countryCode: 'US',
            },
            shippingMethod: {
                id: 'standard',
                name: 'Standard Shipping',
            },
        },
    ],
    paymentInstruments: [
        {
            paymentMethodId: 'CREDIT_CARD',
            paymentCard: {
                cardType: 'Visa',
                maskedNumber: '************1234',
                expirationMonth: 12,
                expirationYear: 2025,
            },
        },
    ],
};

const mockCustomerProfile = {
    customer: {
        login: 'test@example.com', // SFCC uses 'login' for email
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
    },
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
            },
        },
    ],
};

const mockBasketWithoutShippingAddress = {
    customerInfo: {
        email: 'test@example.com',
    },
    shipments: [
        {
            shipmentId: 'me',
            shippingAddress: undefined,
        },
    ],
    paymentInstruments: [],
};

describe('Checkout Context Functions', () => {
    describe('computeStepFromBasket', () => {
        it('should return CONTACT_INFO when no customer info', () => {
            const basket = {};
            const result = computeStepFromBasket(basket, mockShipmentDistribution);
            expect(result).toBe(CHECKOUT_STEPS.CONTACT_INFO);
        });

        it('should return SHIPPING_ADDRESS when customer info exists but no shipping address', () => {
            const basket = {
                customerInfo: { email: 'test@example.com' },
            };
            const distributionWithUnaddressedItems = {
                ...mockShipmentDistribution,
                hasUnaddressedDeliveryItems: true,
                needsShippingMethods: false,
            };
            const result = computeStepFromBasket(basket, distributionWithUnaddressedItems);
            expect(result).toBe(CHECKOUT_STEPS.SHIPPING_ADDRESS);
        });

        it('should return SHIPPING_OPTIONS when shipping address exists but no shipping method', () => {
            const basket = {
                customerInfo: { email: 'test@example.com' },
                shipments: [
                    {
                        shipmentId: 'me',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                        },
                    },
                ],
            };
            const distributionNeedingMethods = {
                ...mockShipmentDistribution,
                hasUnaddressedDeliveryItems: false,
                needsShippingMethods: true,
            };
            const result = computeStepFromBasket(basket, distributionNeedingMethods);
            expect(result).toBe(CHECKOUT_STEPS.SHIPPING_OPTIONS);
        });

        it('should return PAYMENT when shipping method exists but no payment', () => {
            const basket = {
                customerInfo: { email: 'test@example.com' },
                shipments: [
                    {
                        shipmentId: 'me',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                        },
                        shippingMethod: { id: 'standard' },
                    },
                ],
            };
            const result = computeStepFromBasket(basket, mockShipmentDistribution);
            expect(result).toBe(CHECKOUT_STEPS.PAYMENT);
        });

        it('should return REVIEW when all info is complete', () => {
            const result = computeStepFromBasket(mockBasketWithAllInfo, mockShipmentDistribution);
            expect(result).toBe(CHECKOUT_STEPS.PLACE_ORDER);
        });

        it('should skip user shipping options check in auto-advance mode', () => {
            const basket = {
                customerInfo: { email: 'test@example.com' },
                shipments: [
                    {
                        shipmentId: 'me',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                        },
                        shippingMethod: { id: 'standard' },
                    },
                ],
            };
            // Without auto-advance, would require userCompletedShippingOptions = true
            const result = computeStepFromBasket(basket, mockShipmentDistribution);
            expect(result).toBe(CHECKOUT_STEPS.PAYMENT);
        });
    });

    describe('shouldAutoAdvanceForReturningCustomer', () => {
        it('should return true for registered customer with profile', () => {
            const result = shouldAutoAdvanceForReturningCustomer(true, mockCustomerProfile);
            expect(result).toBe(true);
        });

        it('should return false for guest customer', () => {
            const result = shouldAutoAdvanceForReturningCustomer(false, mockCustomerProfile);
            expect(result).toBe(false);
        });

        it('should return false for registered customer without profile', () => {
            const result = shouldAutoAdvanceForReturningCustomer(true, undefined);
            expect(result).toBe(false);
        });

        it('should return false when customer profile lacks required data', () => {
            const incompleteProfile = {
                email: 'test@example.com',
                addresses: [], // No addresses
                paymentInstruments: [], // No payment methods
            };
            const result = shouldAutoAdvanceForReturningCustomer(true, incompleteProfile);
            expect(result).toBe(false);
        });
    });

    describe('computeFinalStepForReturningCustomer', () => {
        it('should return REVIEW when all profile data is complete', () => {
            // With complete customer profile (email, addresses, payment methods)
            const result = computeFinalStepForReturningCustomer(
                mockBasketWithAllInfo,
                mockCustomerProfile,
                mockShipmentDistribution
            );
            expect(result).toBe(CHECKOUT_STEPS.PLACE_ORDER);
        });

        it('should return PAYMENT when payment info is missing from profile', () => {
            // Customer profile has email and addresses but no saved payment methods
            const profileWithoutPayment = {
                ...mockCustomerProfile,
                paymentInstruments: [],
            };
            // Basket without payment instrument - should go to PAYMENT step
            const basketWithoutPayment = {
                ...mockBasketWithAllInfo,
                paymentInstruments: [],
            };
            const result = computeFinalStepForReturningCustomer(
                basketWithoutPayment,
                profileWithoutPayment,
                mockShipmentDistribution
            );
            expect(result).toBe(CHECKOUT_STEPS.PAYMENT);
        });

        it('should return SHIPPING_ADDRESS when addresses are missing from profile and basket needs address', () => {
            // Customer profile has email but no saved addresses
            const profileWithoutAddresses = {
                ...mockCustomerProfile,
                addresses: [],
            };
            const distributionWithUnaddressedItems = {
                ...mockShipmentDistribution,
                hasUnaddressedDeliveryItems: true,
            };
            // Note: Basket state doesn't matter, only profile matters for returning customers
            const result = computeFinalStepForReturningCustomer(
                mockBasketWithoutShippingAddress,
                profileWithoutAddresses,
                distributionWithUnaddressedItems
            );
            expect(result).toBe(CHECKOUT_STEPS.SHIPPING_ADDRESS);
        });

        it('should return null when profile is missing addresses but basket already has one', () => {
            // Customer profile has no addresses
            const profileWithoutAddress = {
                ...mockCustomerProfile,
                addresses: [],
            };
            const result = computeFinalStepForReturningCustomer(
                mockBasketWithAllInfo,
                profileWithoutAddress,
                mockShipmentDistribution
            );
            expect(result).toBeNull();
        });

        it('should return CONTACT_INFO when customer email is missing from profile', () => {
            // Customer profile has no email (shouldn't happen for registered users, but edge case)
            const profileWithoutEmail = {
                ...mockCustomerProfile,
                customer: {},
            };
            const result = computeFinalStepForReturningCustomer(
                mockBasketWithAllInfo,
                profileWithoutEmail,
                mockShipmentDistribution
            );
            expect(result).toBe(CHECKOUT_STEPS.CONTACT_INFO);
        });

        it('should return SHIPPING_ADDRESS for customer profile with minimal data when basket lacks address', () => {
            // Customer has email but no addresses or payment instruments
            const minimalProfile = {
                customer: { login: 'test@example.com' },
                addresses: [],
                paymentInstruments: [],
            };
            const distributionWithUnaddressedItems = {
                ...mockShipmentDistribution,
                hasUnaddressedDeliveryItems: true,
            };
            // Should go to SHIPPING_ADDRESS because profile has no addresses
            const result = computeFinalStepForReturningCustomer(
                mockBasketWithoutShippingAddress,
                minimalProfile,
                distributionWithUnaddressedItems
            );
            expect(result).toBe(CHECKOUT_STEPS.SHIPPING_ADDRESS);
        });
    });
});
