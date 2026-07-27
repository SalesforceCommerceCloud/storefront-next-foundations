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
 * Validates the SLAS-status → modal mapping at the checkout contact step:
 *
 *   200       → OTP modal               (covered in checkout-passwordless-otp.spec.ts)
 *   400 / 5xx → standard login modal    (covered in checkout-passwordless-requires-login.spec.ts)
 *   403 / 404 → continue as guest, no modal opens
 *
 * This spec focuses on the guest path (403 / 404) and on the negative assertion
 * that the OTP modal does NOT open when SLAS rejects passwordless.
 */

Feature('Checkout Passwordless Status Mapping').tag('@core').tag('@checkout').tag('@passwordless-status-mapping');

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
    if (Array.isArray(tags) && tags.includes('@passwordless-status-mapping')) {
        await storefrontPage.logout();
    }
});

Scenario(
    'Guest path (SLAS 403/404 - server returns success=false with no requiresLogin) opens neither OTP nor login modal and full checkout completes',
    async () => {
        const email = generateTestEmail('guest-path');

        const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
        expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

        checkoutPage.validatePageLoaded();

        // Server responds with the guest-path shape: { success: false, email }.
        // The action handler returns this for SLAS 403 (not authorized for passwordless)
        // and SLAS 404 (email not registered) - both are mapped to "let the shopper
        // proceed as guest". Neither modal should open.
        await stubLoginPrefs({ branch: 'guest', email });
        await checkoutPage.fillContactInfoForPasswordless(email, TEST_SHIPPING_ADDRESS.phone);

        // Wait briefly to let any modal open if it were going to.
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const otpModalVisible = await checkoutPage.isPasswordlessOtpModalVisible();
        expect(otpModalVisible, 'OTP modal should NOT open on guest path').to.be.false;

        const loginModalVisible = await checkoutPage.isLoginModalVisible();
        expect(loginModalVisible, 'Standard login modal should NOT open on guest path').to.be.false;

        // Shopper proceeds straight through guest checkout.
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
    .tag('@no-modal')
    .tag('@place-order');

Scenario(
    'requiresLogin path opens the standard login modal (covers SLAS 400 unverified-email and 5xx upstream-unavailable branches)',
    async () => {
        // The same response shape - { success: false, requiresLogin: true, email } - is
        // emitted by the server action for both SLAS 400 (unverified email under
        // strict_verify=true) and SLAS 5xx (upstream unavailable, password fallback).
        // The client only switches on `requiresLogin: true`, so a single mock covers
        // both branches at the UI level.
        const email = generateTestEmail('requires-login-mapping');

        const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
        expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

        checkoutPage.validatePageLoaded();

        await stubLoginPrefs({ branch: 'loginModal', email });
        await checkoutPage.fillContactInfoForPasswordless(email, TEST_SHIPPING_ADDRESS.phone);

        const loginModalAppeared = await checkoutPage.waitForLoginModal(10);
        expect(loginModalAppeared, 'Standard login modal should open when requiresLogin is true').to.be.true;

        const otpModalVisible = await checkoutPage.isPasswordlessOtpModalVisible();
        expect(otpModalVisible, 'OTP modal should NOT open on requiresLogin path').to.be.false;
    }
).tag('@login-modal');

export {};
