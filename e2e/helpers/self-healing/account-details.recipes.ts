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
 * Recipes for account details page (/account):
 * Personal information editing, password management,
 * interests & preferences, and marketing consent.
 */

import type { HealingRecipe } from './types';

// ─── Page Elements ────────────────────────────────────────────────────────────

/**
 * Page Title - "My Account Details" heading
 * Primary: h1 with text "My Account Details"
 */
export const pageTitleRecipe: HealingRecipe = {
    name: 'pageTitle',
    description: 'Main heading "My Account Details" on account page',
    selectors: [
        'h1:has-text("My Account Details")', // Primary - specific text
        'h1:has-text("Account Details")', // Shorter variant
        'h1:has-text("My Account")', // Even shorter
        'h1[class*="text-2xl"]', // Tailwind large heading
        'main h1', // First h1 in main content
        '[role="main"] h1', // Semantic main area
    ],
    context: 'Main page heading at top of account details page',
    fallbackStrategy: 'Look for h1 with account-related text or first h1 in main content area',
};

// ─── Profile Card Elements ────────────────────────────────────────────────────

/**
 * Profile Card - Toggle card container for personal information
 * Primary: [data-testid="sf-toggle-card-profile"]
 */
export const profileCardRecipe: HealingRecipe = {
    name: 'profileCard',
    description: 'Profile information toggle card container',
    selectors: [
        '[data-testid="sf-toggle-card-profile"]', // Primary - data-testid
        '[data-testid*="profile"]', // Contains profile
        '[id*="profile"]', // ID contains profile
        'section:has-text("Personal Information")', // Section with title
        '[class*="toggle-card"]:has(h2:has-text("Personal Information"))', // Card with specific heading
    ],
    context: 'Toggle card container for viewing/editing personal information',
    fallbackStrategy: 'Look for section or card with Personal Information heading or profile in testid/id',
};

/**
 * Profile Edit Button - Opens profile editing form
 * Primary: Button with text "Edit" in profile card
 */
export const profileEditButtonRecipe: HealingRecipe = {
    name: 'profileEditButton',
    description: 'Edit button to open profile editing form',
    selectors: [
        '[data-testid="sf-toggle-card-profile"] button:has-text("Edit")', // Primary - button in profile card
        'button:has-text("Edit"):has-text("Profile")', // Edit with Profile text
        'button[aria-label*="edit profile" i]', // Accessibility label
        '[data-testid*="edit-profile"]', // Test ID
        '[data-testid="sf-toggle-card-profile"] button[variant="outline"]', // Outlined button in card
    ],
    context: 'Button in profile card to enable editing mode',
    fallbackStrategy: 'Look for Edit button within profile card section',
};

/**
 * Profile Form - Customer profile editing form
 * Primary: [data-testid="customer-profile-form"]
 */
export const profileFormRecipe: HealingRecipe = {
    name: 'profileForm',
    description: 'Form for editing customer profile information',
    selectors: [
        '[data-testid="customer-profile-form"]', // Primary - data-testid
        'form[data-testid*="profile"]', // Form with profile testid
        '[data-testid="sf-toggle-card-profile"] form', // Form within profile card
        'form:has(input[name="firstName"])', // Form containing firstName field
    ],
    context: 'Profile editing form with personal information fields',
    fallbackStrategy: 'Look for form with profile testid or form containing firstName field',
};

// ─── Profile Form Fields ──────────────────────────────────────────────────────

/**
 * First Name Field - Profile form input
 * Primary: input[name="firstName"]
 */
export const firstNameFieldRecipe: HealingRecipe = {
    name: 'firstNameField',
    description: 'First name input field in profile form',
    selectors: [
        'input[name="firstName"]', // Primary - name attribute
        'input[id="firstName"]', // ID attribute
        '#firstName', // Short ID
        'input[placeholder*="first name" i]', // Placeholder text
        'input[aria-label*="first name" i]', // Accessibility label
        '[data-testid*="first-name"]', // Test ID
        '[data-testid="customer-profile-form"] input:first-of-type', // First input in form
    ],
    context: 'First name text input in profile editing form',
    fallbackStrategy: 'Look for input with firstName name/id or first name in label/placeholder',
};

