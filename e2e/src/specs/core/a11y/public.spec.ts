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

// Infrastructure failures (timeouts, nav errors) should be retried.
// A11yBaselineError (real violations) suppresses retries via the a11yNoRetry plugin.
Feature('Accessibility Tests').tag('@a11y').tag('@public-a11y').retry(2);

const {
    storefrontPage,
    productListPage,
    productDetailPage,
    cartPage,
    checkoutPage,
    loginPage,
    signupPage,
    addToCartFlow,
} = inject();
import { TEST_PRODUCT_CATEGORIES } from '../../../test-data/checkout.data';
import { beginScan, scanAndAssert, navigateTo } from '../../../utils/a11y-utils';
import { SEVERITY_LEGEND } from '../../../utils/a11y-report-utils';

BeforeSuite(() => {
    console.log(`\n${SEVERITY_LEGEND}\n`);
});

// =============================================================================
// Scenarios
// =============================================================================

Scenario('Homepage accessibility', async () => {
    const viewport = await beginScan('homepage');
    storefrontPage.navigate();
    await scanAndAssert('homepage', viewport);
}).tag('@homepage');

Scenario('Product List Page accessibility', async () => {
    const viewport = await beginScan('plp');
    navigateTo('/category/womens-clothing-tops');
    productListPage.validateProductsDisplayed();
    await scanAndAssert('plp', viewport);
}).tag('@plp');

Scenario('Product Detail Page accessibility', async () => {
    const viewport = await beginScan('pdp');
    navigateTo('/product/25502228M');
    await productDetailPage.waitForPageReady();
    await scanAndAssert('pdp', viewport);
}).tag('@pdp');

Scenario('Search Results accessibility', async () => {
    const viewport = await beginScan('search');
    storefrontPage.navigate();
    storefrontPage.searchForProduct('shirt');
    productListPage.validateProductsDisplayed();
    await scanAndAssert('search', viewport);
}).tag('@search');

Scenario('Cart Page accessibility', async () => {
    const viewport = await beginScan('cart');
    await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    cartPage.navigate();
    await scanAndAssert('cart', viewport);
}).tag('@cart');

Scenario('Checkout Page accessibility', async () => {
    const viewport = await beginScan('checkout');
    await addToCartFlow.executeAndNavigateToCheckout(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    checkoutPage.validatePageLoaded();
    await scanAndAssert('checkout', viewport);
}).tag('@checkout');

Scenario('Login Page accessibility', async () => {
    const viewport = await beginScan('login');
    loginPage.navigate();
    await scanAndAssert('login', viewport);
}).tag('@login');

Scenario('Signup Page accessibility', async () => {
    const viewport = await beginScan('signup');
    signupPage.navigate();
    await scanAndAssert('signup', viewport);
}).tag('@signup');

export {};
