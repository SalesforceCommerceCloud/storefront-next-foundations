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

Feature('Checkout Validation Tests').tag('@core').tag('@checkout').tag('@checkout-validation');

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

Scenario('Contact info rejects invalid input', async () => {
    await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    // Part A: empty form -> required field errors
    checkoutPage.clickContactInfoSubmit();

    await checkoutPage.waitForValidationErrors('sf-toggle-card-contact-info', 2);
    const emptyErrors = await checkoutPage.getFieldValidationErrors('sf-toggle-card-contact-info');
    expect(emptyErrors.length).to.be.at.least(2);

    const shippingVisible = await checkoutPage.isShippingAddressStepVisible();
    expect(shippingVisible, 'Should stay on contact info step').to.be.false;

    // Part B: invalid email + short phone -> format errors
    checkoutPage.fillContactInfoFields(INVALID_TEST_DATA.EMAIL, INVALID_TEST_DATA.PHONE);
    checkoutPage.clickContactInfoSubmit();

    await checkoutPage.waitForValidationErrors('sf-toggle-card-contact-info', 2);
    const formatErrors = await checkoutPage.getFieldValidationErrors('sf-toggle-card-contact-info');
    expect(formatErrors.length).to.be.at.least(2);
})
    .config({ retries: 0 })
    .tag('@contact-info-validation')
    .tag('@guest-checkout')
    .tag('@smoke');

Scenario('Shipping address rejects empty fields', async () => {
    await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('addr-validation'), TEST_SHIPPING_ADDRESS.phone);
    checkoutPage.waitForShippingAddressStep();

    checkoutPage.clickShippingAddressSubmit();

    await checkoutPage.waitForValidationErrors('sf-toggle-card-shipping-address', 4);
    const errors = await checkoutPage.getFieldValidationErrors('sf-toggle-card-shipping-address');
    expect(errors.length).to.be.at.least(4);

    const shippingMethodVisible = await checkoutPage.isShippingMethodStepVisible();
    expect(shippingMethodVisible, 'Should stay on shipping address step').to.be.false;
})
    .config({ retries: 0 })
    .tag('@shipping-address-validation')
    .tag('@guest-checkout');

Scenario('Payment rejects empty card fields', async () => {
    await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('pay-empty'), TEST_SHIPPING_ADDRESS.phone);
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);
    checkoutPage.waitForPaymentStep();

    checkoutPage.clickPlaceOrder();

    await checkoutPage.waitForValidationErrors('sf-toggle-card-payment', 3);
    const errors = await checkoutPage.getFieldValidationErrors('sf-toggle-card-payment');
    expect(errors.length).to.be.at.least(3);

    const confirmed = await checkoutPage.isOrderConfirmationShown();
    expect(confirmed, 'Order must NOT be placed with empty payment').to.be.false;
})
    .config({ retries: 0 })
    .tag('@payment-validation')
    .tag('@guest-checkout');

Scenario('Payment rejects expired card and invalid CVV', async () => {
    await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('pay-expired'), TEST_SHIPPING_ADDRESS.phone);
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);
    checkoutPage.waitForPaymentStep();

    checkoutPage.fillPaymentFieldsOnly({
        cardNumber: TEST_PAYMENT.cardNumber,
        cardholderName: TEST_PAYMENT.cardholderName,
        expiryDate: INVALID_TEST_DATA.EXPIRED_CARD_DATE,
        cvv: INVALID_TEST_DATA.CVV,
    });

    checkoutPage.clickPlaceOrder();

    await checkoutPage.waitForValidationErrors('sf-toggle-card-payment', 1);
    const errors = await checkoutPage.getFieldValidationErrors('sf-toggle-card-payment');
    expect(errors.length).to.be.at.least(1);

    const confirmed = await checkoutPage.isOrderConfirmationShown();
    expect(confirmed, 'Order must NOT be placed with invalid expiry/CVV').to.be.false;
})
    .config({ retries: 0 })
    .tag('@payment-validation')
    .tag('@guest-checkout');

