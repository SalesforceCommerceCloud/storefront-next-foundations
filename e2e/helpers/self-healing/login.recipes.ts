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
 * Email Input (Login Page) - Login form field
 * Primary: input#email
 */
export const emailInputLoginRecipe: HealingRecipe = {
    name: 'emailInput',
    description: 'Email input field on login form',
    selectors: [
        'input#email', // Primary - user-provided ID selector
        'input[type="email"]', // Semantic HTML input type
        'input[name="email"]', // Name attribute
        'input[id="email"]', // Explicit ID
        'input[placeholder*="email" i]', // Placeholder text
        'input[aria-label*="email" i]', // Accessibility label
        '[data-testid*="email"]', // Test ID if added
        'input[autocomplete="email"]', // Autocomplete attribute
        'form input[type="text"]', // Generic text input in form (lowest priority)
    ],
    context: 'Email address input field on login/signin form',
    fallbackStrategy: 'Look for input with type="email" or email in name/id/label',
};

/**
 * Password Input (Login Page) - Login form field
 * Primary: input#password
 */
export const passwordInputLoginRecipe: HealingRecipe = {
    name: 'passwordInput',
    description: 'Password input field on login form',
    selectors: [
        'input#password', // Primary - user-provided ID selector
        'input[type="password"][name="password"]', // Type + name
        'input[id="password"]', // Explicit ID
        'input[type="password"]', // Password type (generic)
        'input[placeholder*="password" i]', // Placeholder text
        'input[aria-label*="password" i]', // Accessibility label
        '[data-testid*="password"]', // Test ID if added
        'input[autocomplete="current-password"]', // Autocomplete attribute
    ],
    context: 'Password input field on login form',
    fallbackStrategy: 'Look for password type input with password in name/id/label',
};

/**
 * Sign In Button - Login form submit
 * Primary: button:has-text("Sign In")
 */
export const signInButtonRecipe: HealingRecipe = {
    name: 'signInButton',
    description: 'Sign In/Submit button on login form',
    selectors: [
        'button:has-text("Sign In")', // Primary - user-provided text
        'button:has-text("Sign in")', // Lowercase variant
        'button:has-text("Login")', // Alternative text
        'button:has-text("Log In")', // Alternative text with space
        'button[type="submit"]', // Form submit button
        '[data-testid*="signin"]', // Test ID
        '[data-testid*="login"]', // Alternative test ID
        'form button[type="button"]', // Form button (fallback)
    ],
    context: 'Submit button on login form to authenticate',
    fallbackStrategy: 'Look for submit button or button with signin/login text',
};

/**
 * Forgot Password Link - Password reset link
 * Primary: a:has-text("Forgot your password?")
 */
export const forgotPasswordLinkRecipe: HealingRecipe = {
    name: 'forgotPasswordLink',
    description: 'Link to password reset page from login',
    selectors: [
        'a:has-text("Forgot your password?")', // Primary - user-provided text
        'a:has-text("Forgot password")', // Short variant
        'a:has-text("Forgot Password?")', // Capitalized variant
        'a:has-text("Reset password")', // Alternative text
        'a[href*="/forgot-password"]', // Password reset URL
        'a[href*="/reset-password"]', // Alternative URL
        '[data-testid*="forgot-password"]', // Test ID
    ],
    context: 'Link on login page to navigate to password reset',
    fallbackStrategy: 'Look for link with forgot/reset password text or URL',
};

/**
 * Sign Up Link (Login Page) - Link to registration page
 * Primary: a:has-text("Sign up")
 */
export const signUpLinkLoginRecipe: HealingRecipe = {
    name: 'signUpLink',
    description: 'Link to navigate from login to signup page',
    selectors: [
        'a:has-text("Sign up")', // Primary - user-provided text
        'a:has-text("Sign Up")', // Capitalized variant
        'a:has-text("Create account")', // Alternative text
        'a:has-text("Register")', // Alternative text
        'a[href*="/signup"]', // Signup URL
        'a[href*="/register"]', // Registration URL
        '[data-testid*="signup-link"]', // Test ID
        '[data-testid*="register-link"]', // Alternative test ID
    ],
    context: 'Link on login page to navigate to registration/signup page',
    fallbackStrategy: 'Look for link with signup/register/create account text or URL',
};

/**
 * Continue with Apple Button - Social login (not tested, included for completeness)
 * Primary: button:has-text("Continue with Apple")
 */
export const continueWithAppleButtonRecipe: HealingRecipe = {
    name: 'continueWithAppleButton',
    description: 'Continue with Apple social login button',
    selectors: [
        'button:has-text("Continue with Apple")', // Primary - user-provided text
        'button:has-text("Sign in with Apple")', // Alternative text
        'button[aria-label*="apple" i]', // Accessibility label
        '[data-testid*="apple"]', // Test ID
        'button[class*="apple"]', // Class contains apple
    ],
    context: 'Social login button for Apple authentication on login page',
    fallbackStrategy: 'Look for button with Apple-related text or attributes',
};

/**
 * Continue with Google Button - Social login (not tested, included for completeness)
 * Primary: button:has-text("Continue with Google")
 */
export const continueWithGoogleButtonRecipe: HealingRecipe = {
    name: 'continueWithGoogleButton',
    description: 'Continue with Google social login button',
    selectors: [
        'button:has-text("Continue with Google")', // Primary - user-provided text
        'button:has-text("Sign in with Google")', // Alternative text
        'button[aria-label*="google" i]', // Accessibility label
        '[data-testid*="google"]', // Test ID
        'button[class*="google"]', // Class contains google
    ],
    context: 'Social login button for Google authentication on login page',
    fallbackStrategy: 'Look for button with Google-related text or attributes',
};
