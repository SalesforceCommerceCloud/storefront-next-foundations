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
 * Account Orders E2E Tests
 *
 * Prerequisites:
 * - Requires pre-existing test user with order history: e2e.test.user@gmail.com
 * - Configure in envs/process.env:
 *   E2E_TEST_USER_EMAIL=e2e.test.user@gmail.com
 *   E2E_TEST_USER_PASSWORD=[fill in the password]
 * - CRITICAL: This user MUST have existing orders in Commerce Cloud
 *   Tests will fail immediately if no order history is found
 *
 * Tests cover:
 * - Order list page load and display
 * - Order details page load and display
 * - Navigation between order list and details
 * - Error handling (order not found)
 * - Data persistence across page refreshes
 */

Feature('Account Orders Tests').tag('@core').tag('@account').tag('@orders');

const { orderListPage, orderDetailsPage, apiLoginFlow, storefrontPage } = inject();
import { expect } from 'chai';
import { buildSitePath } from '../../utils/url-utils';

// Use the pre-existing test user that has order history
// These must be configured in envs/process.env
const testUserEmail = process.env.E2E_TEST_USER_EMAIL || 'e2e.test.user@gmail.com';
const testUserPassword = process.env.E2E_TEST_USER_PASSWORD;

// TODO: The spec-level Before hook (establishSessionAndLogin -> waitForSessionCookies)
// intermittently times out at 30s waiting for the guest SLAS cookie cc-nx-g_RefArchGlobal
// on stg-016. The hook gates every scenario in this file, so a single flake there can
// sink whichever scenario runs first. Tracked in W-22970888 (CC Sharks). Re-enable when
// the underlying flake is fixed.
const isOrderSessionFlaky = true;

// When E2E_TEST_USER_PASSWORD is not set, skip all order scenarios (e.g. CI without secrets, local run)
const orderScenario = testUserPassword && !isOrderSessionFlaky ? Scenario : Scenario.skip;

/**
 * Login once per spec-file run, re-authenticating if the session was cleared.
 * Order tests are read-only (no state mutations between scenarios), so a single
 * authenticated session can be reused across all scenarios without isolation risk.
 * Re-logging in before every scenario multiplies auth API calls under parallel
 * workers and causes timeout failures.
 *
 * We check for the `cc-nx_<siteId>` registered-session cookie instead of using a
 * boolean flag, so that if another spec's Before hook calls clearCookies() in the
 * same worker we correctly detect the invalidated session and re-authenticate.
 */
Before(async () => {
    if (!testUserPassword) return;
    if (await storefrontPage.hasRegisteredSession()) return;

    const siteId = process.env.SITE_ID || 'RefArchGlobal';

    /**
     * After a full cookie clear, load the storefront and wait for a guest SLAS
     * session before opening /login. Otherwise the login action can race a
     * half-established context and surface the generic "Something went wrong" error.
     * One retry absorbs transient SCAPI failures seen under parallel CI load.
     */
    const establishSessionAndLogin = async (): Promise<void> => {
        await storefrontPage.clearCookies();
        storefrontPage.navigate();
        await storefrontPage.waitForSessionCookies('guest', siteId, 30);
        await apiLoginFlow.execute({ email: testUserEmail, password: testUserPassword });
    };

    try {
        await establishSessionAndLogin();
    } catch {
        await establishSessionAndLogin();
    }
});

// =============================================================================
// Order List Page Tests
// =============================================================================

/**
 * Order List Page Load and Authentication
 *
 * Test Flow:
 * 1. Navigate to order list page
 * 2. Validate page loads with expected elements
 * 3. Validate authenticated session
 */
orderScenario('Order list page loads successfully for authenticated user', async () => {
    // Navigate to order list
    orderListPage.navigate();

    // Validate page loaded
    orderListPage.validatePageLoaded();

    // Verify user remains on order list page (not redirected)
    const currentUrl = await orderListPage.getCurrentUrl();
    expect(currentUrl, 'Should remain on order list page').to.include(buildSitePath('/account/orders'));
})
    .tag('@page-load')
    .tag('@authentication');

/**
 * Order List Display
 *
 * Test Flow:
 * 1. Navigate to order list page
 * 2. Verify orders are displayed (or empty state)
 * 3. Validate order card structure
 */
orderScenario('Order list displays customer orders', async () => {
    orderListPage.navigate();

    // Wait for page to load
    orderListPage.validatePageLoaded();

    // Check if orders are displayed
    const orderCount = await orderListPage.getOrderCount();

    if (orderCount > 0) {
        // Validate order card structure
        orderListPage.validateOrdersDisplayed();
        orderListPage.validateOrderCardStructure();

        // Verify at least one order is visible
        expect(orderCount, 'Should have at least one order').to.be.greaterThan(0);
    } else {
        // Check for empty state
        const isEmptyState = await orderListPage.isEmptyStateVisible();
        expect(isEmptyState, 'Should show empty state when no orders').to.be.true;
    }
})
    .tag('@display')
    .tag('@order-list');

/**
 * Order Card Information
 *
 * Test Flow:
 * 1. Navigate to order list page
 * 2. Verify order information is displayed correctly
 * 3. Validate order number format
 */
orderScenario('Order cards display correct information', async () => {
    orderListPage.navigate();
    orderListPage.validatePageLoaded();

    const orderNumber = await orderListPage.getFirstOrderNumberOrFail(testUserEmail);

    // Validate order number exists and is not empty
    expect(orderNumber, 'Order number should not be empty').to.have.length.greaterThan(0);
})
    .tag('@display')
    .tag('@order-info');

