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

/**
 * Validates passwordless OTP detection during checkout — guests entering a
 * registered email see the OTP modal and can decline to continue as guest.
 * Uses API mocking since OTP codes cannot be verified in E2E tests.
 */

Feature('Checkout Passwordless OTP Flow').tag('@core').tag('@checkout').tag('@passwordless-otp');

const { checkoutPage, apiCartSetupFlow, storefrontPage } = inject();
import { expect } from 'chai';
import {
    TEST_SHIPPING_ADDRESS,
    TEST_PAYMENT,
    TEST_PRODUCT_CATEGORIES,
    generateTestEmail,
} from '../../test-data/checkout.data';
import { stubLoginPrefs } from '../../utils/login-prefs-stub';

After(async (test: unknown) => {
    const tags = (test as { tags?: string[] }).tags ?? [];
    if (Array.isArray(tags) && tags.includes('@passwordless-otp')) {
        await storefrontPage.logout();
    }
});

Scenario('Guest enters registered email, sees passwordless OTP modal, and continues as guest', async () => {
    const registeredEmail = generateTestEmail('registered-passwordless');

    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    await stubLoginPrefs({ branch: 'otp', email: registeredEmail });
    await checkoutPage.fillContactInfoForPasswordless(registeredEmail, TEST_SHIPPING_ADDRESS.phone);

    const modalAppeared = await checkoutPage.waitForPasswordlessOtpModal(10);
    expect(modalAppeared, 'Passwordless OTP modal should appear after email blur').to.be.true;

    const modalVisible = await checkoutPage.isPasswordlessOtpModalVisible();
    expect(modalVisible, 'Passwordless OTP modal should be visible').to.be.true;

    await checkoutPage.clickPasswordlessOtpCheckoutAsGuest();
    await checkoutPage.waitForPasswordlessOtpModalClosed(5);

    const modalStillVisible = await checkoutPage.isPasswordlessOtpModalVisible();
    expect(modalStillVisible, 'Passwordless OTP modal should be closed').to.be.false;

    await checkoutPage.continueFromContactInfo();
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);
    await checkoutPage.fillPaymentInfo(TEST_PAYMENT);

    checkoutPage.waitForOrderConfirmation();
    checkoutPage.validateOrderConfirmation();
    const orderNumber = await checkoutPage.getOrderNumber();

    expect(orderNumber, 'Order number should be returned').to.not.be.empty;
    expect(orderNumber, 'Order number should be numeric').to.match(/^\d+$/);
})
    .tag('@guest-checkout')
    .tag('@passwordless-decline')
    .tag('@place-order');

export {};