/**
 * Last Name Field - Profile form input
 * Primary: input[name="lastName"]
 */
export const lastNameFieldRecipe: HealingRecipe = {
    name: 'lastNameField',
    description: 'Last name input field in profile form',
    selectors: [
        'input[name="lastName"]', // Primary - name attribute
        'input[id="lastName"]', // ID attribute
        '#lastName', // Short ID
        'input[placeholder*="last name" i]', // Placeholder text
        'input[aria-label*="last name" i]', // Accessibility label
        '[data-testid*="last-name"]', // Test ID
    ],
    context: 'Last name text input in profile editing form',
    fallbackStrategy: 'Look for input with lastName name/id or last name in label/placeholder',
};

/**
 * Email Field - Profile form input
 * Primary: input[name="email"]
 */
export const emailFieldRecipe: HealingRecipe = {
    name: 'emailField',
    description: 'Email address input field in profile form',
    selectors: [
        'input[name="email"]', // Primary - name attribute
        'input[type="email"]', // Email type
        'input[id="email"]', // ID attribute
        'input[placeholder*="email" i]', // Placeholder text
        'input[aria-label*="email" i]', // Accessibility label
        '[data-testid*="email"]', // Test ID
        'input[autocomplete="email"]', // Autocomplete attribute
    ],
    context: 'Email address input in profile editing form',
    fallbackStrategy: 'Look for input with type email or email in name/id/label',
};

/**
 * Phone Field - Profile form input
 * Primary: input[name="phone"]
 */
export const phoneFieldRecipe: HealingRecipe = {
    name: 'phoneField',
    description: 'Phone number input field in profile form',
    selectors: [
        'input[name="phone"]', // Primary - name attribute
        'input[type="tel"]', // Tel type
        'input[id="phone"]', // ID attribute
        'input[placeholder*="phone" i]', // Placeholder text
        'input[aria-label*="phone" i]', // Accessibility label
        '[data-testid*="phone"]', // Test ID
        'input[autocomplete="tel"]', // Autocomplete attribute
    ],
    context: 'Phone number input in profile editing form',
    fallbackStrategy: 'Look for input with type tel or phone in name/id/label',
};

/**
 * Gender Select - Profile form dropdown
 * Primary: select[name="gender"]
 */
export const genderSelectRecipe: HealingRecipe = {
    name: 'genderSelect',
    description: 'Gender selection dropdown in profile form',
    selectors: [
        'select[name="gender"]', // Primary - name attribute
        'select[id="gender"]', // ID attribute
        'select[aria-label*="gender" i]', // Accessibility label
        '[data-testid*="gender"]', // Test ID
    ],
    context: 'Gender dropdown select in profile editing form',
    fallbackStrategy: 'Look for select element with gender in name/id/label',
};

/**
 * Birthday Field - Profile form date input
 * Primary: input[name="birthday"]
 */
export const birthdayFieldRecipe: HealingRecipe = {
    name: 'birthdayField',
    description: 'Date of birth input field in profile form',
    selectors: [
        'input[name="birthday"]', // Primary - name attribute
        'input[type="date"]', // Date type
        'input[id="birthday"]', // ID attribute
        'input[placeholder*="birth" i]', // Placeholder text
        'input[aria-label*="birth" i]', // Accessibility label
        'input[aria-label*="birthday" i]', // Alternative label
        '[data-testid*="birthday"]', // Test ID
        '[data-testid*="birth-date"]', // Alternative test ID
    ],
    context: 'Date of birth input in profile editing form',
    fallbackStrategy: 'Look for date input or input with birthday/birth in name/id/label',
};

// ─── Profile Form Actions ─────────────────────────────────────────────────────

/**
 * Profile Save Button - Submits profile form
 * Primary: button[type="submit"] in profile form
 */
