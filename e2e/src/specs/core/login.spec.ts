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

Feature('Storefront Login Tests').tag('@core').tag('@shopper-authentication');

const { storefrontPage, loginPage, loginFlow } = inject();
import { expect } from 'chai';

/**
 * Shopper Login with Cookie Transition Validation
 *
 * Test Flow:
 * 1. Navigate to homepage to establish guest session
 * 2. Capture initial guest cookies (cc-at, cc-nx-g, usid)
 * 3. Execute login flow with stored credentials from signup
 * 4. Validate login success
 * 5. Validate authentication cookie transition:
 *    - cc-at_{SiteId} persists (access token for both guest and authenticated)
 *    - cc-nx-g_{SiteId} deleted (guest refresh token removed)
 *    - cc-nx_{SiteId} set (authenticated refresh token created)
 *    - usid_{SiteId} updated (guest → authenticated session)
 *
 * Note: customerId is derived per-request from the access token JWT `isb` claim and is
 * not persisted as a cookie. Login flow automatically ensures valid credentials exist
 * by creating an account via signup if needed, then reuses those credentials.
 */
Scenario('Guest shopper login transitions cookies from guest to authenticated', async () => {
    const siteId = process.env.SITE_ID || 'RefArchGlobal';

    // Navigate to homepage to establish guest session
    storefrontPage.navigate();

    // Execute login flow with stored credentials
    // Flow handles: credential check, form fill, submission, redirect, and waiting for authenticated cookies
    await loginFlow.execute();

    // Capture all authenticated cookies after login
    const authCookies = await storefrontPage.waitForSessionCookies('registered', siteId);

    // Validate access token persists
    expect(authCookies.accessToken, `Access token cc-at_${siteId} should exist after login`).to.not.be.undefined;

    // Validate guest refresh token is deleted (returns null when absent; .not.exist accepts null/undefined)
    expect(authCookies.guestRefreshToken, 'Guest refresh token cc-nx-g should be removed after login').to.not.exist;

    // Validate authenticated refresh token exists
    expect(authCookies.authRefreshToken, `Authenticated refresh token cc-nx_${siteId} should exist after login`).to.not
        .be.undefined;

    // Validate user session ID exists
    expect(authCookies.usid, `User session ID usid_${siteId} should exist after login`).to.not.be.null;
})
    .tag('@login')
    .tag('@authentication')
    .tag('@cookies')
    .tag('@authentication-state')
    .tag('@smoke');

/**
 * Login with Invalid Credentials
 *
 * Test Flow:
 * 1. Navigate to login page
 * 2. Fill form with invalid credentials
 * 3. Submit form
 * 4. Validate error message is displayed
 * 5. Validate user remains on login page
 *
 * This tests the negative path to ensure proper error handling.
 */
Scenario('Login with invalid credentials fails with error message', async () => {
    // Navigate to login page
    loginPage.navigate('/login?mode=password');
    // Dismiss tracking consent first so form is visible
    await storefrontPage.handleTrackingConsent(true);
    loginPage.validatePageLoaded();

    // Fill form with invalid credentials
    loginPage.fillLoginForm({
        email: 'invalid@test.com',
        password: 'WrongPassword123!',
    });

    // Submit form
    loginPage.clickSignIn();

    // Validate error message is displayed
    const hasError = await loginPage.hasValidationError();
    expect(hasError, 'Error message should be displayed for invalid credentials').to.be.true;

    // Validate user remains on login page
    loginPage.validateLoginFailed();
})
    .tag('@login')
    .tag('@authentication')
    .tag('@negative')
    .tag('@validation')
    .tag('@smoke');
