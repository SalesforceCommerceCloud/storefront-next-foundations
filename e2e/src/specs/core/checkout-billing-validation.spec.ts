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

Feature('Checkout Billing Address Validation Tests').tag('@core').tag('@checkout').tag('@billing-validation');

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

Scenario('Billing address validation — required fields show errors', async () => {
    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('billing-validation'), TEST_SHIPPING_ADDRESS.phone);
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);
    checkoutPage.waitForPaymentStep();

    await checkoutPage.checkUseDifferentBillingAddress();

    const billingFieldsVisible = await checkoutPage.areBillingAddressFieldsVisible();
    expect(billingFieldsVisible).to.be.true;

    // Billing fields are pre-filled with shipping address — clear them to test validation
    await checkoutPage.clearBillingAddressFields();

    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);
    checkoutPage.clickPlaceOrder();

    await checkoutPage.waitForValidationErrors('sf-toggle-card-payment', 3);
    const errors = await checkoutPage.getFieldValidationErrors('sf-toggle-card-payment');

    expect(errors.length).to.be.greaterThan(0);

    const confirmed = await checkoutPage.isOrderConfirmationShown();
    expect(confirmed).to.be.false;

    const currentUrl = await checkoutPage.getCurrentUrl();
    expect(currentUrl).to.include('/checkout');
})
    .config({ retries: 0 })
    .tag('@billing-validation')
    .tag('@guest-checkout')
    .tag('@smoke');
