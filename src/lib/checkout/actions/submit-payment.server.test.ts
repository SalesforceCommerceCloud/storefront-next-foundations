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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouterContextProvider } from 'react-router';

import { action } from './submit-payment.server';
import { getBasket } from '@/middlewares/basket.server';
import {
    addPaymentInstrumentToBasket,
    removePaymentInstrumentFromBasket,
    updateBillingAddressForBasket,
} from '@/lib/api/basket.server';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { getAuth } from '@/middlewares/auth.server';
import { getCustomerProfileForCheckout } from '@/lib/api/customer.server';

vi.mock('@/middlewares/basket.server');
vi.mock('@/lib/api/basket.server');
vi.mock('@salesforce/storefront-next-runtime/i18n');
vi.mock('@/middlewares/auth.server');
vi.mock('@/lib/api/customer.server');
vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() })),
}));

const mockGetBasket = vi.mocked(getBasket);
const mockRemovePaymentInstrumentFromBasket = vi.mocked(removePaymentInstrumentFromBasket);
const mockAddPaymentInstrumentToBasket = vi.mocked(addPaymentInstrumentToBasket);
const mockUpdateBillingAddressForBasket = vi.mocked(updateBillingAddressForBasket);
const mockGetTranslation = vi.mocked(getTranslation);
const mockGetAuth = vi.mocked(getAuth);
const mockGetCustomerProfileForCheckout = vi.mocked(getCustomerProfileForCheckout);

const BASKET_ID = 'basket-123';
const EXISTING_PAYMENT_ID = 'pay-456';

function createSavedPaymentFormData(): FormData {
    const formData = new FormData();
    formData.append('useSavedPaymentMethod', 'true');
    formData.append('selectedSavedPaymentMethod', 'card_1');
    formData.append('useDifferentBilling', 'false');
    formData.append('cardNumber', '');
    formData.append('cardholderName', '');
    formData.append('expiryDate', '');
    formData.append('cvv', '');
    return formData;
}

function createBasketWithPayment(overrides?: { paymentInstruments?: unknown[] }) {
    return {
        basketId: BASKET_ID,
        orderTotal: 99.99,
        productTotal: 89.99,
        shippingTotal: 5.99,
        taxTotal: 4.01,
        shipments: [
            {
                shippingAddress: {
                    address1: '123 Main St',
                    city: 'Boston',
                    stateCode: 'MA',
                    postalCode: '02101',
                    countryCode: 'US',
                },
            },
        ],
        paymentInstruments: [
            {
                paymentInstrumentId: EXISTING_PAYMENT_ID,
                paymentMethodId: 'CREDIT_CARD',
                amount: 99.99,
            },
        ],
        ...overrides,
    };
}

function createBasketWithoutPayment() {
    return createBasketWithPayment({ paymentInstruments: [] });
}

describe('action.submit-payment.server', () => {
    let mockContext: RouterContextProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        mockContext = {} as RouterContextProvider;

        mockGetTranslation.mockReturnValue({
            t: ((key: string) => key) as ReturnType<typeof getTranslation>['t'],
        } as ReturnType<typeof getTranslation>);

        mockGetAuth.mockReturnValue({ customerId: 'cust-1' } as ReturnType<typeof getAuth>);

        mockGetCustomerProfileForCheckout.mockResolvedValue({
            paymentInstruments: [
                {
                    paymentInstrumentId: 'card_1',
                    paymentMethodId: 'CREDIT_CARD',
                    cardType: 'Visa',
                    holder: 'Jane Doe',
                    maskedNumber: '************1111',
                    expirationMonth: 12,
                    expirationYear: 2028,
                },
            ],
        } as any);

        mockGetBasket.mockResolvedValue({
            current: createBasketWithPayment(),
            snapshot: { basketId: BASKET_ID },
        } as ReturnType<typeof getBasket> extends Promise<infer R> ? R : never);

        mockRemovePaymentInstrumentFromBasket.mockResolvedValue(
            createBasketWithoutPayment() as Awaited<ReturnType<typeof removePaymentInstrumentFromBasket>>
        );
        mockAddPaymentInstrumentToBasket.mockResolvedValue(
            createBasketWithPayment({
                paymentInstruments: [{ paymentInstrumentId: 'new-pay', paymentMethodId: 'CREDIT_CARD', amount: 99.99 }],
            }) as Awaited<ReturnType<typeof addPaymentInstrumentToBasket>>
        );
        mockUpdateBillingAddressForBasket.mockResolvedValue(
            createBasketWithPayment({
                paymentInstruments: [{ paymentInstrumentId: 'new-pay', paymentMethodId: 'CREDIT_CARD', amount: 99.99 }],
                billingAddress: {
                    address1: '123 Main St',
                    city: 'Boston',
                    stateCode: 'MA',
                    postalCode: '02101',
                    countryCode: 'US',
                },
            } as any) as Awaited<ReturnType<typeof updateBillingAddressForBasket>>
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('remove then add payment', () => {
        it('calls removePaymentInstrumentFromBasket then addPaymentInstrumentToBasket when basket has existing payment', async () => {
            const formData = createSavedPaymentFormData();
            const response = await action(formData, mockContext);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(mockRemovePaymentInstrumentFromBasket).toHaveBeenCalledTimes(1);
            expect(mockRemovePaymentInstrumentFromBasket).toHaveBeenCalledWith(
                mockContext,
                BASKET_ID,
                EXISTING_PAYMENT_ID
            );
            expect(mockAddPaymentInstrumentToBasket).toHaveBeenCalledTimes(1);
            expect(mockAddPaymentInstrumentToBasket).toHaveBeenCalledWith(
                mockContext,
                BASKET_ID,
                expect.objectContaining({ paymentMethodId: 'CREDIT_CARD', amount: 99.99 })
            );
        });

        it('does not call removePaymentInstrumentFromBasket when basket has no payment instruments', async () => {
            mockGetBasket.mockResolvedValue({
                current: createBasketWithoutPayment(),
                snapshot: { basketId: BASKET_ID },
            } as ReturnType<typeof getBasket> extends Promise<infer R> ? R : never);

            const formData = createSavedPaymentFormData();
            const response = await action(formData, mockContext);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(mockRemovePaymentInstrumentFromBasket).not.toHaveBeenCalled();
            expect(mockAddPaymentInstrumentToBasket).toHaveBeenCalledTimes(1);
        });

        it('returns 400 with paymentProcessingFailed when removePaymentInstrumentFromBasket throws', async () => {
            mockRemovePaymentInstrumentFromBasket.mockRejectedValue(new Error('Remove failed'));

            const formData = createSavedPaymentFormData();
            const response = await action(formData, mockContext);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.error).toEqual(
                expect.objectContaining({ code: expect.any(String), message: expect.any(String) })
            );
            expect(data.step).toBe('payment');
            expect(mockRemovePaymentInstrumentFromBasket).toHaveBeenCalledTimes(1);
            expect(mockAddPaymentInstrumentToBasket).not.toHaveBeenCalled();
        });

        it('returns 400 with paymentProcessingFailed when addPaymentInstrumentToBasket throws', async () => {
            mockAddPaymentInstrumentToBasket.mockRejectedValue(new Error('Add failed'));

            const formData = createSavedPaymentFormData();
            const response = await action(formData, mockContext);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.error).toEqual(
                expect.objectContaining({ code: expect.any(String), message: expect.any(String) })
            );
            expect(data.step).toBe('payment');
            expect(mockRemovePaymentInstrumentFromBasket).toHaveBeenCalledTimes(1);
            expect(mockAddPaymentInstrumentToBasket).toHaveBeenCalledTimes(1);
        });
    });
});