Scenario('Payment rejects empty custom billing address', async () => {
    await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('pay-billing'), TEST_SHIPPING_ADDRESS.phone);
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);
    checkoutPage.waitForPaymentStep();

    checkoutPage.fillPaymentFieldsOnly(TEST_PAYMENT);
    await checkoutPage.checkUseDifferentBillingAddress();

    const billingFieldsVisible = await checkoutPage.areBillingAddressFieldsVisible();
    expect(billingFieldsVisible, 'Billing address fields should be visible').to.be.true;

    // Billing fields are pre-filled with shipping address — clear them to test validation
    await checkoutPage.clearBillingAddressFields();

    checkoutPage.clickPlaceOrder();

    await checkoutPage.waitForValidationErrors('sf-toggle-card-payment', 3);
    const errors = await checkoutPage.getFieldValidationErrors('sf-toggle-card-payment');
    expect(errors.length).to.be.at.least(3);

    const confirmed = await checkoutPage.isOrderConfirmationShown();
    expect(confirmed, 'Order must NOT be placed with empty billing address').to.be.false;
})
    .config({ retries: 0 })
    .tag('@payment-validation')
    .tag('@billing-validation')
    .tag('@guest-checkout');

Scenario('Empty cart shows informative message instead of checkout form', async () => {
    checkoutPage.navigate();
    checkoutPage.waitForMainContent();

    const isEmpty = await checkoutPage.isEmptyCartShown();
    expect(isEmpty, 'Should show empty cart message').to.be.true;

    const contactInfoVisible = await checkoutPage.isContactInfoFormVisible();
    expect(contactInfoVisible, 'Checkout form should not render when cart is empty').to.be.false;
})
    .config({ retries: 0 })
    .tag('@empty-cart');

Scenario('Promo code rejects too-short and invalid codes', async () => {
    await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    await checkoutPage.expandPromoCodeAccordion();

    checkoutPage.applyPromoCode(INVALID_TEST_DATA.SHORT_PROMO_CODE);
    checkoutPage.waitForPromoCodeError(5);
    const shortError = await checkoutPage.getPromoCodeError();
    expect(shortError, 'Should show error for too-short promo code').to.not.be.empty;

    checkoutPage.clearField(checkoutPage.locators.promoCodeInput);
    checkoutPage.applyPromoCode(INVALID_TEST_DATA.FAKE_PROMO_CODE);
    checkoutPage.waitForPromoCodeError(15);
    const fakeError = await checkoutPage.getPromoCodeError();
    expect(fakeError, 'Should show error for non-existent promo code').to.not.be.empty;
})
    .config({ retries: 0 })
    .tag('@promo-code-validation')
    .tag('@guest-checkout');

Scenario('Payment rejects too-short card number', async () => {
    await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('pay-short-card'), TEST_SHIPPING_ADDRESS.phone);
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);
    checkoutPage.waitForPaymentStep();

    checkoutPage.fillPaymentFieldsOnly({
        cardNumber: INVALID_TEST_DATA.SHORT_CARD_NUMBER,
        cardholderName: TEST_PAYMENT.cardholderName,
        expiryDate: TEST_PAYMENT.expiryDate,
        cvv: TEST_PAYMENT.cvv,
    });

    checkoutPage.clickPlaceOrder();

    await checkoutPage.waitForValidationErrors('sf-toggle-card-payment', 1);
    const errors = await checkoutPage.getFieldValidationErrors('sf-toggle-card-payment');
    expect(errors.length).to.be.at.least(1);

    const confirmed = await checkoutPage.isOrderConfirmationShown();
    expect(confirmed, 'Order must NOT be placed with too-short card number').to.be.false;
})
    .config({ retries: 0 })
    .tag('@payment-validation')
    .tag('@guest-checkout');
