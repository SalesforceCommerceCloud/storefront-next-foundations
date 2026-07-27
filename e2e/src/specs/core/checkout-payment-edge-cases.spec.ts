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

Feature('Checkout Payment Edge Cases Tests').tag('@core').tag('@checkout');

const { checkoutPage, apiCartSetupFlow } = inject();
import { expect } from 'chai';
import {
    TEST_SHIPPING_ADDRESS,
    TEST_PAYMENT,
    TEST_PRODUCT_CATEGORIES,
    INVALID_TEST_DATA,
    generateTestEmail,
} from '../../test-data/checkout.data';
import { installLoginPrefsStubHooks } from '../../utils/login-prefs-stub';

installLoginPrefsStubHooks();

Scenario('Invalid card number shows inline error', async () => {
    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('invalid-card'), TEST_SHIPPING_ADDRESS.phone);
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);

    checkoutPage.fillPaymentFieldsOnly({
        cardNumber: INVALID_TEST_DATA.SHORT_CARD_NUMBER,
        cardholderName: TEST_PAYMENT.cardholderName,
        expiryDate: TEST_PAYMENT.expiryDate,
        cvv: TEST_PAYMENT.cvv,
    });

    checkoutPage.clickPlaceOrderAndWaitForValidation();

    const errors = await checkoutPage.getPaymentValidationErrors();
    expect(errors.length).to.be.greaterThan(0);

    const currentUrl = await checkoutPage.getCurrentUrl();
    expect(currentUrl).to.include('/checkout');
    expect(currentUrl).to.not.include('/order-confirmation');
})
    .config({ retries: 0 })
    .tag('@payment-validation')
    .tag('@guest-checkout')
    .tag('@smoke');

Scenario('Expired card date shows inline error', async () => {
    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('expired-card'), TEST_SHIPPING_ADDRESS.phone);
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);

    checkoutPage.fillPaymentFieldsOnly({
        cardNumber: TEST_PAYMENT.cardNumber,
        cardholderName: TEST_PAYMENT.cardholderName,
        expiryDate: INVALID_TEST_DATA.EXPIRED_CARD_DATE,
        cvv: INVALID_TEST_DATA.CVV,
    });

    checkoutPage.clickPlaceOrderAndWaitForValidation();

    const errors = await checkoutPage.getPaymentValidationErrors();
    expect(errors.length).to.be.greaterThan(0);

    const confirmed = await checkoutPage.isOrderConfirmationShown();
    expect(confirmed).to.be.false;
})
    .config({ retries: 0 })
    .tag('@payment-validation')
    .tag('@guest-checkout');

Scenario('Invalid CVV shows inline error', async () => {
    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('invalid-cvv'), TEST_SHIPPING_ADDRESS.phone);
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);

    checkoutPage.fillPaymentFieldsOnly({
        cardNumber: TEST_PAYMENT.cardNumber,
        cardholderName: TEST_PAYMENT.cardholderName,
        expiryDate: TEST_PAYMENT.expiryDate,
        cvv: INVALID_TEST_DATA.CVV,
    });

    checkoutPage.clickPlaceOrderAndWaitForValidation();

    const errors = await checkoutPage.getPaymentValidationErrors();
    expect(errors.length).to.be.greaterThan(0);

    const confirmed = await checkoutPage.isOrderConfirmationShown();
    expect(confirmed).to.be.false;
})
    .config({ retries: 0 })
    .tag('@payment-validation')
    .tag('@guest-checkout');
