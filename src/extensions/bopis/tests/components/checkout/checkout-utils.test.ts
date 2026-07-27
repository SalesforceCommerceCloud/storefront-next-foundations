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
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CHECKOUT_STEPS } from '@/components/checkout/utils/checkout-context-types';
import { computeStepFromBasket, getCompletedSteps } from '@/components/checkout/utils/checkout-utils';
import { createMockBasketWithPickupItems } from '@/extensions/bopis/tests/__mocks__/basket';
import { isStorePickup } from '@/extensions/bopis/lib/basket-utils';
import type { ShopperCustomers } from '@/scapi';

// Mock the BOPIS functions
vi.mock('@/extensions/bopis/lib/basket-utils', () => ({
    isStorePickup: vi.fn(),
}));

const mockGetPickupShipmentDistribution = vi.fn(() => ({
    hasPickupItems: false,
    hasDeliveryItems: true,
    enableMultiAddress: false,
    hasMultipleDeliveryAddresses: false,
    hasUnaddressedDeliveryItems: false,
    needsShippingMethods: false,
    hasEmptyShipments: false,
    isDeliveryProductItem: () => false as const,
    deliveryShipments: [],
}));
vi.mock('@/extensions/bopis/lib/checkout-distribution', () => ({
    getPickupShipmentDistribution: () => mockGetPickupShipmentDistribution(),
}));

describe('Checkout Utils - BOPIS/Store Pickup Scenarios', () => {
    const mockedIsStorePickup = vi.mocked(isStorePickup);

    beforeEach(() => {
        vi.clearAllMocks();
        mockedIsStorePickup.mockReturnValue(false); // Default to non-pickup
        mockGetPickupShipmentDistribution.mockReturnValue({
            hasPickupItems: false,
            hasDeliveryItems: true,
            enableMultiAddress: false,
            hasMultipleDeliveryAddresses: false,
            hasUnaddressedDeliveryItems: false,
            needsShippingMethods: false,
            hasEmptyShipments: false,
            isDeliveryProductItem: () => false as const,
            deliveryShipments: [],
        });
    });

    describe('computeStepFromBasket - Store Pickup', () => {
        test('goes to PAYMENT step for store pickup orders with email but no payment', () => {
            const basketWithPickup = createMockBasketWithPickupItems(
                [{ productId: 'product-1', inventoryId: 'store-inv-1', storeId: 'store-1' }],
                {
                    customerInfo: { email: 'test@example.com' },
                }
            );

            mockedIsStorePickup.mockReturnValue(true);
            const pickupDistribution = {
                hasPickupItems: true,
                hasDeliveryItems: false,
                enableMultiAddress: false,
                hasMultipleDeliveryAddresses: false,
                hasUnaddressedDeliveryItems: false,
                needsShippingMethods: false,
                hasEmptyShipments: false,
                isDeliveryProductItem: () => false as const,
                deliveryShipments: [],
            };
            mockGetPickupShipmentDistribution.mockReturnValue(pickupDistribution);

            const result = computeStepFromBasket(basketWithPickup, pickupDistribution);
            expect(result).toBe(CHECKOUT_STEPS.PAYMENT);
        });

        test('goes to PLACE_ORDER when store pickup has email and payment', () => {
            const basketWithPickup = createMockBasketWithPickupItems(
                [{ productId: 'product-1', inventoryId: 'store-inv-1', storeId: 'store-1' }],
                {
                    customerInfo: { email: 'customer@example.com' },
                    paymentInstruments: [
                        {
                            paymentMethodId: 'CREDIT_CARD',
                            paymentCard: {
                                cardType: 'Visa',
                                expirationMonth: 12,
                                expirationYear: 2025,
                                maskedNumber: '************1234',
                            },
                        },
                    ],
                }
            );

            mockedIsStorePickup.mockReturnValue(true);
            const pickupDistribution = {
                hasPickupItems: true,
                hasDeliveryItems: false,
                enableMultiAddress: false,
                hasMultipleDeliveryAddresses: false,
                hasUnaddressedDeliveryItems: false,
                needsShippingMethods: false,
                hasEmptyShipments: false,
                isDeliveryProductItem: () => false as const,
                deliveryShipments: [],
            };
            mockGetPickupShipmentDistribution.mockReturnValue(pickupDistribution);

            const result = computeStepFromBasket(basketWithPickup, pickupDistribution);
            expect(result).toBe(CHECKOUT_STEPS.PLACE_ORDER);
        });

        test('still requires contact info for store pickup without email', () => {
            const basketWithPickup = createMockBasketWithPickupItems(
                [{ productId: 'product-1', inventoryId: 'store-inv-1', storeId: 'store-1' }],
                {
                    customerInfo: {} as ShopperCustomers.schemas['CustomerInfo'], // No email
                }
            );

            mockedIsStorePickup.mockReturnValue(true);
            const pickupDistribution = {
                hasPickupItems: true,
                hasDeliveryItems: false,
                enableMultiAddress: false,
                hasMultipleDeliveryAddresses: false,
                hasUnaddressedDeliveryItems: false,
                needsShippingMethods: false,
                hasEmptyShipments: false,
                isDeliveryProductItem: () => false as const,
                deliveryShipments: [],
            };

            const result = computeStepFromBasket(basketWithPickup, pickupDistribution);
            expect(result).toBe(CHECKOUT_STEPS.CONTACT_INFO);
        });
    });

    describe('getCompletedSteps - Store Pickup', () => {
        test('excludes shipping address and method from completed steps for store pickup', () => {
            const basketWithPickup = createMockBasketWithPickupItems(
                [{ productId: 'product-1', inventoryId: 'store-inv-1', storeId: 'store-1' }],
                {
                    customerInfo: { email: 'test@example.com' },
                }
            );

            // Even though the basket has a shipping address (store address),
            // it shouldn't be considered a completed step for store pickup
            mockedIsStorePickup.mockReturnValue(true);
            const pickupDistribution = {
                hasPickupItems: true,
                hasDeliveryItems: false,
                enableMultiAddress: false,
                hasMultipleDeliveryAddresses: false,
                hasUnaddressedDeliveryItems: false,
                needsShippingMethods: false,
                hasEmptyShipments: false,
                isDeliveryProductItem: () => false as const,
                deliveryShipments: [],
            };

            const result = getCompletedSteps(basketWithPickup, pickupDistribution, CHECKOUT_STEPS.PAYMENT);
            expect(result).toContain(CHECKOUT_STEPS.CONTACT_INFO);
            expect(result).not.toContain(CHECKOUT_STEPS.SHIPPING_ADDRESS);
            expect(result).not.toContain(CHECKOUT_STEPS.SHIPPING_OPTIONS);
        });
    });
});
