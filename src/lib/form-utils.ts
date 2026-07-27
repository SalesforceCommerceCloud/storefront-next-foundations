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
 * Form input formatting and validation utilities
 */
/**
 * Formats a card number by adding spaces every 4 digits
 *
 * @param value - The raw card number input
 * @returns Formatted card number with spaces (e.g., "1234 5678 9012 3456")
 *
 * @example
 * formatCardNumber("1234567890123456") // "1234 5678 9012 3456"
 * formatCardNumber("123abc456") // "123 456"
 */
export const formatCardNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Add spaces every 4 digits, max 19 digits
    const limitedDigits = digits.slice(0, 19);
    const formatted = limitedDigits.replace(/(\d{4})(?=\d)/g, '$1 ');

    return formatted;
};

/**
 * Formats an expiry date in MM/YY format
 *
 * @param value - The raw expiry date input
 * @returns Formatted expiry date (e.g., "12/25")
 *
 * @example
 * formatExpiryDate("1225") // "12/25"
 * formatExpiryDate("12/25") // "12/25"
 * formatExpiryDate("1abc2") // "12/"
 */
export const formatExpiryDate = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Limit to 4 digits (MMYY)
    const limitedDigits = digits.slice(0, 4);

    // Add slash after MM
    if (limitedDigits.length >= 3) {
        return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2)}`;
    } else if (limitedDigits.length >= 2) {
        return `${limitedDigits.slice(0, 2)}/`;
    }

    return limitedDigits;
};

/**
 * Strips all non-digit characters from a string
 * Useful for processing card numbers before validation
 *
 * @param value - The input string
 * @returns String with only digits
 *
 * @example
 * stripNonDigits("1234 5678 9012 3456") // "1234567890123456"
 * stripNonDigits("123-abc-456") // "123456"
 */
export const stripNonDigits = (value: string): string => {
    return value.replace(/\D/g, '');
};

/**
 * Formats a phone number with dashes (US format)
 *
 * @param value - The raw phone number input
 * @returns Formatted phone number (e.g., "123-456-7890")
 *
 * @example
 * formatPhoneNumber("1234567890") // "123-456-7890"
 * formatPhoneNumber("123abc456") // "123-456"
 */
export const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10);

    // Format based on length
    if (limitedDigits.length >= 7) {
        return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
    } else if (limitedDigits.length >= 4) {
        return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3)}`;
    }

    return limitedDigits;
};
