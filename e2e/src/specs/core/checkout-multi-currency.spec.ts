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
 * Multi-Currency Checkout Tests — validates end-to-end checkout across
 * different site/locale/currency combinations defined in TEST_LOCALE_CURRENCIES.
 *
 * Entries whose site alias isn't available in the current environment
 * (determined by SITE_ALIAS env var) are automatically skipped.
 */

Feature('Multi-Currency Checkout Tests').tag('@core').tag('@checkout').tag('@multi-currency');

const { checkoutPage, apiCartSetupFlow } = inject();
import { expect } from 'chai';
import {
    TEST_PAYMENT,
    TEST_PRODUCT_CATEGORIES,
    TEST_LOCALE_CURRENCIES,
    generateTestEmail,
} from '../../test-data/checkout.data';
import { installLoginPrefsStubHooks } from '../../utils/login-prefs-stub';

installLoginPrefsStubHooks();

const siteAliases: readonly string[] = TEST_LOCALE_CURRENCIES.map((e) => e.siteAlias);

// Multi-currency tests construct /${siteAlias}/${locale} URL prefixes to switch between
// site/locale contexts. This only works with the prefix-site-locale URL configuration
// (/:siteId/:localeId). Self-skip for all other URL configurations.
const isPrefixSiteLocale = Boolean(process.env.SITE_ALIAS) && Boolean(process.env.LOCALE);

for (const localeCurrency of TEST_LOCALE_CURRENCIES) {
    const envAlias = process.env.SITE_ALIAS;
    const canRun =
        isPrefixSiteLocale &&
        (localeCurrency.siteAlias === envAlias ||
            (!siteAliases.includes(envAlias as string) && localeCurrency.locale === process.env.LOCALE));
    const scenarioFn = canRun ? Scenario : Scenario.skip;

    scenarioFn(`Guest shopper completes checkout in ${localeCurrency.label}`, async () => {
        const sitePrefix = `/${localeCurrency.siteAlias}/${localeCurrency.locale}`;

        const productInfo = await apiCartSetupFlow.executeAndNavigateToCheckout(
            TEST_PRODUCT_CATEGORIES.MENS_JACKETS,
            3,
            {
                sitePrefix,
            }
        );
        expect(productInfo, 'Product should be added to cart').to.not.be.undefined;

        checkoutPage.validatePageLoaded();

        const summaryText = await checkoutPage.getOrderSummaryText();
        expect(summaryText, `Order summary should show ${localeCurrency.label} currency`).to.match(
            localeCurrency.currencyPattern
        );

        const orderNumber = await checkoutPage.completeCheckout({
            email: generateTestEmail(`multi-currency-${localeCurrency.label.toLowerCase()}`),
            shippingAddress: localeCurrency.shippingAddress,
            payment: TEST_PAYMENT,
        });

        expect(orderNumber, 'Order number should be returned').to.not.be.empty;
        expect(orderNumber, 'Order number should be numeric').to.match(/^\d+$/);

        const confirmationText = await checkoutPage.getConfirmationPageText();
        expect(confirmationText, `Confirmation page should show ${localeCurrency.label} currency`).to.match(
            localeCurrency.currencyPattern
        );
    })
        .tag(`@${localeCurrency.label.toLowerCase()}`)
        .tag('@guest-checkout')
        .tag('@place-order')
        .tag('@smoke');
}

export {};
