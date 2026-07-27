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

import type { HealingRecipe } from './types';

/**
 * First Name Input - Signup form field
 * Primary: #firstName
 */
export const firstNameInputRecipe: HealingRecipe = {
    name: 'firstNameInput',
    description: 'First name input field on signup form',
    selectors: [
        '#firstName', // Primary - AI-discovered ID selector
        'input[name="firstName"]', // Name attribute
        'input[id="firstName"]', // Explicit ID
        'input[placeholder*="first name" i]', // Placeholder text
        'input[aria-label*="first name" i]', // Accessibility label
        '[data-testid*="first-name"]', // Test ID if added
        'form input[type="text"]', // Generic text input in form (lowest priority)
    ],
    context: 'First name input field on signup/registration form',
    fallbackStrategy: 'Look for input with firstName name/id or first name in label/placeholder',
};

/**
 * Last Name Input - Signup form field
 * Primary: #lastName
 */
export const lastNameInputRecipe: HealingRecipe = {
    name: 'lastNameInput',
    description: 'Last name input field on signup form',
    selectors: [
        '#lastName', // Primary - AI-discovered ID selector
        'input[name="lastName"]', // Name attribute
        'input[id="lastName"]', // Explicit ID
        'input[placeholder*="last name" i]', // Placeholder text
        'input[aria-label*="last name" i]', // Accessibility label
        '[data-testid*="last-name"]', // Test ID if added
    ],
    context: 'Last name input field on signup/registration form',
    fallbackStrategy: 'Look for input with lastName name/id or last name in label/placeholder',
};

/**
 * Email Input - Signup form field
 * Primary: #email
 */
export const emailInputRecipe: HealingRecipe = {
    name: 'emailInput',
    description: 'Email input field on signup form',
    selectors: [
        '#email', // Primary - AI-discovered ID selector
        'input[type="email"]', // Semantic HTML input type
        'input[name="email"]', // Name attribute
        'input[id="email"]', // Explicit ID
        'input[placeholder*="email" i]', // Placeholder text
        'input[aria-label*="email" i]', // Accessibility label
        '[data-testid*="email"]', // Test ID if added
        'input[autocomplete="email"]', // Autocomplete attribute
    ],
    context: 'Email address input field on signup/registration form',
    fallbackStrategy: 'Look for input with type="email" or email in name/id/label',
};

/**
 * Password Input - Signup form field
 * Primary: #password
 */
export const passwordInputRecipe: HealingRecipe = {
    name: 'passwordInput',
    description: 'Password input field on signup form',
    selectors: [
        '#password', // Primary - AI-discovered ID selector
        'input[type="password"][name="password"]', // Type + name
        'input[id="password"]', // Explicit ID
        'input[type="password"]:not([id*="confirm"])', // Password but not confirm
        'input[placeholder*="password" i]:not([placeholder*="confirm" i])', // Placeholder but not confirm
        'input[aria-label*="password" i]:not([aria-label*="confirm" i])', // Label but not confirm
        '[data-testid*="password"]:not([data-testid*="confirm"])', // Test ID but not confirm
    ],
    context: 'Password input field on signup form (not confirm password)',
    fallbackStrategy: 'Look for password type input without confirm in name/id/label',
};

/**
 * Confirm Password Input - Signup form field
 * Primary: #confirmPassword
 */
export const confirmPasswordInputRecipe: HealingRecipe = {
    name: 'confirmPasswordInput',
    description: 'Confirm password input field on signup form',
    selectors: [
        '#confirmPassword', // Primary - AI-discovered ID selector
        'input[type="password"][name="confirmPassword"]', // Type + name
        'input[id="confirmPassword"]', // Explicit ID
        'input[type="password"][name*="confirm" i]', // Password with confirm in name
        'input[type="password"][id*="confirm" i]', // Password with confirm in ID
        'input[placeholder*="confirm" i][placeholder*="password" i]', // Confirm password in placeholder
        'input[aria-label*="confirm" i][aria-label*="password" i]', // Confirm password in label
        '[data-testid*="confirm-password"]', // Test ID
    ],
    context: 'Confirm/repeat password input field on signup form',
    fallbackStrategy: 'Look for password type input with confirm in name/id/label',
};