export const profileSaveButtonRecipe: HealingRecipe = {
    name: 'profileSaveButton',
    description: 'Save button to submit profile changes',
    selectors: [
        '[data-testid="customer-profile-form"] button[type="submit"]', // Primary - submit in form
        'button[type="submit"]:has-text("Save")', // Submit with Save text
        'button:has-text("Save"):has-text("Profile")', // Save Profile text
        '[data-testid*="save-profile"]', // Test ID
        '[data-testid="customer-profile-form"] button:has-text("Save")', // Save button in form
    ],
    context: 'Submit button to save profile form changes',
    fallbackStrategy: 'Look for submit button with Save text in profile form',
};

/**
 * Profile Cancel Button - Cancels profile editing
 * Primary: button[type="button"] with "Cancel" text in profile form
 */
export const profileCancelButtonRecipe: HealingRecipe = {
    name: 'profileCancelButton',
    description: 'Cancel button to discard profile changes',
    selectors: [
        '[data-testid="customer-profile-form"] button[type="button"]:has-text("Cancel")', // Primary - cancel in form
        'button:has-text("Cancel"):has-text("Profile")', // Cancel Profile text
        'button[type="button"]:has-text("Cancel")', // Generic cancel button
        '[data-testid*="cancel-profile"]', // Test ID
    ],
    context: 'Cancel button to exit profile editing without saving',
    fallbackStrategy: 'Look for Cancel button in profile form',
};

// ─── Email Verification Elements ─────────────────────────────────────────────

/**
 * Verify Email Button - Visible when email verification is enabled and email is unverified
 * Primary: button with text "Verify Email" in email card
 */
export const verifyEmailButtonRecipe: HealingRecipe = {
    name: 'verifyEmailButton',
    description: 'Button to trigger OTP verification flow for unverified email',
    selectors: [
        '[data-testid="sf-toggle-card-email"] button:has-text("Verify Email")',
        'button:has-text("Verify Email")',
        'button[aria-label*="verify email" i]',
        '[data-testid*="verify-email"]',
    ],
    context: 'Button in email card to start OTP-based email verification',
    fallbackStrategy: 'Look for button with "Verify Email" text within the email card',
};

/**
 * Change Email Button - Visible when email verification is enabled
 * Primary: button with text "Change email" in email card
 */
export const changeEmailButtonRecipe: HealingRecipe = {
    name: 'changeEmailButton',
    description: 'Button to initiate email address change',
    selectors: [
        '[data-testid="sf-toggle-card-email"] button:has-text("Change email")',
        'button:has-text("Change email")',
        'button:has-text("Change Email")',
        'button[aria-label*="change email" i]',
        '[data-testid*="change-email"]',
    ],
    context: 'Button in email card to open email update form or OTP flow',
    fallbackStrategy: 'Look for button with "Change email" text within the email card',
};

/**
 * Email Verified Badge - Shown when email is verified
 * Primary: [data-testid="email-verified-badge"]
 */
export const emailVerifiedBadgeRecipe: HealingRecipe = {
    name: 'emailVerifiedBadge',
    description: 'Badge indicating the email address is verified',
    selectors: ['[data-testid="email-verified-badge"]', '[data-testid*="verified-badge"]'],
    context: 'Badge in email card showing verified status',
    fallbackStrategy: 'Look for badge or span with "Verified" text near email display',
};

/**
 * Email Unverified Badge - Shown when email is not verified
 * Primary: [data-testid="email-unverified-badge"]
 */
export const emailUnverifiedBadgeRecipe: HealingRecipe = {
    name: 'emailUnverifiedBadge',
    description: 'Badge indicating the email address is not yet verified',
    selectors: ['[data-testid="email-unverified-badge"]', '[data-testid*="unverified-badge"]'],
    context: 'Badge in email card showing unverified status',
    fallbackStrategy: 'Look for badge or span with "Unverified" text near email display',
};

/**
 * OTP Modal - Dialog container for OTP code entry
 * Primary: [data-testid="otp-modal"]
 */
export const otpModalRecipe: HealingRecipe = {
    name: 'otpModal',
    description: 'Modal dialog for entering one-time password verification code',
    selectors: [
        '[data-testid="otp-modal"]',
        '[role="dialog"]:has(input[type="text"][maxlength="1"])',
        '[role="dialog"]:has-text("verification code")',
        '[role="dialog"][aria-modal="true"]',
    ],
    context: 'Modal dialog shown during email verification or passwordless email change',
    fallbackStrategy: 'Look for dialog containing single-character text inputs or verification code text',
};

