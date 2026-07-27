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

Feature('Checkout Basket & Navigation Tests').tag('@core').tag('@checkout');

const { checkoutPage, addToCartFlow, registeredShopperSetupFlow, storefrontPage, loginFlow } = inject();
import { expect } from 'chai';
import { TEST_PRODUCT_CATEGORIES } from '../../test-data/checkout.data';

After(async (test: unknown) => {
    const tags = (test as { tags?: string[] }).tags ?? [];
    if (Array.isArray(tags) && tags.includes('@registered-shopper')) {
        await storefrontPage.logout();
    }
});

Scenario('Cart item count updates after removing item pre-checkout', async () => {
    const productInfo1 = await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo1).to.not.be.undefined;

    const productInfo2 = await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.WOMENS_DRESSES);
    expect(productInfo2).to.not.be.undefined;

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();

    checkoutPage.expandMyCart();

    const initialItemCount = await checkoutPage.getMyCartItemCount();
    expect(initialItemCount).to.be.at.least(2);

    await checkoutPage.validateMyCartDisplaysItemsWithPriceImageAndPromotions();

    const updatedItemCount = await checkoutPage.getMyCartItemCount();
    expect(updatedItemCount).to.be.at.least(1);
})
    .tag('@basket-context')
    .tag('@checkout-navigation');

Scenario('Navigating back from checkout preserves cart state', async () => {
    const productInfo = await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();

    checkoutPage.expandMyCart();
    const itemCountBeforeNav = await checkoutPage.getMyCartItemCount();
    expect(itemCountBeforeNav).to.be.at.least(1);

    checkoutPage.navigateToHomepage();

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();

    checkoutPage.expandMyCart();
    const itemCountAfterNav = await checkoutPage.getMyCartItemCount();
    expect(itemCountAfterNav).to.equal(itemCountBeforeNav);

    const emailValue = await checkoutPage.getEmailFieldValue();
    expect(emailValue, 'Email field should be cleared after navigation').to.be.empty;
})
    .tag('@basket-context')
    .tag('@checkout-navigation');

/**
 * Validates basket persistence across multiple login/logout cycles, basket merge
 * behavior, and accumulation of items through checkout navigation.
 * Uses API-based registered shopper setup instead of OTP verification.
 */
Scenario('Registered shopper basket persists and accumulates across multiple sessions', async () => {
    const { signupData } = await registeredShopperSetupFlow.execute();
    expect(signupData, 'Registered shopper should be created').to.not.be.undefined;

    await storefrontPage.logout();

    // Session 1: Add item as guest, login, verify 1 item
    const product1 = await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(product1, 'Product 1 should be added to cart').to.not.be.undefined;

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();
    await loginFlow.executeWithCredentials(signupData.email, signupData.password);

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();
    checkoutPage.expandMyCart();
    const itemCountAfterFirstLogin = await checkoutPage.getMyCartItemCount();
    expect(itemCountAfterFirstLogin, 'Basket should have 1 item after first login').to.equal(1);

    await storefrontPage.logout();

    // Session 2: Add item as guest, login, verify basket merge (2 items)
    const product2 = await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.WOMENS_DRESSES);
    expect(product2, 'Product 2 should be added to cart').to.not.be.undefined;

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();
    await loginFlow.executeWithCredentials(signupData.email, signupData.password);

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();
    checkoutPage.expandMyCart();
    const itemCountAfterSecondLogin = await checkoutPage.getMyCartItemCount();
    expect(itemCountAfterSecondLogin, 'Basket should have 2 items after second login (basket merge)').to.equal(2);

    await storefrontPage.logout();

    // Session 3: Login directly, verify basket persistence (still 2 items)
    await loginFlow.executeWithCredentials(signupData.email, signupData.password);
    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();
    checkoutPage.expandMyCart();
    const itemCountAfterThirdLogin = await checkoutPage.getMyCartItemCount();
    expect(itemCountAfterThirdLogin, 'Basket should persist with 2 items after third login').to.equal(2);

    // Add item 3, verify accumulation
    const product3 = await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.WOMENS_TOPS);
    expect(product3, 'Product 3 should be added to cart').to.not.be.undefined;

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();
    checkoutPage.expandMyCart();
    const itemCountBeforeLeavingCheckout = await checkoutPage.getMyCartItemCount();
    expect(itemCountBeforeLeavingCheckout, 'Basket should have 3 items').to.equal(3);

    // Leave checkout, add item 4, return, verify 4 items
    checkoutPage.navigateToHomepage();
    const product4 = await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.MENS_CLOTHING);
    expect(product4, 'Product 4 should be added to cart').to.not.be.undefined;

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();
    checkoutPage.expandMyCart();
    const finalItemCount = await checkoutPage.getMyCartItemCount();
    expect(finalItemCount, 'Basket should have 4 items after all additions').to.equal(4);

    // Place order with all 4 items
    await checkoutPage.validateAllCheckoutSectionsPrefilled();
    checkoutPage.clickPlaceOrder();

    checkoutPage.waitForOrderConfirmation();
    checkoutPage.validateOrderConfirmation();
    const orderNumber = await checkoutPage.getOrderNumber();

    expect(orderNumber, 'Order number should be returned').to.not.be.empty;
    expect(orderNumber, 'Order number should be numeric').to.match(/^\d+$/);
})
    .tag('@registered-shopper')
    .tag('@basket-persistence')
    .tag('@basket-accumulation')
    .tag('@place-order');
