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

const { signupFlow } = inject();
import type { SignupData } from '../types/auth.types';
import { credentialStore } from '../utils/credential-store';
import { getScapiConfig, loginGuest, registerCustomer, loginRegistered } from '../utils/scapi-helper';
import { injectAndActivateRegisteredSession } from '../utils/cookie-utils';

/**
 * API-based Signup Flow
 *
 * Registers a brand-new shopper via SCAPI (guest login → register → registered
 * login) and injects the resulting registered session cookies into the
 * Playwright browser context — no `/signup` UI form. A drop-in replacement for
 * `signupFlow.execute({ createBasket: false })` at setup call-sites where the
 * signup form is *not* the subject under test.
 *
 * Why this exists: the UI signup flow flakes three ways on the pre-merge pool
 * target — a SLAS 409 rate-limit on the storefront's post-signup auto-login, the
 * registered cookie never landing (the same rate limit, different surface), and
 * the signup form re-rendering mid-fill during hydration ("Last Name Input"
 * disappearing between `seeElement` and `fillField`). Driving signup through the
 * API eliminates the form-fill flake entirely and removes most of the rate-limit
 * pressure (one direct, retry-backed login instead of a UI submit that also
 * triggers the SDK auto-login).
 *
 * **What this flow intentionally skips** (UI-only checks not exercised by a
 * direct SCAPI registration) — keep `signupFlow` for any test that asserts on
 * these:
 * - The `/signup` form itself (validation, the create-account submit, the
 *   guest→registered cookie transition driven by the storefront).
 * - Turnstile bot-protection and tracking-consent dismissal.
 * - Production cookie expiry attributes — see `buildRegisteredSessionCookieOps`
 *   for the full deviation note (injected cookies are session-scoped).
 *
 * Composes existing `scapi-helper` calls (the first three of
 * `createRegisteredShopperViaApi`, minus address/profile/payment) — no new SCAPI
 * requests are written here. The registered login funnels through
 * `loginRegistered`, which now retries SLAS 409s with backoff.
 */
class ApiSignupFlow {
    /**
     * Register a new shopper via SCAPI and inject the registered session into the
     * browser. Stores credentials in the shared credential store using the same
     * shape `signupFlow` does, so a downstream `apiLoginFlow` re-auth keeps working.
     *
     * Throws if SCAPI config is unavailable (matching `apiLoginFlow`'s
     * no-silent-fallback stance) — callers that need a UI fallback should use
     * `signupFlow.execute()` instead.
     *
     * @param options.customData - Fields merged over the randomly generated data.
     * @returns The signup data that was registered.
     */
    async execute(options: { customData?: Partial<SignupData> } = {}): Promise<{ signupData: SignupData }> {
        const config = getScapiConfig();
        if (!config) {
            throw new Error(
                'apiSignupFlow.execute requires SCAPI config (clientId, organizationId, shortCode, siteId) ' +
                    'to be set in the storefront app .env. Configure it or use signupFlow.execute() instead.'
            );
        }

        const signupData: SignupData = options.customData
            ? { ...signupFlow.generateRandomSignupData(), ...options.customData }
            : signupFlow.generateRandomSignupData();

        const guestTokens = await loginGuest(config);
        await registerCustomer(config, guestTokens, signupData);
        const tokens = await loginRegistered(config, signupData);

        await injectAndActivateRegisteredSession(config.siteId, tokens);

        credentialStore.store({
            email: signupData.email,
            password: signupData.password,
            firstName: signupData.firstName,
            lastName: signupData.lastName,
            createdAt: Date.now(),
        });

        return { signupData };
    }
}

// Export as singleton following CodeceptJS pattern
export = new ApiSignupFlow();
