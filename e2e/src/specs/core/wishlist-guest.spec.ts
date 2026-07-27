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

Feature('Storefront Guest Wishlist Tests').tag('@core').tag('@wishlist');

const { I, wishlistPage, loginPage, storefrontPage } = inject();
import { expect } from 'chai';

Scenario('Guest /wishlist empty state shows sign-in CTA pointing back at /wishlist', async () => {
    wishlistPage.navigate();
    await storefrontPage.handleTrackingConsent(true);
    wishlistPage.validatePageLoaded();

    const href = await wishlistPage.getSignInCtaHref();
    expect(href, 'Sign-in CTA must point at /login').to.include('/login');
    // The site-aware Link wrapper URL-encodes the returnUrl path; accept either form so
    // the assertion holds regardless of whether the storefront is configured with a
    // site/locale prefix.
    expect(href, 'Sign-in CTA must carry returnUrl=/wishlist').to.match(/returnUrl=(?:%2F|\/)wishlist/);
})
    .tag('@guest-shopper')
    .tag('@happy-path')
    .tag('@wishlist-guest');

Scenario('Sign-in CTA navigates to /login with returnUrl preserved', async () => {
    wishlistPage.navigate();
    await storefrontPage.handleTrackingConsent(true);
    wishlistPage.validatePageLoaded();

    wishlistPage.clickSignInCta();
    loginPage.validatePageLoaded();

    const url = await I.grabCurrentUrl();
    expect(url, 'Should navigate to /login').to.include('/login');
    expect(url, 'Login URL must carry returnUrl=/wishlist so post-login lands back on the wishlist').to.match(
        /returnUrl=(?:%2F|\/)wishlist/
    );
})
    .tag('@guest-shopper')
    .tag('@happy-path')
    .tag('@wishlist-guest');

export {};
