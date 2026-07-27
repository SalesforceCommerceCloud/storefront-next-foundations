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

const { I, storefrontPage, loginPage, signupFlow } = inject();
import { credentialStore } from '../utils/credential-store';
import { getSfccCookieNames } from '../utils/api-login-utils';
import { getSiteId } from '../utils/site-id';
import type { LoginData, LoginFlowOptions } from '../types/auth.types';

/**
 * Login Flow
 * Reusable flow for shopper authentication
 *
 * This flow encapsulates the complete login journey:
 * 1. Check credential store for existing account
 * 2. If no credentials exist, execute signup flow first and store credentials
 * 3. Navigate to login page
 * 4. Handle tracking consent if present
 * 5. Fill login form with stored credentials
 * 6. Submit form
 * 7. Wait for authenticated session cookies
 * 8. Return login data for validation
 *
 * This ensures login tests always have valid credentials without
 * manually managing test accounts across test specs.
 *
 * TODO: migrate non-UI-testing callers to apiLoginFlow (src/flows/api-login.flow.ts) to skip
 * the UI form-fill on every test. Bigger runtime win on post-merge @core. Caveats: the
 * 3 specs that test the login UI itself must keep using this flow; the storefront's auth
 * middleware clears cc-nx-g on UI form submit but not on direct cookie injection, so any
 * spec that depends on that behavior needs to opt out. Track separately from infra changes.
 */
class LoginFlow {
    /**
     * Ensure valid credentials exist in credential store
     * If no credentials exist, create a new account via signup flow
     *
     * @returns Promise<LoginData> - Credentials that can be used for login
     */
    async ensureCredentialsExist(): Promise<LoginData> {
        // Check if credentials already exist from previous test
        const storedCredentials = credentialStore.get();

        if (storedCredentials) {
            return {
                email: storedCredentials.email,
                password: storedCredentials.password,
            };
        }

        // No credentials exist - create new account via signup
        const { signupData } = await signupFlow.execute();

        // After signup, user is auto-logged in via SDK
        // We need to logout so the login flow can test the login process
        await storefrontPage.logout();

        // Store credentials for future tests in this session
        credentialStore.store({
            email: signupData.email,
            password: signupData.password,
            firstName: signupData.firstName,
            lastName: signupData.lastName,
            createdAt: Date.now(),
        });

        return {
            email: signupData.email,
            password: signupData.password,
        };
    }

    /**
     * Execute the complete login flow
     *
     * @param options - Optional flow configuration
     * @returns Promise<LoginData> - The login data that was used
     */
    async execute(options: LoginFlowOptions = {}): Promise<LoginData> {
        const { customData, acceptTracking = true } = options;

        try {
            let loginData: LoginData;

            if (customData) {
                // Use provided credentials
                loginData = customData;
            } else {
                // Ensure credentials exist (create account if needed)
                loginData = await this.ensureCredentialsExist();
            }

            // Navigate to login page with password mode to force standard login form
            // (passwordless login is enabled by default when features.passwordlessLogin.enabled = true)
            loginPage.navigate({ mode: 'password' });

            // Handle tracking consent first so it does not block the login form
            await storefrontPage.handleTrackingConsent(acceptTracking);

            // Validate page loaded
            loginPage.validatePageLoaded();

            loginPage.fillLoginForm(loginData);
            loginPage.clickSignIn();

            // Fail fast if login returns an error instead of waiting for cookies that will never arrive.
            await (I.usePlaywrightTo('wait for login result', async ({ page }) => {
                const navigated = page.waitForURL((url: URL) => !url.pathname.includes('/login'), {
                    timeout: 30_000,
                });
                const errorVisible = page
                    .locator('div.bg-destructive\\/10, [role="alert"]')
                    .first()
                    .waitFor({ state: 'visible', timeout: 30_000 });

                const result = await Promise.race([
                    navigated.then(() => 'navigated' as const),
                    errorVisible.then(() => 'error' as const),
                ]);

                if (result === 'error') {
                    const errorText = await page
                        .locator('div.bg-destructive\\/10, [role="alert"]')
                        .first()
                        .textContent();
                    throw new Error(`Login failed: ${errorText?.trim()}`);
                }
            }) as unknown as Promise<void>);

            const siteId = getSiteId();
            await storefrontPage.waitForSessionCookies('registered', siteId, 30);

            // Return login data for test validation
            return loginData;
        } catch (error) {
            // Save screenshot on error for debugging
            I.saveScreenshot(`login-flow-error-${Date.now()}.png`);
            throw error;
        }
    }

    /**
     * Execute login with specific credentials.
     * Useful for testing specific scenarios (e.g., invalid credentials).
     *
     * @param email - Email address
     * @param password - Password
     * @param options - Optional flow configuration (same as execute, excluding customData)
     * @returns Promise<LoginData> - The login data that was used
     */
    async executeWithCredentials(
        email: string,
        password: string,
        options: Omit<LoginFlowOptions, 'customData'> = {}
    ): Promise<LoginData> {
        return await this.execute({ ...options, customData: { email, password } });
    }

    /**
     * Get stored credentials without executing login
     * Useful for tests that need credentials but handle login differently
     *
     * @returns Promise<LoginData> - Stored credentials (creates account if needed)
     */
    async getCredentials(): Promise<LoginData> {
        return await this.ensureCredentialsExist();
    }

    /**
     * Update the stored password after a successful password change
     * Call this after a test changes the account password to keep the
     * credential store in sync for subsequent tests.
     *
     * @param newPassword - The new password that was set
     */
    updateStoredPassword(newPassword: string): void {
        const stored = credentialStore.get();
        if (stored) {
            credentialStore.store({ ...stored, password: newPassword });
        }
    }

    /**
     * Logout current user by clearing authentication cookies
     * This resets the session to guest state
     */
    async logout(): Promise<void> {
        const siteId = getSiteId();
        const names = getSfccCookieNames(siteId);

        I.clearCookie(names.accessToken);
        I.clearCookie(names.registeredRefresh);
        I.clearCookie(names.usid);

        // Reload the page so the storefront's auth middleware runs and issues a new guest session
        I.refreshPage();

        // Wait for guest session to be re-established
        await storefrontPage.waitForSessionCookies('guest', siteId);
    }
}

// Export as singleton
export = new LoginFlow();
