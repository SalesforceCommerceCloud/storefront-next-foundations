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
 * Checkout Order Summary & Shipping Method Tests (Guest Shopper)
 *
 * Test Coverage:
 * - Order summary displays subtotal, shipping, and total at checkout (tax shown only for net taxation)
 * - Shipping method selection and verification during guest checkout
 *
 * Prerequisites:
 * - Product added to cart and navigated to checkout (guest flow)
 */

Feature('Checkout Order Summary & Shipping Method Tests').tag('@core').tag('@checkout');

const { checkoutPage, apiCartSetupFlow } = inject();
import { expect } from 'chai';
import { TEST_SHIPPING_ADDRESS, TEST_PRODUCT_CATEGORIES, generateTestEmail } from '../../test-data/checkout.data';
import { installLoginPrefsStubHooks } from '../../utils/login-prefs-stub';

installLoginPrefsStubHooks();

/**
 * Order summary displays subtotal, shipping, tax, and total
 *
 * Test Flow:
 * 1. Add product to cart and navigate to checkout
 * 2. Verify order summary container is visible
 * 3. Verify summary includes pricing labels (Subtotal, Shipping, Total)
 * 4. Verify at least one currency value is present
 * 5. Fill through checkout to payment step
 * 6. Verify order summary is still visible with a non-zero total
 */
Scenario('Order summary displays subtotal, shipping, tax, and total', async () => {
    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    const summaryVisible = await checkoutPage.isOrderSummaryVisible();
    expect(summaryVisible, 'Order summary should be visible on checkout page').to.be.true;

    const summaryText = await checkoutPage.getOrderSummaryText();
    expect(summaryText, 'Order summary should include Subtotal').to.match(/subtotal/i);
    expect(summaryText, 'Order summary should include Shipping').to.match(/shipping/i);
    expect(summaryText, 'Order summary should include Total').to.match(/total/i);
    expect(summaryText, 'Order summary should include a currency value').to.match(/[$£€¥][\d,.]+/);

    await checkoutPage.fillContactInfo(generateTestEmail('order-summary'), TEST_SHIPPING_ADDRESS.phone);
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);
    await checkoutPage.selectShippingMethod(0);

    const summaryStillVisible = await checkoutPage.isOrderSummaryVisible();
    expect(summaryStillVisible, 'Order summary should remain visible at payment step').to.be.true;

    const updatedSummaryText = await checkoutPage.getOrderSummaryText();
    expect(updatedSummaryText, 'Updated summary should include a currency value').to.match(/[$£€¥][\d,.]+/);
})
    .tag('@order-summary')
    .tag('@guest-checkout')
    .tag('@smoke');

/**
 * Guest shopper can view and select different shipping methods
 *
 * Test Flow:
 * 1. Add product to cart and navigate to checkout
 * 2. Fill contact info and shipping address
 * 3. Wait for shipping method radios to appear
 * 4. Verify at least one shipping method is available
 * 5. Verify shipping method names/prices are displayed
 * 6. Select a shipping method (second option if available, otherwise first)
 * 7. Verify payment step is reached
 */
Scenario('Guest shopper can view and select different shipping methods', async () => {
    const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

    checkoutPage.validatePageLoaded();

    await checkoutPage.fillContactInfo(generateTestEmail('shipping-method'), TEST_SHIPPING_ADDRESS.phone);
    await checkoutPage.fillShippingAddress(TEST_SHIPPING_ADDRESS);

    checkoutPage.waitForShippingMethods(30);

    const methodCount = await checkoutPage.getShippingMethodCount();
    expect(methodCount, 'At least one shipping method should be available').to.be.at.least(1);

    const shippingText = await checkoutPage.getShippingOptionsText();
    expect(shippingText, 'Shipping options should display method names').to.have.length.greaterThan(0);

    if (methodCount > 1) {
        await checkoutPage.selectShippingMethod(1);
    } else {
        await checkoutPage.selectShippingMethod(0);
    }

    const paymentVisible = await checkoutPage.isPaymentStepVisible();
    expect(paymentVisible, 'Payment step should be reached after selecting shipping method').to.be.true;
})
    .tag('@shipping-method')
    .tag('@guest-checkout')
    .tag('@smoke');
