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
 * Recipes for account addresses page (/account/addresses):
 * Address list display, add/edit/remove addresses,
 * set default address, and address form validation.
 */

import type { HealingRecipe } from './types';

/**
 * Page Title - "Addresses" heading
 * Primary: h1:has-text("Addresses")
 */
export const addressesPageTitleRecipe: HealingRecipe = {
    name: 'pageTitle',
    description: 'Main page title "Addresses"',
    selectors: [
        'h1:has-text("Addresses")',
        '[role="heading"]:has-text("Addresses")',
        'h2:has-text("Addresses")',
        '[data-testid*="page-title"]',
        '[class*="page-title"]',
    ],
    context: 'Main heading on account addresses page',
    fallbackStrategy: 'Look for heading element with "Addresses" text',
};

/**
 * Add New Address Button - Primary CTA to add address
 * Primary: button:has-text("Add new address")
 */
export const addNewAddressButtonRecipe: HealingRecipe = {
    name: 'addNewAddressButton',
    description: 'Button to add new address',
    selectors: [
        'button:has-text("Add new address")',
        'button:has-text("Add New Address")',
        'button[aria-label*="Add" i][aria-label*="Address" i]',
        '[data-testid*="add-address"]',
        'button:has-text("Add Address")',
        'button:has-text("New Address")',
    ],
    context: 'Primary button in page header to open add address dialog',
    fallbackStrategy: 'Look for button with "Add" and "Address" in text or aria-label',
};

/**
 * Empty State Message - No addresses message
 * Primary: :has-text("No Saved Addresses")
 */
export const emptyStateMessageRecipe: HealingRecipe = {
    name: 'emptyStateMessage',
    description: 'Empty state message when no addresses exist',
    selectors: [
        ':has-text("No Saved Addresses")',
        ':has-text("No addresses")',
        '[data-testid*="empty-state"]',
        '[class*="empty-state"]',
    ],
    context: 'Message displayed when user has no saved addresses',
    fallbackStrategy: 'Look for text indicating no addresses exist',
};

/**
 * Address Cards - Individual address cards
 * Primary: [data-slot="card"]:has([data-slot="card-title"])
 */
export const addressCardsRecipe: HealingRecipe = {
    name: 'addressCards',
    description: 'Individual address cards in list',
    selectors: [
        '[data-slot="card"]:has([data-slot="card-title"])',
        '[data-slot="card"]',
        '[data-testid*="address-card"]',
        '[class*="address-card"]',
        'article',
        '[role="article"]',
    ],
    context: 'Individual address cards displaying saved addresses (not empty state card)',
    fallbackStrategy: 'Look for card elements containing card-title, or articles with address information',
};

/**
 * Default Badge - Badge indicating default address
 * Primary: [data-slot="badge"]:has-text("Default")
 */
export const defaultBadgeRecipe: HealingRecipe = {
    name: 'defaultBadge',
    description: 'Badge indicating default/preferred address',
    selectors: [
        '[data-slot="badge"]:has-text("Default")',
        '[data-testid*="default-badge"]',
        ':has-text("Default")',
        '[aria-label*="Default" i]',
    ],
    context: 'Badge displayed on default address card',
    fallbackStrategy: 'Look for badge or text containing "Default"',
};

/**
 * Edit Address Button - Edit button on address card
 * Primary: button:has-text("Edit Address")
 */
export const editAddressButtonRecipe: HealingRecipe = {
    name: 'editAddressButton',
    description: 'Button to edit address',
    selectors: [
        'button:has-text("Edit Address")',
        'button[aria-label*="Edit Address"]',
        'button:has-text("Edit")',
        '[data-testid*="edit-address"]',
        'button[aria-label*="Edit" i]',
    ],
    context: 'Edit button on address card',
    fallbackStrategy: 'Look for button with "Edit" in text or aria-label within address card',
};

/**
 * Remove Address Button - Remove button on address card
 * Primary: button:has-text("Remove")
 */
export const removeAddressButtonRecipe: HealingRecipe = {
    name: 'removeAddressButton',
    description: 'Button to remove address',
    selectors: [
        'button:has-text("Remove")',
        'button[aria-label*="Remove" i]',
        '[data-testid*="remove-address"]',
        'button:has-text("Delete")',
    ],
    context: 'Remove button on address card',
    fallbackStrategy: 'Look for button with "Remove" or "Delete" in text',
};

