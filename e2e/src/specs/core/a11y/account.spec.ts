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

Feature('Accessibility Tests — Account Pages').tag('@a11y').tag('@account-a11y').retry(2);

const {
    storefrontPage,
    accountDetailsPage,
    accountAddressesPage,
    accountPaymentMethodsPage,
    accountWishlistPage,
    loginFlow,
    registeredShopperSetupFlow,
    addToWishlistFlow,
} = inject();
import { beginScan, scanAndAssert } from '../../../utils/a11y-utils';
import { SEVERITY_LEGEND } from '../../../utils/a11y-report-utils';

// Cache a shared registered shopper across scenarios so we don't incur a
// fresh signup + seed on every run. Scanning populated state (not empty
// state) is important — empty lists hide real a11y issues like table
// semantics, list item focus order, and delete-button affordances.
let shopperEmail = '';
let shopperPassword = '';
let wishlistSeeded = false;

BeforeSuite(() => {
    console.log(`\n${SEVERITY_LEGEND}\n`);
});

Before(async () => {
    await storefrontPage.clearCookies();

    if (!shopperEmail) {
        // Signs up a new user and seeds one address + one payment method,
        // leaving the session logged in.
        const { signupData } = await registeredShopperSetupFlow.execute();
        shopperEmail = signupData.email;
        shopperPassword = signupData.password;
    } else {
        await loginFlow.executeWithCredentials(shopperEmail, shopperPassword);
    }
});

// Clear session after each scenario so a registered session doesn't leak into
// the next spec that runs on the same worker.
After(async () => {
    await storefrontPage.clearCookies();
});

Scenario('Account details page accessibility', async () => {
    const viewport = await beginScan('account-details');
    accountDetailsPage.navigate();
    accountDetailsPage.validatePageLoaded();
    await scanAndAssert('account-details', viewport);
}).tag('@account-details');

Scenario('Account addresses page accessibility', async () => {
    const viewport = await beginScan('account-addresses');
    accountAddressesPage.navigate();
    accountAddressesPage.validatePageLoaded();
    await scanAndAssert('account-addresses', viewport);
}).tag('@account-addresses');

Scenario('Account payment methods page accessibility', async () => {
    const viewport = await beginScan('account-payment-methods');
    accountPaymentMethodsPage.navigate();
    accountPaymentMethodsPage.validatePageLoaded();
    await scanAndAssert('account-payment-methods', viewport);
}).tag('@account-payment-methods');

Scenario('Account wishlist page accessibility', async () => {
    // Seed one wishlist item once per run so the list renders populated state.
    // skipLogin: true — we're already authenticated as the shared test shopper.
    if (!wishlistSeeded) {
        await addToWishlistFlow.execute({ skipLogin: true });
        wishlistSeeded = true;
    }

    const viewport = await beginScan('account-wishlist');
    accountWishlistPage.navigate();
    accountWishlistPage.validatePageLoaded();
    await scanAndAssert('account-wishlist', viewport);
}).tag('@account-wishlist');

export {};