/**
 * OTP Resend Code Button - Resend code button inside OTP modal
 * Primary: button with text "Resend Code" in OTP modal
 */
export const otpResendButtonRecipe: HealingRecipe = {
    name: 'otpResendButton',
    description: 'Button to resend OTP verification code',
    selectors: [
        '[data-testid="otp-modal"] button:has-text("Resend Code")',
        'button:has-text("Resend Code")',
        'button:has-text("Resend")',
        '[data-testid*="resend"]',
    ],
    context: 'Button inside OTP modal to request a new verification code',
    fallbackStrategy: 'Look for button with "Resend" text inside the OTP modal dialog',
};

/**
 * Email Update Form - Form for changing email address
 * Primary: [data-testid="email-update-form"]
 */
export const emailUpdateFormRecipe: HealingRecipe = {
    name: 'emailUpdateForm',
    description: 'Form for updating email address, may require current password',
    selectors: [
        '[data-testid="email-update-form"]',
        'form[data-testid*="email"]',
        '[data-testid="sf-toggle-card-email"] form',
        'form:has(input[name="email"]):has(button[type="submit"])',
    ],
    context: 'Email update form shown after clicking "Change email" (for password-based shoppers)',
    fallbackStrategy: 'Look for form with email input inside the email toggle card',
};

// ─── Password Card Elements ───────────────────────────────────────────────────

/**
 * Password Card - Toggle card container for password management
 * Primary: [data-testid="sf-toggle-card-password"]
 */
export const passwordCardRecipe: HealingRecipe = {
    name: 'passwordCard',
    description: 'Password management toggle card container',
    selectors: [
        '[data-testid="sf-toggle-card-password"]', // Primary - data-testid
        '[data-testid*="password"]', // Contains password
        'section:has-text("Password & Security")', // Section with title
        '[class*="toggle-card"]:has(h2:has-text("Password"))', // Card with Password heading
    ],
    context: 'Toggle card container for password management',
    fallbackStrategy: 'Look for section with Password heading or password in testid',
};

/**
 * Change Password Button - Opens password form
 * Primary: button with text "Change password"
 */
export const changePasswordButtonRecipe: HealingRecipe = {
    name: 'changePasswordButton',
    description: 'Button to open password change form',
    selectors: [
        'button:has-text("Change password")', // Primary - specific text (lowercase 'p')
        'button:has-text("Change Password")', // Alternative text (uppercase 'P')
        'button:has-text("Update Password")', // Alternative text
        'button[aria-label*="change password" i]', // Accessibility label
        '[data-testid*="change-password"]', // Test ID
        '[data-testid="sf-toggle-card-password"] button', // Button in password card
    ],
    context: 'Button to enable password editing mode',
    fallbackStrategy: 'Look for button with change/update password text',
};

/**
 * Password Form - Password update form
 * Primary: [data-testid="password-update-form"]
 */
export const passwordFormRecipe: HealingRecipe = {
    name: 'passwordForm',
    description: 'Form for changing password',
    selectors: [
        '[data-testid="password-update-form"]', // Primary - data-testid
        'form[data-testid*="password"]', // Form with password testid
        '[data-testid="sf-toggle-card-password"] form', // Form within password card
        'form:has(input[name="currentPassword"])', // Form with currentPassword field
    ],
    context: 'Password change form with current and new password fields',
    fallbackStrategy: 'Look for form with password testid or form containing currentPassword field',
};

// ─── Password Form Fields ─────────────────────────────────────────────────────

/**
 * Current Password Field - Password form input
 * Primary: input[name="currentPassword"]
 */
export const currentPasswordFieldRecipe: HealingRecipe = {
    name: 'currentPasswordField',
    description: 'Current password input in password change form',
    selectors: [
        'input[name="currentPassword"]', // Primary - name attribute
        'input[type="password"][name*="current" i]', // Password with current in name
        'input[id="currentPassword"]', // ID attribute
        'input[placeholder*="current password" i]', // Placeholder text
        'input[aria-label*="current password" i]', // Accessibility label
        '[data-testid*="current-password"]', // Test ID
        'input[autocomplete="current-password"]', // Autocomplete attribute
    ],
    context: 'Current password field in password change form',
    fallbackStrategy: 'Look for password input with current in name/id/label',
};

