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

Feature('Accessibility Tests — Order Pages').tag('@a11y').tag('@orders-a11y').retry(2);

const { storefrontPage, orderListPage, orderDetailsPage, loginFlow } = inject();
import { beginScan, scanAndAssert } from '../../../utils/a11y-utils';
import { SEVERITY_LEGEND } from '../../../utils/a11y-report-utils';

const testUserEmail = process.env.E2E_TEST_USER_EMAIL || 'e2e.test.user@gmail.com';
const testUserPassword = process.env.E2E_TEST_USER_PASSWORD;
const orderScenario = testUserPassword ? Scenario : Scenario.skip;

BeforeSuite(() => {
    if (!testUserPassword) {
        console.warn(
            '[a11y:orders] ⚠️  E2E_TEST_USER_PASSWORD is not set — skipping order page a11y scans. ' +
                'Set E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD to enable these scenarios.'
        );
    }
    console.log(`\n${SEVERITY_LEGEND}\n`);
});

Before(async () => {
    if (!testUserPassword) return;

    const siteId = process.env.SITE_ID || 'RefArchGlobal';

    // Always start from a clean guest session and log in as the test user.
    // Reusing whatever session the previous spec left behind (e.g. via
    // hasRegisteredSession) risks scanning the wrong account's data.
    const establishSessionAndLogin = async (): Promise<void> => {
        await storefrontPage.clearCookies();
        storefrontPage.navigate();
        await storefrontPage.waitForSessionCookies('guest', siteId, 30);
        await loginFlow.executeWithCredentials(testUserEmail, testUserPassword);
    };

    // Retry once on transient session/login failures (e.g. SCAPI cookie timing,
    // flaky network). A second attempt with a fresh session typically succeeds.
    try {
        await establishSessionAndLogin();
    } catch {
        await establishSessionAndLogin();
    }
});

// Clear session after each scenario so a registered session doesn't leak into
// the next spec that runs on the same worker.
After(async () => {
    if (!testUserPassword) return;
    await storefrontPage.clearCookies();
});

orderScenario('Order list page accessibility', async () => {
    const viewport = await beginScan('order-list');
    orderListPage.navigate();
    orderListPage.validatePageLoaded();
    await scanAndAssert('order-list', viewport);
}).tag('@order-list');

orderScenario('Order details page accessibility', async () => {
    const viewport = await beginScan('order-details');
    orderListPage.navigate();
    orderListPage.validatePageLoaded();
    const orderNumber = await orderListPage.getFirstOrderNumberOrFail(testUserEmail);
    orderDetailsPage.navigate(orderNumber);
    orderDetailsPage.validatePageLoaded();
    await scanAndAssert('order-details', viewport);
}).tag('@order-details');

export {};
