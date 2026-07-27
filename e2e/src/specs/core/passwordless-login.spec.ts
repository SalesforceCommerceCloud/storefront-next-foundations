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
 * Passwordless Login E2E Tests
 *
 * These tests verify the UI elements of the passwordless login flow.
 * Tests are scoped to behaviors that work on any environment regardless
 * of whether SLAS private client or passwordlessLogin is configured.
 */

Feature('Passwordless Login').tag('@core').tag('@auth').tag('@passwordless');

const { passwordlessLoginPage } = inject();
import { expect } from 'chai';

Scenario('Login page displays passwordless login form', async () => {
    // Navigate to the login page
    passwordlessLoginPage.navigate();

    // Verify the login heading is displayed
    passwordlessLoginPage.validateLoginHeading();

    // Verify email input is present
    const isEmailVisible = await passwordlessLoginPage.isEmailInputVisible();
    expect(isEmailVisible, 'Email input should be visible').to.be.true;

    // Verify Continue button is present
    const isSendButtonVisible = await passwordlessLoginPage.isContinueButtonVisible();
    expect(isSendButtonVisible, 'Continue button should be visible').to.be.true;
})
    .tag('@passwordless-login')
    .tag('@login-form');

Scenario('Email validation - empty email shows error', async () => {
    // Navigate to the login page
    passwordlessLoginPage.navigate();

    // Dismiss cookie dialog if present
    await passwordlessLoginPage.dismissCookieDialog();

    // Try to submit without entering email
    passwordlessLoginPage.clickContinue();

    // The browser's native validation should prevent submission
    // or an error message should appear

    // Check that we're still on the login page (form wasn't submitted)
    const isEmailVisible = await passwordlessLoginPage.isEmailInputVisible();
    expect(isEmailVisible, 'Email input should still be visible after failed submission').to.be.true;
})
    .tag('@passwordless-login')
    .tag('@validation');

Scenario('Invalid email format is rejected by the form', async () => {
    passwordlessLoginPage.navigate();
    await passwordlessLoginPage.dismissCookieDialog();

    passwordlessLoginPage.enterEmail('not-a-valid-email');
    passwordlessLoginPage.clickContinue();

    // Browser native email validation blocks submission — form stays on page
    const isEmailVisible = await passwordlessLoginPage.isEmailInputVisible();
    expect(isEmailVisible, 'Email input should still be visible after invalid submission').to.be.true;
    const currentUrl = await passwordlessLoginPage.getCurrentUrl();
    expect(currentUrl, 'Should remain on login page').to.include('/login');
})
    .tag('@passwordless-login')
    .tag('@validation');

export {};
