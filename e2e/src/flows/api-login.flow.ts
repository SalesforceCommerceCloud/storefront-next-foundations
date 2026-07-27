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

const { I, loginFlow } = inject();
import { getScapiConfig, loginRegistered, type RegisteredTokens, type ScapiConfig } from '../utils/scapi-helper';
import { buildRegisteredSessionCookieOps } from '../utils/api-login-utils';
import { getStorefrontOrigin } from '../utils/cookie-utils';
import { createTokenCache } from '../utils/token-cache';
import type { LoginData } from '../types/auth.types';

/**
 * Worker-local SLAS token cache, keyed by `email + sha256(password)`. See
 * `token-cache.ts` for the coalescing + eviction policy. TTL capped at 25 min —
 * well within SLAS's ~30 min access-token lifetime.
 *
 * Why caching matters: SLAS rate-limits successive logins for the same shopper
 * to ~1 per second per tenant ("OCAPI" 409 CONFLICT). Back-to-back scenarios
 * in the same spec each call clearCookies() + apiLoginFlow.execute(); without
 * the cache they trip the rate limit. The spec's "fresh session per scenario"
 * intent is preserved by clearing cookies and re-injecting the same tokens.
 *
 * Why the key bucket includes the password hash: SLAS revokes prior tokens on
 * password change. The Account Details "change password" scenario rotates the
 * spec's password mid-run; with an email-only key the next scenario would
 * receive pre-rotation tokens from cache and 401 against SCAPI. Hashing keeps
 * cleartext out of Map keys (which can leak via debug logs / heap dumps) while
 * preserving the "different password → different key" property we need.
 */
const TOKEN_CACHE_TTL_MS = 25 * 60 * 1000;
const tokenCache = createTokenCache<RegisteredTokens>();

/**
 * Hex-encoded SHA-256 of `input`. Used to bucket the cache by password without
 * keeping cleartext in the Map key. Matches the Web Crypto pattern used by
 * `scapi-helper.ts` for PKCE code challenges (no Node `crypto` import).
 */
async function sha256Hex(input: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * API-based Login Flow
 *
 * Authenticates a shopper via SCAPI's SLAS PKCE flow and injects the resulting
 * session cookies directly into the Playwright browser context, bypassing the
 * UI login form. Used as a drop-in replacement for `loginFlow.execute()` in
 * tests where login is setup, not the subject under test.
 *
 * **What this flow intentionally skips** (UI-only auth checks not exercised by
 * a direct SLAS call):
 * - **Turnstile bot-protection** (Cloudflare challenge attached to the standard
 *   login form, see `src/components/security/turnstile-widget.tsx`).
 * - **Tracking-consent banner dismissal** that the UI flow handles before form
 *   fill (see `loginFlow.execute` → `storefrontPage.handleTrackingConsent`).
 * - **Client-side form validation** (HTML/email format, required fields).
 * - **Email-verification OTP** flows (passwordless login, checkout-registration
 *   email verification) — `loginRegistered()` uses the password grant, never
 *   triggers `auth.otp.request` / `auth.otp.verify`.
 * - **Production cookie expiry attributes** — see `buildRegisteredSessionCookieOps`
 *   for the full deviation note.
 *
 * Use `loginFlow` (not this) for any test that asserts on the above. The 3
 * specs tagged `@login` always use `loginFlow` because they verify the UI
 * form itself.
 */
class ApiLoginFlow {
    /**
     * Execute the API login flow with the given credentials.
     *
     * Returns the credentials that were used (matches the shape `loginFlow.execute()`
     * returns) so callers can substitute one flow for the other without changes.
     *
     * Throws if SCAPI config is unavailable. Callers that need a fallback to
     * UI login should catch and dispatch to `loginFlow.execute()` themselves —
     * silent fallback at this layer would mask a misconfiguration.
     */
    async execute(credentials: LoginData): Promise<LoginData> {
        const config = getScapiConfig();
        if (!config) {
            throw new Error(
                'apiLoginFlow.execute requires SCAPI config (clientId, organizationId, shortCode, siteId) ' +
                    'to be set in the storefront app .env. Configure it or use loginFlow.execute() instead.'
            );
        }

        const tokens = await this.getOrFetchTokens(config, credentials);
        const ops = buildRegisteredSessionCookieOps(config.siteId, tokens, getStorefrontOrigin());

        await (I.usePlaywrightTo('inject API login session cookies', async ({ page }) => {
            for (const name of ops.clear) {
                await page.context().clearCookies({ name });
            }
            await page.context().addCookies(ops.add);
        }) as unknown as Promise<void>);

        return credentials;
    }

    private async getOrFetchTokens(config: ScapiConfig, credentials: LoginData): Promise<RegisteredTokens> {
        // Bucket the cache by `email + hash(password)` so a password rotation
        // (e.g. the Account Details "change password" scenario) produces a
        // cache miss on the next login. Keying by email alone would return
        // tokens minted under the old password — SLAS revokes those on
        // password change, so the storefront would 401 on the next SCAPI
        // call. The password is hashed (not stored cleartext in the Map key)
        // to avoid leaks via debug logs, heap dumps, or error serialization;
        // the only property we need is "different password → different key".
        const key = `${credentials.email}\0${await sha256Hex(credentials.password)}`;
        return tokenCache.getOrFetch(key, () => loginRegistered(config, credentials), TOKEN_CACHE_TTL_MS);
    }

    /**
     * API-login equivalent of `loginFlow.execute()` (no args): resolves credentials
     * via the shared credential store (creating an account on demand if none exist),
     * then logs in via SCAPI.
     *
     * Use this when migrating a `loginFlow.execute()` call-site that does not assert
     * on the UI login form. Specs that test the form itself must keep using
     * `loginFlow.execute()`.
     */
    async executeWithEnsuredCredentials(): Promise<LoginData> {
        const credentials = await loginFlow.getCredentials();
        return this.execute(credentials);
    }
}

export = new ApiLoginFlow();
