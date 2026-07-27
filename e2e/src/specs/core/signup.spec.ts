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

Feature('Storefront Signup Tests').tag('@core').tag('@shopper-registration');

const { storefrontPage, signupFlow } = inject();
import { expect } from 'chai';

/**
 * Shopper Registration with Cookie Transition Validation
 *
 * Test Flow:
 * 1. Navigate to homepage to establish guest session
 * 2. Capture initial guest cookies (cc-at, cc-nx-g, usid)
 * 3. Execute signup flow with randomly generated valid data
 * 4. Validate signup success
 * 5. Validate authentication cookie transition:
 *    - cc-at_{SiteId} persists (access token for both guest and authenticated)
 *    - cc-nx-g_{SiteId} deleted (guest refresh token removed)
 *    - cc-nx_{SiteId} set (authenticated refresh token created)
 *    - usid_{SiteId} updated (guest → authenticated session)
 *
 * Note: customerId is derived per-request from the access token JWT `isb` claim and is
 * not persisted as a cookie. SDK automatically calls login on successful signup, triggering
 * the authentication state transition from guest to authenticated user.
 */
Scenario('Guest shopper signup transitions cookies from guest to authenticated', async () => {
    const siteId = process.env.SITE_ID || 'RefArchGlobal';

    // Navigate to homepage to establish guest session
    storefrontPage.navigate();

    // Execute signup flow with randomly generated data
    // Flow handles: form fill, submission, redirect, and waiting for registered cookies
    await signupFlow.execute();

    // Signup flow already waited for registered cookies and returns them
    // Get the authenticated cookies that were set during signup
    const authCookies = await storefrontPage.waitForSessionCookies('registered', siteId);

    // Validate access token persists
    expect(authCookies.accessToken, `Access token cc-at_${siteId} should exist after signup`).to.not.be.undefined;

    // Validate guest refresh token is deleted (storefront-domain scoped; accepts null/undefined)
    expect(authCookies.guestRefreshToken, 'Guest refresh token cc-nx-g should be removed after signup').to.not.exist;

    // Validate authenticated refresh token exists
    expect(authCookies.authRefreshToken, `Authenticated refresh token cc-nx_${siteId} should exist after signup`).to.not
        .be.undefined;

    // Validate user session ID exists
    expect(authCookies.usid, `User session ID usid_${siteId} should exist after signup`).to.not.be.null;
})
    .tag('@signup')
    .tag('@authentication')
    .tag('@cookies')
    .tag('@authentication-state');
