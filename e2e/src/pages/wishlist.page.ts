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

import { buildSitePath } from '../utils/url-utils';

const { I } = inject();

/**
 * Public Wishlist Page Object
 *
 * Handles the `/wishlist` route — the public guest entry point. Registered
 * shoppers are redirected to `/account/wishlist` by the loader, so this page
 * is only observed by guests (and registered shoppers whose session has
 * expired).
 *
 * `account-wishlist.page.ts` covers the registered `/account/wishlist` route.
 */
class WishlistPage {
    readonly path = '/wishlist';

    locators = {
        // Heading rendered by WishlistPageContent's header card. Stable across guest and
        // registered render paths since both share the component.
        savedItemsHeading: locate('h2').withText('Saved Items').as('Saved Items Heading'),
        // The empty-state sign-in CTA only renders for guest sessions. The link is created
        // by the project's site-aware `Link` component, which prepends the site/locale
        // prefix and URL-encodes the returnUrl, so live href is e.g.
        // `/global/en-GB/login?returnUrl=%2Fwishlist`.
        signInCta: locate('a').withText('Sign in').as('Empty-state Sign-in CTA'),
    };

    navigate(): void {
        I.amOnPage(buildSitePath(this.path));
    }

    validatePageLoaded(): void {
        // The heading sits inside the route's <Suspense> around an Await on SCAPI
        // product details (_app.wishlist.tsx). Under load on the shared pool target
        // the Await can resolve later than seeElement's first check, producing
        // flaky failures (~2s) where the heading would otherwise appear shortly
        // after. Wait up to 10s for the post-resolve render.
        I.waitForElement(this.locators.savedItemsHeading, 10);
    }

    async getSignInCtaHref(): Promise<string> {
        return await I.grabAttributeFrom(this.locators.signInCta, 'href');
    }

    clickSignInCta(): void {
        I.click(this.locators.signInCta);
    }
}

export = new WishlistPage();