/**
 * Create Account Button - Signup form submit
 * Primary: button[type="submit"]
 */
export const createAccountButtonRecipe: HealingRecipe = {
    name: 'createAccountButton',
    description: 'Create Account/Submit button on signup form',
    selectors: [
        'button[type="submit"]', // Primary - form submit button
        'button:has-text("Create Account")', // Text content
        'button:has-text("Sign Up")', // Alternative text
        'button:has-text("Register")', // Alternative text
        '[data-testid*="create-account"]', // Test ID
        '[data-testid*="submit"]', // Submit test ID
        'form button[type="button"]', // Form button (fallback)
    ],
    context: 'Submit button on signup form to create account',
    fallbackStrategy: 'Look for submit button or button with create/signup/register text',
};

/**
 * Sign In Link - Link to login page from signup
 * Primary: a:has-text("Sign in")
 */
export const signInLinkRecipe: HealingRecipe = {
    name: 'signInLink',
    description: 'Link to navigate from signup to login page',
    selectors: [
        'a:has-text("Sign in")', // Primary - AI-discovered text
        'a:has-text("Sign In")', // Capitalization variant
        'a:has-text("Log in")', // Alternative text
        'a:has-text("Login")', // Alternative text
        'a[href*="/login"]', // Login URL
        'a[href*="/signin"]', // Signin URL
        '[data-testid*="signin-link"]', // Test ID
        '[data-testid*="login-link"]', // Test ID
    ],
    context: 'Link on signup page to navigate to login page',
    fallbackStrategy: 'Look for link with signin/login text or URL',
};

/**
 * Tracking Consent Banner - Cookie consent dialog
 * Primary: div[role="dialog"]
 */
export const trackingConsentBannerRecipe: HealingRecipe = {
    name: 'trackingConsentBanner',
    description: 'Tracking/cookie consent banner dialog',
    selectors: [
        'div[role="dialog"]', // Primary - ARIA dialog role
        '[role="dialog"][aria-label*="consent" i]', // Dialog with consent in label
        '[role="dialog"][aria-label*="cookie" i]', // Dialog with cookie in label
        '[data-testid*="consent"]', // Consent test ID
        '[data-testid*="tracking"]', // Tracking test ID
        '.consent-banner', // Common class
        '[class*="cookie-banner"]', // Cookie banner class
    ],
    context: 'Cookie/tracking consent banner that may appear on signup',
    fallbackStrategy: 'Look for dialog role or consent/cookie related attributes',
};

/**
 * Accept Tracking Button - Consent banner action
 * Primary: button:has-text("Accept")
 */
export const acceptTrackingButtonRecipe: HealingRecipe = {
    name: 'acceptTrackingButton',
    description: 'Accept button on tracking consent banner',
    selectors: [
        'button:has-text("Accept")', // Primary - text content
        'button:has-text("Accept All")', // Full text variant
        'button[aria-label*="accept" i]', // Accessibility label
        '[data-testid*="accept"]', // Test ID
        '[role="dialog"] button:first-of-type', // First button in dialog
    ],
    context: 'Accept button on tracking/cookie consent banner',
    fallbackStrategy: 'Look for button with accept text in consent dialog',
};

/**
 * Decline Tracking Button - Consent banner action
 * Primary: button:has-text("Decline")
 */
export const declineTrackingButtonRecipe: HealingRecipe = {
    name: 'declineTrackingButton',
    description: 'Decline button on tracking consent banner',
    selectors: [
        'button:has-text("Decline")', // Primary - text content
        'button:has-text("Decline All")', // Full text variant
        'button:has-text("Reject")', // Alternative text
        'button[aria-label*="decline" i]', // Accessibility label
        'button[aria-label*="reject" i]', // Alternative label
        '[data-testid*="decline"]', // Test ID
        '[data-testid*="reject"]', // Alternative test ID
        '[role="dialog"] button:last-of-type', // Last button in dialog
    ],
    context: 'Decline/reject button on tracking/cookie consent banner',
    fallbackStrategy: 'Look for button with decline/reject text in consent dialog',
};
