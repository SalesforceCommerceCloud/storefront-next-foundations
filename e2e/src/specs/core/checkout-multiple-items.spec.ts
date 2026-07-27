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

Feature('Checkout Multiple Items Tests').tag('@core').tag('@checkout');

const { checkoutPage, addToCartFlow } = inject();
import { expect } from 'chai';
import {
    TEST_SHIPPING_ADDRESS,
    TEST_PAYMENT,
    TEST_PRODUCT_CATEGORIES,
    generateTestEmail,
} from '../../test-data/checkout.data';
import { installLoginPrefsStubHooks } from '../../utils/login-prefs-stub';

installLoginPrefsStubHooks();

Scenario('Guest checkout with multiple items in cart', async () => {
    const productInfo1 = await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo1).to.not.be.undefined;

    const productInfo2 = await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.WOMENS_DRESSES);
    expect(productInfo2).to.not.be.undefined;

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();

    checkoutPage.expandMyCart();
    const itemCount = await checkoutPage.getMyCartItemCount();
    expect(itemCount).to.be.at.least(2);

    const orderNumber = await checkoutPage.completeCheckout({
        email: generateTestEmail('multi-items'),
        shippingAddress: TEST_SHIPPING_ADDRESS,
        payment: TEST_PAYMENT,
    });

    expect(orderNumber).to.not.be.empty;
    expect(orderNumber).to.match(/^\d+$/);
})
    .tag('@guest-checkout')
    .tag('@place-order')
    .tag('@smoke');