/**
 * Set Default Button - Button to set address as default
 * Primary: button:has-text("Set Default")
 */
export const setDefaultButtonRecipe: HealingRecipe = {
    name: 'setDefaultButton',
    description: 'Button to set address as default',
    selectors: [
        'button:has-text("Set Default")',
        'button[aria-label*="Set Default" i]',
        '[data-testid*="set-default"]',
        'button:has-text("Make Default")',
    ],
    context: 'Button on address card to set as default/preferred',
    fallbackStrategy: 'Look for button with "Set Default" or "Make Default" text',
};

/**
 * Address Dialog - Add/Edit address dialog
 * Primary: [role="dialog"]
 */
export const addressDialogRecipe: HealingRecipe = {
    name: 'addressDialog',
    description: 'Add/Edit address dialog',
    selectors: ['[role="dialog"]', '[data-slot="dialog"]', '[data-testid*="address-dialog"]', '[class*="dialog"]'],
    context: 'Modal dialog for adding or editing addresses',
    fallbackStrategy: 'Look for dialog or modal element',
};

/**
 * Dialog Title - Add/Edit dialog title
 * Primary: [data-slot="dialog-title"]
 */
export const dialogTitleRecipe: HealingRecipe = {
    name: 'dialogTitle',
    description: 'Dialog title (Add New Address or Edit Address)',
    selectors: [
        '[data-slot="dialog-title"]',
        '[role="dialog"] h2',
        '[data-testid*="dialog-title"]',
        '[class*="dialog-title"]',
    ],
    context: 'Title at top of address dialog',
    fallbackStrategy: 'Look for heading within dialog element',
};

/**
 * Address ID Field - Address name/identifier input
 * Primary: input[name="addressId"]
 */
export const addressIdFieldRecipe: HealingRecipe = {
    name: 'addressIdField',
    description: 'Address ID/name input field',
    selectors: [
        'input[name="addressId"]',
        'input[id="addressId"]',
        '[data-testid*="address-id"]',
        'input[placeholder*="Address" i]',
    ],
    context: 'Input field for address name/identifier (e.g., "Home", "Work")',
    fallbackStrategy: 'Look for input with name or id containing "addressId"',
};

/**
 * First Name Field - First name input
 * Primary: input[name="firstName"]
 */
export const firstNameFieldRecipe: HealingRecipe = {
    name: 'firstNameField',
    description: 'First name input field',
    selectors: [
        'input[name="firstName"]',
        'input[id="firstName"]',
        '[data-testid*="first-name"]',
        'input[aria-label*="First Name" i]',
    ],
    context: 'First name input in address form',
    fallbackStrategy: 'Look for input with name or label containing "first name"',
};

/**
 * Last Name Field - Last name input
 * Primary: input[name="lastName"]
 */
export const lastNameFieldRecipe: HealingRecipe = {
    name: 'lastNameField',
    description: 'Last name input field',
    selectors: [
        'input[name="lastName"]',
        'input[id="lastName"]',
        '[data-testid*="last-name"]',
        'input[aria-label*="Last Name" i]',
    ],
    context: 'Last name input in address form',
    fallbackStrategy: 'Look for input with name or label containing "last name"',
};

/**
 * Phone Field - Phone number input
 * Primary: input[name="phone"]
 */
export const phoneFieldRecipe: HealingRecipe = {
    name: 'phoneField',
    description: 'Phone number input field',
    selectors: [
        'input[name="phone"]',
        'input[id="phone"]',
        '[data-testid*="phone"]',
        'input[type="tel"]',
        'input[aria-label*="Phone" i]',
    ],
    context: 'Phone number input in address form',
    fallbackStrategy: 'Look for input with type="tel" or phone-related attributes',
};

/**
 * Country Code Select - Country dropdown
 * Primary: select[name="countryCode"]
 */
export const countryCodeSelectRecipe: HealingRecipe = {
    name: 'countryCodeSelect',
    description: 'Country code select dropdown',
    selectors: [
        'select[name="countryCode"]',
        'select[id="countryCode"]',
        '[data-testid*="country"]',
        'select[aria-label*="Country" i]',
    ],
    context: 'Country selection dropdown in address form',
    fallbackStrategy: 'Look for select element with country-related attributes',
};

/**
 * Address 1 Field - Street address line 1
 * Primary: input[name="address1"]
 */
