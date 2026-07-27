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
 * Extracts country code from a phone number.
 * Returns '+1' as default if no country code is found.
 *
 * @example
 * extractCountryCode("+1 (123) 456-7890") // "+1"
 * extractCountryCode("+44 1234567890")    // "+44"
 * extractCountryCode("(123) 456-7890")    // "+1" (default)
 */
export const extractCountryCode = (phone: string): string => {
    const match = phone.match(/^(\+\d+)/);
    return match ? match[1] : '+1';
};

/**
 * Strips country code prefix from a phone number.
 * Removes leading "+" followed by country code and optional space/dash delimiter.
 *
 * @example
 * stripCountryCode("+1 (123) 456-7890") // "(123) 456-7890"
 * stripCountryCode("(123) 456-7890")    // "(123) 456-7890"
 * stripCountryCode("+11234567890")      // "1234567890" (strips +1, keeps 1234567890)
 * stripCountryCode("+1(123)456-7890")   // "(123)456-7890" (strips +1, keeps opening paren)
 * stripCountryCode("+1234 567-890")     // "567-890" (strips +1234 with space)
 */
export const stripCountryCode = (phone: string): string => {
    if (!phone.startsWith('+')) return phone;

    // Match + followed by:
    // 1. 1-4 digits followed by space or dash: \d{1,4}[\s-]
    // 2. OR exactly 1 digit when followed by 10 more digits: \d(?=\d{10})
    // 3. OR 1-3 digits with no delimiter (fallback for cases like +1(123)...): \d{1,3}
    return phone.replace(/^\+(?:\d{1,4}[\s-]|\d(?=\d{10})|\d{1,3})/, '');
};

/**
 * Strips all non-digit characters from a string.
 *
 * @example
 * stripNonDigits("(123) 456-7890") // "1234567890"
 * stripNonDigits("abc123")         // "123"
 */
export const stripNonDigits = (value: string): string => value.replace(/\D/g, '');

/**
 * Formats phone number input as user types (US format).
 * Automatically adds parentheses and dashes: (123) 456-7890
 * Limits input to 10 digits.
 *
 * @example
 * formatPhoneInput("1234567890") // "(123) 456-7890"
 * formatPhoneInput("123456")     // "(123) 456"
 * formatPhoneInput("123")        // "(123"
 */
export const formatPhoneInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    const limited = digits.slice(0, 10);

    if (limited.length >= 7) {
        return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
    } else if (limited.length >= 4) {
        return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    } else if (limited.length > 0) {
        return `(${limited}`;
    }
    return limited;
};

/**
 * Formats phone number for display with country code (read-only/summary view).
 * Strips any existing country code prefix, then formats as: +1 (123) 456-7890
 *
 * @param phone - Phone number to format
 * @param countryCode - Country code to prepend (default: '+1')
 * @example
 * formatPhoneDisplay("1234567890")        // "+1 (123) 456-7890"
 * formatPhoneDisplay("+1 1234567890")     // "+1 (123) 456-7890" (strips existing prefix)
 * formatPhoneDisplay("11234567890")       // "+1 (123) 456-7890" (handles 11-digit with leading 1)
 */
export const formatPhoneDisplay = (phone: string, countryCode = '+1'): string => {
    const cleanPhone = stripCountryCode(phone);

    const digits = cleanPhone.replace(/\D/g, '');
    const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits.slice(0, 10);

    if (local.length === 10) {
        return `${countryCode} (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
    }
    return cleanPhone;
};
