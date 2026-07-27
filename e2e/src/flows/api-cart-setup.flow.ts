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

const { I, checkoutPage, addToCartFlow } = inject();
import { getScapiConfig, createCartViaApi, type ApiCartResult } from '../utils/scapi-helper';
import { getStorefrontOrigin } from '../utils/cookie-utils';
import { buildCookieDefaults, getSfccCookieNames } from '../utils/api-login-utils';
import { getSiteId } from '../utils/site-id';
import { TEST_VARIANT_PRODUCTS } from '../test-data/checkout.data';
import type { ProductInfo } from '../types/product.types';

const CATEGORY_TO_VARIANT: Record<string, string> = {
    'category/mens-clothing-jackets': TEST_VARIANT_PRODUCTS.MENS_JACKET_VARIANT,
    'category/womens-clothing-dresses': TEST_VARIANT_PRODUCTS.WOMENS_DRESS_VARIANT,
};

/**
 * API Cart Setup Flow
 *
 * Creates a basket via direct SCAPI calls and injects session cookies into the
 * browser context, bypassing the UI add-to-cart journey. Intended only for checkout
 * tests where cart setup is a prerequisite, not the subject under test.
 *
 * Falls back to addToCartFlow when SCAPI config is unavailable, the category has
 * no known variant mapping, or the API call fails.
 */
class ApiCartSetupFlow {
    /**
     * Set up a cart and navigate to checkout.
     * Tries the fast API path for guest sessions, falls back to UI flow for
     * registered shoppers (API creates a guest session that would clobber auth cookies).
     *
     * TODO: drop the registered-shopper UI fallback. With apiLoginFlow available
     * (src/flows/api-login.flow.ts), registered carts can use the API path by passing the
     * registered tokens to createBasket() instead of creating a fresh guest session.
     * Bundle with the loginFlow → apiLoginFlow migration TODO in login.flow.ts.
     *
     * TODO: extract buildCookieDefaults() to api-login-utils.ts so the inline cookie
     * construction at injectSessionCookies() below shares the domain/path/secure/sameSite
     * logic with buildRegisteredSessionCookies(). Same shape, different cookie names
     * (cc-nx-g_ for guest vs cc-nx_ for registered).
     */
    async executeAndNavigateToCheckout(
        categoryUrl: string,
        maxRetries?: number,
        options?: { sitePrefix?: string }
    ): Promise<ProductInfo> {
        if (!options?.sitePrefix && !(await this.hasRegisteredSession())) {
            const variantId = CATEGORY_TO_VARIANT[categoryUrl];
            if (variantId) {
                try {
                    const result = await this.setupCartViaApi(variantId);
                    if (result) {
                        return { title: `API-cart (${variantId})`, quantity: '1' };
                    }
                } catch {
                    /* fall through to UI flow */
                }
            }
        }

        return addToCartFlow.executeAndNavigateToCheckout(categoryUrl, maxRetries, options);
    }

    /**
     * Detect whether the browser already has a registered shopper session.
     * The cc-nx_ cookie (without -g suffix) is the registered refresh token,
     * only set after login. If present, API cart setup would clobber it.
     */
    private async hasRegisteredSession(): Promise<boolean> {
        const siteId = getSiteId();
        const cookieName = getSfccCookieNames(siteId).registeredRefresh;
        return await (I.usePlaywrightTo('check for registered session', async ({ page }) => {
            const cookies = await page.context().cookies();
            return cookies.some((c: { name: string; value: string }) => c.name === cookieName && c.value.length > 0);
        }) as unknown as Promise<boolean>);
    }

    private async setupCartViaApi(
        productId: string,
        options?: { quantity?: number; currency?: string }
    ): Promise<ApiCartResult | null> {
        const config = getScapiConfig();
        if (!config) {
            return null;
        }

        const result = await createCartViaApi(config, productId, {
            quantity: options?.quantity ?? 1,
            currency: options?.currency,
        });

        await this.injectSessionCookies(config.siteId, result);
        await checkoutPage.navigateWithRetry();
        await this.waitForCheckoutReady();

        const emptyShown = await checkoutPage.isEmptyCartShown();
        if (emptyShown) {
            throw new Error('Checkout showed empty cart after API-based cart setup');
        }

        return result;
    }

    private async injectSessionCookies(siteId: string, result: ApiCartResult): Promise<void> {
        const cookieDefaults = buildCookieDefaults(getStorefrontOrigin());
        const names = getSfccCookieNames(siteId);

        const basketSnapshot = JSON.stringify({
            basketId: result.basket.basketId,
            totalItemCount: result.basket.totalItemCount,
            uniqueProductCount: result.basket.uniqueProductCount,
        });

        await (I.usePlaywrightTo('inject SCAPI session cookies', async ({ page }) => {
            // customerId is derived per-request from the SLAS access token JWT `isb` claim, so
            // it is not injected. `usid` IS injected because hybrid storefronts forward it to
            // ECOM (and the storefront's auth middleware writes it on the response anyway).
            await page.context().addCookies([
                { ...cookieDefaults, name: names.accessToken, value: result.tokens.accessToken, httpOnly: true },
                { ...cookieDefaults, name: names.guestRefresh, value: result.tokens.refreshToken, httpOnly: true },
                { ...cookieDefaults, name: names.usid, value: result.tokens.usid, httpOnly: true },
                { ...cookieDefaults, name: names.basket, value: basketSnapshot, httpOnly: false },
            ]);
        }) as unknown as Promise<void>);
    }

    private async waitForCheckoutReady(timeoutSeconds: number = 30): Promise<void> {
        await (I.usePlaywrightTo('wait for checkout content', async ({ page }) => {
            const content = page.locator(
                '[data-testid="sf-toggle-card-contact-info-content"], :text-matches("No items in cart")'
            );
            await content.first().waitFor({ state: 'visible', timeout: timeoutSeconds * 1000 });
        }) as unknown as Promise<void>);
    }
}

export = new ApiCartSetupFlow();
