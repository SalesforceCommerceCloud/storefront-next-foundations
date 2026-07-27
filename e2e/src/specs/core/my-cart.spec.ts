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

Feature('My Cart on Checkout').tag('@core').tag('@my-cart').tag('@checkout');

const { I, checkoutPage, addToCartFlow, storefrontPage, cartPage } = inject();
import { expect } from 'chai';
import { TEST_PRODUCT_CATEGORIES } from '../../test-data/checkout.data';

/**
 * Setup: Add a product to cart and navigate to checkout.
 * My Cart tests use executeAndNavigateToCheckoutPreferringPromoted so we prefer a product with a Sale badge
 * when the category has one, validating that My Cart renders promotions correctly. Other specs use
 * executeAndNavigateToCheckout() and keep the original add-to-cart order.
 */
Before(async () => {
    const productInfo = await addToCartFlow.executeAndNavigateToCheckoutPreferringPromoted(
        TEST_PRODUCT_CATEGORIES.MENS_JACKETS
    );
    expect(productInfo, 'Product should be added to cart for My Cart test').to.not.be.undefined;
    // executeAndNavigateToCheckoutPreferringPromoted already confirmed checkout content rendered
    // (contact-info card or empty-cart). Dismiss consent banner then wait for My Cart toggle.
    await storefrontPage.handleTrackingConsent(true);
    I.waitForElement(checkoutPage.locators.myCartToggle);
});

/**
 * Cleanup: Remove cart items so test data does not persist.
 * Wrapped in try/catch so a cleanup failure doesn't mask the real test result.
 */
After(async () => {
    try {
        await storefrontPage.handleTrackingConsent(true);
        cartPage.navigate();
        I.waitForElement(cartPage.locators.cartContainer);
        let itemCount = await cartPage.getCartItemCount();
        while (itemCount > 0) {
            await cartPage.removeItem(0);
            itemCount = await cartPage.getCartItemCount();
        }
    } catch {
        // Cleanup is best-effort; guest sessions are ephemeral so leftover items won't persist.
    }
});

Scenario('My Cart displays cart items with price, product image, and promotions when expanded', async () => {
    checkoutPage.expandMyCart();
    await checkoutPage.validateMyCartDisplaysItemsWithPriceImageAndPromotions();
}).tag('@my-cart-display');