/**
 * Navigate to Order Details
 *
 * Test Flow:
 * 1. Navigate to order list page
 * 2. Click "View Details" on first order
 * 3. Verify navigation to order details page
 * 4. Verify correct order number in URL
 */
orderScenario('User can navigate to order details from order list', async () => {
    orderListPage.navigate();
    orderListPage.validatePageLoaded();

    const orderNumber = await orderListPage.getFirstOrderNumberOrFail(testUserEmail);

    // Click view details
    orderListPage.clickFirstOrderDetails();

    // Verify navigation to order details page
    const currentUrl = await orderDetailsPage.getCurrentUrl();
    expect(currentUrl, 'Should navigate to order details page').to.include(buildSitePath('/account/orders/'));
    expect(currentUrl, 'URL should contain order number').to.include(orderNumber);
})
    .tag('@navigation')
    .tag('@order-details');

// =============================================================================
// Order Details Page Tests
// =============================================================================

/**
 * Order Details Page Load
 *
 * Test Flow:
 * 1. Navigate to order list
 * 2. Get first order number
 * 3. Navigate to order details
 * 4. Verify page loads with correct order information
 */
orderScenario('Order details page loads successfully', async () => {
    orderListPage.navigate();
    orderListPage.validatePageLoaded();

    const orderNumber = await orderListPage.getFirstOrderNumberOrFail(testUserEmail);

    // Navigate to order details
    orderDetailsPage.navigate(orderNumber);

    // Validate page loaded
    orderDetailsPage.validatePageLoaded();

    // Verify correct order number is displayed
    const displayedOrderNumber = await orderDetailsPage.getOrderNumber();
    expect(displayedOrderNumber, 'Displayed order number should match').to.include(orderNumber);
})
    .tag('@page-load')
    .tag('@order-details');

/**
 * Order Details Display
 *
 * Test Flow:
 * 1. Navigate to order list
 * 2. Navigate to first order details
 * 3. Verify all order detail sections are visible
 * 4. Validate order items are displayed
 */
orderScenario('Order details page displays complete order information', async () => {
    orderListPage.navigate();
    orderListPage.validatePageLoaded();

    const orderNumber = await orderListPage.getFirstOrderNumberOrFail(testUserEmail);
    orderDetailsPage.navigate(orderNumber);

    orderDetailsPage.validatePageLoaded();

    // Verify order items section is visible
    const itemCount = await orderDetailsPage.getOrderItemCount();
    expect(itemCount, 'Order should have at least one item').to.be.greaterThan(0);

    // Verify order summary is visible
    orderDetailsPage.validateOrderSummaryVisible();
})
    .tag('@display')
    .tag('@order-details');

/**
 * Order Not Found Error
 *
 * Test Flow:
 * 1. Navigate to order details with invalid order number
 * 2. Verify order not found error is displayed
 * 3. Verify back to orders button/link is present
 */
orderScenario('Order details page shows error for non-existent order', () => {
    orderDetailsPage.navigate('INVALID-ORDER-12345');
    // validateOrderNotFound uses I.see() which auto-waits for the element to appear
    orderDetailsPage.validateOrderNotFound();
})
    .tag('@error-handling')
    .tag('@negative');

/**
 * Navigate Back to Order List
 *
 * Test Flow:
 * 1. Navigate to order list
 * 2. Navigate to order details
 * 3. Click back to order list
 * 4. Verify navigation back to order list page
 */
orderScenario('User can navigate back to order list from order details', async () => {
    orderListPage.navigate();
    orderListPage.validatePageLoaded();

    await orderListPage.getFirstOrderNumberOrFail(testUserEmail);

    // Navigate to order details
    orderListPage.clickFirstOrderDetails();

    // Verify we're on order details page
    let currentUrl = await orderDetailsPage.getCurrentUrl();
    expect(currentUrl, 'Should be on order details page').to.include(buildSitePath('/account/orders/'));

    // Click back to orders
    orderDetailsPage.clickBackToOrders();

    // Verify navigation back to order list
    currentUrl = await orderListPage.getCurrentUrl();
    expect(currentUrl, 'Should navigate back to order list').to.include(buildSitePath('/account/orders'));
    expect(currentUrl, 'Should not have order number in URL').to.not.match(/\/account\/orders\/.+/);
})
    .tag('@navigation')
    .tag('@back-navigation');

/**
 * Direct URL Access to Order Details
 *
 * Test Flow:
 * 1. Get an order number from order list
 * 2. Directly navigate to order details via URL
 * 3. Verify page loads correctly
 */
orderScenario('User can access order details via direct URL', async () => {
    // Get an order number from the list
    orderListPage.navigate();
    orderListPage.validatePageLoaded();

    const orderNumber = await orderListPage.getFirstOrderNumberOrFail(testUserEmail);

    // Directly navigate to order details via URL
    orderDetailsPage.navigate(orderNumber);

    // Verify page loads
    orderDetailsPage.validatePageLoaded();

    // Verify correct order is displayed
    const displayedOrderNumber = await orderDetailsPage.getOrderNumber();
    expect(displayedOrderNumber, 'Displayed order should match URL parameter').to.include(orderNumber);
})
    .tag('@navigation')
    .tag('@direct-url');

export {};
