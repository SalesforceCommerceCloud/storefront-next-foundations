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
 * Validates that when passwordless authorize returns a 400 (requiresLogin),
 * the checkout page shows a standard login modal instead of the OTP modal.
 * Both scenarios complete full checkout as guest after dismissing the modal.
 */

Feature('Checkout Passwordless Requires Login Flow').tag('@core').tag('@checkout').tag('@passwordless-requires-login');

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
    if (Array.isArray(tags) && tags.includes('@passwordless-requires-login')) {
        await storefrontPage.logout();
    }
});

Scenario(
    'Guest enters email that requires standard login, sees login modal, clicks Checkout as Guest, and places order',
    async () => {
        const email = generateTestEmail('requires-login');

        const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
        expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

        checkoutPage.validatePageLoaded();

        await stubLoginPrefs({ branch: 'loginModal', email });
        await checkoutPage.fillContactInfoForPasswordless(email, TEST_SHIPPING_ADDRESS.phone);

        const loginModalAppeared = await checkoutPage.waitForLoginModal(10);
        expect(loginModalAppeared, 'Login modal should appear after email blur when requiresLogin is true').to.be.true;

        const otpModalVisible = await checkoutPage.isPasswordlessOtpModalVisible();
        expect(otpModalVisible, 'OTP modal should NOT appear').to.be.false;

        // Fill email and password on the login modal before choosing guest checkout
        checkoutPage.fillLoginModalCredentials(email, 'TestPassword123!');

        // Click "Checkout as Guest" to dismiss login modal and continue as guest
        checkoutPage.clickLoginModalCheckoutAsGuest();
        checkoutPage.waitForLoginModalClosed(5);

        // Complete checkout as guest
        await checkoutPage.continueFromContactInfo();
        await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
        await checkoutPage.selectShippingMethod(0);
        await checkoutPage.fillPaymentInfo(TEST_PAYMENT);

        checkoutPage.waitForOrderConfirmation();
        checkoutPage.validateOrderConfirmation();
        const orderNumber = await checkoutPage.getOrderNumber();

        expect(orderNumber, 'Order number should be returned').to.not.be.empty;
        expect(orderNumber, 'Order number should be numeric').to.match(/^\d+$/);
    }
)
    .tag('@guest-checkout')
    .tag('@login-modal')
    .tag('@place-order');

Scenario('Continue as Guest from login modal completes full checkout with order placement', async () => {
    const email = generateTestEmail('continue-as-guest');

    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    await stubLoginPrefs({ branch: 'loginModal', email });
    await checkoutPage.fillContactInfoForPasswordless(email, TEST_SHIPPING_ADDRESS.phone);

    const loginModalAppeared = await checkoutPage.waitForLoginModal(10);
    expect(loginModalAppeared, 'Login modal should appear').to.be.true;

    const loginModalVisible = await checkoutPage.isLoginModalVisible();
    expect(loginModalVisible, 'Login modal should be visible with password field').to.be.true;

    // Fill email and password on the login modal, then choose guest checkout
    checkoutPage.fillLoginModalCredentials(email, 'TestPassword123!');

    // Guest clicks "Checkout as Guest" in the login modal
    checkoutPage.clickLoginModalCheckoutAsGuest();
    checkoutPage.waitForLoginModalClosed(5);

    const loginModalStillVisible = await checkoutPage.isLoginModalVisible();
    expect(loginModalStillVisible, 'Login modal should be closed after clicking Checkout as Guest').to.be.false;

    // Continue through full checkout flow
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
    .tag('@login-modal')
    .tag('@continue-as-guest')
    .tag('@place-order');

export {};