export const address1FieldRecipe: HealingRecipe = {
    name: 'address1Field',
    description: 'Address line 1 input field',
    selectors: [
        'input[name="address1"]',
        'input[id="address1"]',
        '[data-testid*="address1"]',
        'input[placeholder*="Street" i]',
        'input[aria-label*="Address" i]',
    ],
    context: 'Street address line 1 input in address form',
    fallbackStrategy: 'Look for input with address1 or street-related attributes',
};

/**
 * Address 2 Field - Street address line 2 (optional)
 * Primary: input[name="address2"]
 */
export const address2FieldRecipe: HealingRecipe = {
    name: 'address2Field',
    description: 'Address line 2 input field',
    selectors: [
        'input[name="address2"]',
        'input[id="address2"]',
        '[data-testid*="address2"]',
        'input[placeholder*="Apt" i]',
        'input[placeholder*="Unit" i]',
    ],
    context: 'Street address line 2 (apt/suite) input in address form',
    fallbackStrategy: 'Look for input with address2 or apt/unit-related attributes',
};

/**
 * City Field - City input
 * Primary: input[name="city"]
 */
export const cityFieldRecipe: HealingRecipe = {
    name: 'cityField',
    description: 'City input field',
    selectors: ['input[name="city"]', 'input[id="city"]', '[data-testid*="city"]', 'input[aria-label*="City" i]'],
    context: 'City input in address form',
    fallbackStrategy: 'Look for input with city-related attributes',
};

/**
 * State Code Select - State/Province dropdown
 * Primary: select[name="stateCode"]
 */
export const stateCodeSelectRecipe: HealingRecipe = {
    name: 'stateCodeSelect',
    description: 'State code select dropdown',
    selectors: [
        'select[name="stateCode"]',
        'select[id="stateCode"]',
        '[data-testid*="state"]',
        'select[aria-label*="State" i]',
        'select[aria-label*="Province" i]',
    ],
    context: 'State/Province selection dropdown in address form',
    fallbackStrategy: 'Look for select element with state-related attributes',
};

/**
 * Postal Code Field - ZIP/Postal code input
 * Primary: input[name="postalCode"]
 */
export const postalCodeFieldRecipe: HealingRecipe = {
    name: 'postalCodeField',
    description: 'Postal code input field',
    selectors: [
        'input[name="postalCode"]',
        'input[id="postalCode"]',
        '[data-testid*="postal"]',
        'input[aria-label*="Postal" i]',
        'input[aria-label*="ZIP" i]',
    ],
    context: 'Postal/ZIP code input in address form',
    fallbackStrategy: 'Look for input with postal or ZIP-related attributes',
};

/**
 * Preferred Checkbox - Set as preferred address checkbox
 * Primary: input[name="preferred"]
 */
export const preferredCheckboxRecipe: HealingRecipe = {
    name: 'preferredCheckbox',
    description: 'Preferred address checkbox',
    selectors: [
        'input[name="preferred"]',
        'input[id="preferred"]',
        '[data-testid*="preferred"]',
        'input[type="checkbox"][aria-label*="Default" i]',
    ],
    context: 'Checkbox to set address as preferred/default',
    fallbackStrategy: 'Look for checkbox with preferred or default-related attributes',
};

/**
 * Save Button - Save address button
 * Primary: button[type="submit"]:has-text("Save")
 */
export const saveAddressButtonRecipe: HealingRecipe = {
    name: 'saveAddressButton',
    description: 'Save address button',
    selectors: [
        'button[type="submit"]:has-text("Save")',
        'button:has-text("Save")',
        'button[type="submit"]:has-text("Save Address")',
        '[data-testid*="save-address"]',
        '[data-testid*="save"]',
    ],
    context: 'Submit button in address form dialog',
    fallbackStrategy: 'Look for submit button with "Save" text in dialog',
};

/**
 * Cancel Button - Cancel address form button
 * Primary: button[type="button"]:has-text("Cancel")
 */
export const cancelButtonRecipe: HealingRecipe = {
    name: 'cancelButton',
    description: 'Cancel button',
    selectors: [
        'button[type="button"]:has-text("Cancel")',
        'button:has-text("Cancel")',
        '[data-testid*="cancel"]',
        'button[aria-label*="Cancel" i]',
    ],
    context: 'Cancel button in address form dialog',
    fallbackStrategy: 'Look for button with "Cancel" text in dialog',
};

/**
 * Delete Dialog - Delete confirmation dialog
 * Primary: [role="dialog"]:has-text("Remove Address")
 */