/**
 * New Password Field - Password form input
 * Primary: input[name="password"]
 */
export const newPasswordFieldRecipe: HealingRecipe = {
    name: 'newPasswordField',
    description: 'New password input in password change form',
    selectors: [
        'input[name="password"]:not([name*="current"]):not([name*="confirm"])', // Primary - password but not current/confirm
        'input[type="password"][name="password"]', // Type and name
        'input[id="password"]', // ID attribute
        'input[placeholder*="new password" i]', // Placeholder text
        'input[aria-label*="new password" i]', // Accessibility label
        '[data-testid*="new-password"]', // Test ID
        'input[autocomplete="new-password"]', // Autocomplete attribute
    ],
    context: 'New password field in password change form',
    fallbackStrategy: 'Look for password input with new in label or named password (not current/confirm)',
};

/**
 * Confirm Password Field - Password form input
 * Primary: input[name="confirmPassword"]
 */
export const confirmPasswordFieldRecipe: HealingRecipe = {
    name: 'confirmPasswordField',
    description: 'Confirm new password input in password change form',
    selectors: [
        'input[name="confirmPassword"]', // Primary - name attribute
        'input[type="password"][name*="confirm" i]', // Password with confirm in name
        'input[id="confirmPassword"]', // ID attribute
        'input[placeholder*="confirm password" i]', // Placeholder text
        'input[aria-label*="confirm password" i]', // Accessibility label
        '[data-testid*="confirm-password"]', // Test ID
    ],
    context: 'Confirm password field in password change form',
    fallbackStrategy: 'Look for password input with confirm in name/id/label',
};

// ─── Password Form Actions ────────────────────────────────────────────────────

/**
 * Password Save Button - Submits password form
 * Primary: button[type="submit"] in password form
 */
export const passwordSaveButtonRecipe: HealingRecipe = {
    name: 'passwordSaveButton',
    description: 'Save button to submit password change',
    selectors: [
        '[data-testid="password-update-form"] button[type="submit"]', // Primary - submit in form
        'button[type="submit"]:has-text("Save"):has-text("Password")', // Save Password text
        'button[type="submit"]:has-text("Update")', // Update button
        '[data-testid*="save-password"]', // Test ID
        '[data-testid="password-update-form"] button:has-text("Save")', // Save button in form
    ],
    context: 'Submit button to save password changes',
    fallbackStrategy: 'Look for submit button with Save/Update text in password form',
};

/**
 * Password Cancel Button - Cancels password editing
 * Primary: button[type="button"] with "Cancel" text in password form
 */
export const passwordCancelButtonRecipe: HealingRecipe = {
    name: 'passwordCancelButton',
    description: 'Cancel button to discard password changes',
    selectors: [
        '[data-testid="password-update-form"] button[type="button"]:has-text("Cancel")', // Primary - cancel in form
        'button:has-text("Cancel"):has-text("Password")', // Cancel Password text
        '[data-testid*="cancel-password"]', // Test ID
    ],
    context: 'Cancel button to exit password editing without saving',
    fallbackStrategy: 'Look for Cancel button in password form',
};

// ─── Password Requirements Indicators ─────────────────────────────────────────

/**
 * Password Check Icon - Requirement met indicator
 * Primary: [data-testid="check-icon"]
 */
export const passwordCheckIconRecipe: HealingRecipe = {
    name: 'passwordCheckIcon',
    description: 'Green checkmark indicating password requirement is met',
    selectors: [
        '[data-testid="check-icon"]', // Primary - data-testid
        'svg[data-testid="check-icon"]', // SVG with testid
        '[class*="check"][class*="icon"]', // Class with check and icon
        'svg[class*="text-green"]', // Green colored SVG
    ],
    context: 'Checkmark icon showing password requirement satisfied',
    fallbackStrategy: 'Look for check icon with testid or green colored icon',
};

