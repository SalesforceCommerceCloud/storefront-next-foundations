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
 * Validates that when the registration API returns unavailable (SLAS 400 "Email not verified"),
 * the create account checkbox is silently unchecked with no error toast or modal,
 * and checkout continues normally as a guest.
 */

Feature('Checkout Registration Unavailable').tag('@core').tag('@checkout').tag('@registration-unavailable');

const { checkoutPage, apiCartSetupFlow } = inject();
import { expect } from 'chai';
import {
    TEST_SHIPPING_ADDRESS,
    TEST_PAYMENT,
    TEST_PRODUCT_CATEGORIES,
    generateTestEmail,
} from '../../test-data/checkout.data';
import { installLoginPrefsStubHooks } from '../../utils/login-prefs-stub';

installLoginPrefsStubHooks();

Scenario(
    'Create account checkbox is silently unchecked when registration is unavailable and checkout completes as guest',
    async () => {
        const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
        expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

        checkoutPage.validatePageLoaded();

        const email = generateTestEmail('registration-unavailable');

        await checkoutPage.fillContactInfo(email);
        await checkoutPage.continueFromContactInfo();
        await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
        await checkoutPage.continueFromShippingAddress();
        await checkoutPage.selectFirstShippingMethod();
        checkoutPage.continueFromShippingOptions();
        checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);

        await checkoutPage.mockRegistrationUnavailable();

        const wasUnchecked = await checkoutPage.clickCreateAccountCheckboxAndWaitForUncheck(15);
        expect(wasUnchecked, 'Checkbox should be silently unchecked when registration is unavailable').to.be.true;

        const otpModalVisible = await checkoutPage.isPasswordlessOtpModalVisible();
        expect(otpModalVisible, 'OTP modal should NOT appear when registration is unavailable').to.be.false;

        const isChecked = await checkoutPage.isCreateAccountCheckboxChecked();
        expect(isChecked, 'Create account checkbox should remain unchecked').to.not.equal('true');

        checkoutPage.clickPlaceOrder();

        checkoutPage.waitForOrderConfirmationElement(30);
        const orderNumber = await checkoutPage.getOrderNumberFromConfirmation();
        expect(orderNumber, 'Order number should exist').to.not.equal('');
    }
)
    .tag('@guest-checkout')
    .tag('@checkout-registration')
    .tag('@silent-uncheck')
    .tag('@smoke');

Scenario('No error message or toast is shown when registration is unavailable', async () => {
    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    const email = generateTestEmail('registration-no-error');

    await checkoutPage.fillContactInfo(email);
    await checkoutPage.continueFromContactInfo();
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.continueFromShippingAddress();
    await checkoutPage.selectFirstShippingMethod();
    checkoutPage.continueFromShippingOptions();
    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);

    await checkoutPage.mockRegistrationUnavailable();

    const wasUnchecked = await checkoutPage.clickCreateAccountCheckboxAndWaitForUncheck(15);
    expect(wasUnchecked, 'Checkbox should be silently unchecked').to.be.true;

    const hasError = await checkoutPage.hasRegistrationError();
    expect(hasError, 'No error message should be displayed in the registration section').to.be.false;

    checkoutPage.clickPlaceOrder();

    checkoutPage.waitForOrderConfirmationElement(30);
    const orderNumber = await checkoutPage.getOrderNumberFromConfirmation();
    expect(orderNumber, 'Order number should exist').to.not.equal('');
})
    .tag('@guest-checkout')
    .tag('@checkout-registration')
    .tag('@no-error-toast')
    .tag('@smoke');

export {};