export const deleteDialogRecipe: HealingRecipe = {
    name: 'deleteDialog',
    description: 'Delete confirmation dialog',
    selectors: ['[role="dialog"]', '[data-testid*="delete-dialog"]', '[data-testid*="confirm-dialog"]'],
    context: 'Confirmation dialog when removing an address',
    fallbackStrategy: 'Look for dialog with confirmation content',
};

/**
 * Confirm Delete Button - Confirm address deletion
 * Primary: [role="dialog"] button:has-text("Remove")
 */
export const confirmDeleteButtonRecipe: HealingRecipe = {
    name: 'confirmDeleteButton',
    description: 'Confirm delete button',
    selectors: [
        '[role="dialog"] button:has-text("Remove")',
        'button[type="submit"]:has-text("Remove")',
        'button:has-text("Remove")',
        'button:has-text("Delete")',
        '[data-testid*="confirm-delete"]',
    ],
    context: 'Confirm button in delete confirmation dialog',
    fallbackStrategy: 'Look for button with "Remove" or "Delete" in delete dialog',
};

/**
 * Cancel Delete Button - Cancel address deletion
 * Primary: [role="dialog"] button:has-text("Cancel")
 */
export const cancelDeleteButtonRecipe: HealingRecipe = {
    name: 'cancelDeleteButton',
    description: 'Cancel delete button',
    selectors: [
        '[role="dialog"] button:has-text("Cancel")',
        'button[type="button"]:has-text("Cancel")',
        'button:has-text("Cancel")',
        '[data-testid*="cancel-delete"]',
    ],
    context: 'Cancel button in delete confirmation dialog',
    fallbackStrategy: 'Look for cancel button in delete dialog',
};

/**
 * Success Toast - Success notification
 * Primary: [data-sonner-toast][data-type="success"]
 */
export const successToastAddressesRecipe: HealingRecipe = {
    name: 'successToast',
    description: 'Success toast notification',
    selectors: [
        '[data-sonner-toast][data-type="success"]',
        '[role="status"][data-type="success"]',
        '[data-testid*="success-toast"]',
        '[class*="toast"][class*="success"]',
    ],
    context: 'Toast notification for successful operations',
    fallbackStrategy: 'Look for toast or notification with success styling',
};

/**
 * Error Toast - Error notification
 * Primary: [data-sonner-toast][data-type="error"]
 */
export const errorToastAddressesRecipe: HealingRecipe = {
    name: 'errorToast',
    description: 'Error toast notification',
    selectors: [
        '[data-sonner-toast][data-type="error"]',
        '[role="alert"][data-type="error"]',
        '[data-testid*="error-toast"]',
        '[class*="toast"][class*="error"]',
    ],
    context: 'Toast notification for error messages',
    fallbackStrategy: 'Look for toast or notification with error styling',
};

/**
 * Form Error - Form validation error message
 * Primary: .text-destructive
 */
export const formErrorAddressesRecipe: HealingRecipe = {
    name: 'formError',
    description: 'Form validation error message',
    selectors: ['.text-destructive', '[data-testid*="form-error"]', '[class*="error-message"]', '[role="alert"]'],
    context: 'Inline error message in form fields',
    fallbackStrategy: 'Look for error text with destructive styling or role="alert"',
};

/**
 * Aggregate all account addresses recipes for easy import
 */
export const accountAddressesRecipes: HealingRecipe[] = [
    addressesPageTitleRecipe,
    addNewAddressButtonRecipe,
    emptyStateMessageRecipe,
    addressCardsRecipe,
    defaultBadgeRecipe,
    editAddressButtonRecipe,
    removeAddressButtonRecipe,
    setDefaultButtonRecipe,
    addressDialogRecipe,
    dialogTitleRecipe,
    addressIdFieldRecipe,
    firstNameFieldRecipe,
    lastNameFieldRecipe,
    phoneFieldRecipe,
    countryCodeSelectRecipe,
    address1FieldRecipe,
    address2FieldRecipe,
    cityFieldRecipe,
    stateCodeSelectRecipe,
    postalCodeFieldRecipe,
    preferredCheckboxRecipe,
    saveAddressButtonRecipe,
    cancelButtonRecipe,
    deleteDialogRecipe,
    confirmDeleteButtonRecipe,
    cancelDeleteButtonRecipe,
    successToastAddressesRecipe,
    errorToastAddressesRecipe,
    formErrorAddressesRecipe,
];