/**
 * Password X Icon - Requirement not met indicator
 * Primary: [data-testid="x-icon"]
 */
export const passwordXIconRecipe: HealingRecipe = {
    name: 'passwordXIcon',
    description: 'Red X indicating password requirement is not met',
    selectors: [
        '[data-testid="x-icon"]', // Primary - data-testid
        'svg[data-testid="x-icon"]', // SVG with testid
        '[class*="x"][class*="icon"]', // Class with x and icon
        'svg[class*="text-red"]', // Red colored SVG
    ],
    context: 'X icon showing password requirement not satisfied',
    fallbackStrategy: 'Look for x icon with testid or red colored icon',
};

// ─── Notifications ────────────────────────────────────────────────────────────

/**
 * Success Toast - Success notification
 * Primary: [data-sonner-toast][data-type="success"]
 */
export const successToastRecipe: HealingRecipe = {
    name: 'successToast',
    description: 'Success toast notification',
    selectors: [
        '[data-sonner-toast][data-type="success"]', // Primary - Sonner toast library
        '[data-sonner-toast][data-type=success]', // Without quotes variant
        '[role="status"]', // ARIA status role fallback
        '[data-testid*="toast"][data-testid*="success"]', // Toast with success
        '[class*="toast"][class*="success"]', // Toast success class
        '.toast-success', // Common class
    ],
    context: 'Toast notification showing success message',
    fallbackStrategy: 'Look for Sonner toast with success type or element with status role',
};

/**
 * Error Toast - Error notification
 * Primary: [data-sonner-toast][data-type="error"]
 */
export const errorToastRecipe: HealingRecipe = {
    name: 'errorToast',
    description: 'Error toast notification',
    selectors: [
        '[data-sonner-toast][data-type="error"]', // Primary - Sonner toast library
        '[data-sonner-toast][data-type=error]', // Without quotes variant
        '[role="alert"]', // ARIA alert role fallback
        '[data-testid*="toast"][data-testid*="error"]', // Toast with error
        '[class*="toast"][class*="error"]', // Toast error class
        '.toast-error', // Common class
    ],
    context: 'Toast notification showing error message',
    fallbackStrategy: 'Look for Sonner toast with error type or element with alert role',
};

/**
 * Form Error - Inline form error message
 * Primary: .text-destructive
 */
export const formErrorRecipe: HealingRecipe = {
    name: 'formError',
    description: 'Inline form validation error message',
    selectors: [
        '.text-destructive', // Primary - Tailwind destructive color
        '[class*="error-message"]', // Error message class
        '[role="alert"]', // ARIA alert
        '.form-error', // Common class
        '[class*="text-red"]', // Red text color
    ],
    context: 'Inline error message below form fields',
    fallbackStrategy: 'Look for destructive/error colored text or alert role',
};

// Export all recipes
export const accountDetailsRecipes: HealingRecipe[] = [
    // Page elements
    pageTitleRecipe,
    // Profile card
    profileCardRecipe,
    profileEditButtonRecipe,
    profileFormRecipe,
    // Profile fields
    firstNameFieldRecipe,
    lastNameFieldRecipe,
    emailFieldRecipe,
    phoneFieldRecipe,
    genderSelectRecipe,
    birthdayFieldRecipe,
    // Profile actions
    profileSaveButtonRecipe,
    profileCancelButtonRecipe,
    // Email verification
    verifyEmailButtonRecipe,
    changeEmailButtonRecipe,
    emailVerifiedBadgeRecipe,
    emailUnverifiedBadgeRecipe,
    otpModalRecipe,
    otpResendButtonRecipe,
    emailUpdateFormRecipe,
    // Password card
    passwordCardRecipe,
    changePasswordButtonRecipe,
    passwordFormRecipe,
    // Password fields
    currentPasswordFieldRecipe,
    newPasswordFieldRecipe,
    confirmPasswordFieldRecipe,
    // Password actions
    passwordSaveButtonRecipe,
    passwordCancelButtonRecipe,
    // Password indicators
    passwordCheckIconRecipe,
    passwordXIconRecipe,
    // Notifications
    successToastRecipe,
    errorToastRecipe,
    formErrorRecipe,
];
