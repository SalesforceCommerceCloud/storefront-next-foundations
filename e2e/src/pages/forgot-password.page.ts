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
 * Forgot Password Page Object
 * Handles interactions with the forgot password / reset password page
 */
class ForgotPasswordPage {
    // Locators for forgot password page elements
    locators = {
        // Headings
        resetPasswordHeading: locate('h1, h2').withText('Reset Password').as('Reset Password Heading'),
        checkEmailHeading: locate('h1, h2').withText('Check Your Email').as('Check Email Heading'),

        // Form elements
        emailInput: locate('input[type="email"]').as('Email Input'),
        emailInputByName: locate('input[name*="email"]').as('Email Input by Name'),
        emailInputByLabel: locate('input[aria-label*="email" i], input[aria-label*="Email"]').as(
            'Email Input by Aria Label'
        ),

        submitButton: locate('button[type="submit"]').as('Submit Button'),
        submitButtonByText: locate(
            'button:has-text("Submit"), button:has-text("Reset Password"), button:has-text("Send")'
        ).as('Submit Button by Text'),

        // Messages
        successMessage: locate('[data-testid*="success"], .success, [role="alert"]').as('Success Message'),
        errorMessage: locate('[data-testid*="error"], .error, [role="alert"]').as('Error Message'),
    };

    /**
     * Navigate to the forgot password page
     * @param baseUrl - Base URL of the storefront (defaults to environment BASE_URL)
     */
    navigate(baseUrl?: string): void {
        const targetUrl = baseUrl || process.env.BASE_URL || 'http://localhost:5173';
        I.amOnPage(new URL(buildSitePath('/forgot-password'), targetUrl).toString());
    }

    /**
     * Verify "Reset Password" heading is displayed
     */
    validateResetPasswordHeading(): void {
        I.seeElement(this.locators.resetPasswordHeading);
    }

    /**
     * Enter email address in the email input field
     * @param email - Email address to enter
     */
    enterEmail(email: string): void {
        I.fillField(this.locators.emailInput, email);
    }

    /**
     * Submit the forgot password form
     */
    submitForm(): void {
        I.click(this.locators.submitButton);
    }

    /**
     * Verify "Check your email" heading is displayed after form submission
     */
    validateCheckEmailHeading(): void {
        I.seeElement(this.locators.checkEmailHeading);
    }
}

// Export as singleton following CodeceptJS pattern
const forgotPasswordPageInstance = new ForgotPasswordPage();
export = forgotPasswordPageInstance;
