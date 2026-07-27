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
import { describe, it, expect } from 'vitest';
import {
    stripNonDigits,
    stripCountryCode,
    formatPhoneInput,
    formatPhoneDisplay,
    extractCountryCode,
} from './phone-utils';

describe('phone-utils', () => {
    describe('stripNonDigits', () => {
        it('strips formatting characters from phone numbers', () => {
            expect(stripNonDigits('(123) 456-7890')).toBe('1234567890');
            expect(stripNonDigits('123-456-7890')).toBe('1234567890');
            expect(stripNonDigits('123.456.7890')).toBe('1234567890');
        });

        it('strips letters and special characters', () => {
            expect(stripNonDigits('abc123def456')).toBe('123456');
            expect(stripNonDigits('+1 (555) 123-4567')).toBe('15551234567');
        });

        it('returns empty string for non-digit input', () => {
            expect(stripNonDigits('')).toBe('');
            expect(stripNonDigits('abcdef')).toBe('');
            expect(stripNonDigits('---')).toBe('');
        });

        it('returns digits unchanged when no non-digits present', () => {
            expect(stripNonDigits('1234567890')).toBe('1234567890');
            expect(stripNonDigits('0')).toBe('0');
        });
    });

    describe('extractCountryCode', () => {
        it('extracts country code from phone number', () => {
            expect(extractCountryCode('+1 (123) 456-7890')).toBe('+1');
            expect(extractCountryCode('+44 1234567890')).toBe('+44');
            expect(extractCountryCode('+33 123456789')).toBe('+33');
        });

        it('returns +1 as default when no country code present', () => {
            expect(extractCountryCode('(123) 456-7890')).toBe('+1');
            expect(extractCountryCode('1234567890')).toBe('+1');
            expect(extractCountryCode('')).toBe('+1');
        });

        it('handles multi-digit country codes', () => {
            expect(extractCountryCode('+1234 567-890')).toBe('+1234');
            expect(extractCountryCode('+86 1234567890')).toBe('+86');
        });

        it('only extracts prefix at the beginning', () => {
            expect(extractCountryCode('123 +1 456')).toBe('+1');
        });
    });

    describe('stripCountryCode', () => {
        it('removes country code prefix from phone number', () => {
            expect(stripCountryCode('+1 (123) 456-7890')).toBe('(123) 456-7890');
            expect(stripCountryCode('+44 1234567890')).toBe('1234567890');
            expect(stripCountryCode('+1(123)456-7890')).toBe('(123)456-7890');
        });

        it('handles phone numbers without country code', () => {
            expect(stripCountryCode('(123) 456-7890')).toBe('(123) 456-7890');
            expect(stripCountryCode('1234567890')).toBe('1234567890');
        });

        it('handles empty string', () => {
            expect(stripCountryCode('')).toBe('');
        });

        it('handles multi-digit country codes', () => {
            expect(stripCountryCode('+1234 567-890')).toBe('567-890');
            expect(stripCountryCode('+44 1234567890')).toBe('1234567890');
        });

        it('only strips prefix at the beginning', () => {
            expect(stripCountryCode('123 +1 456')).toBe('123 +1 456');
        });
    });

    describe('formatPhoneInput', () => {
        it('formats 10-digit phone numbers with parentheses and dashes', () => {
            expect(formatPhoneInput('1234567890')).toBe('(123) 456-7890');
            expect(formatPhoneInput('5551234567')).toBe('(555) 123-4567');
        });

        it('formats partial input with 7-9 digits', () => {
            expect(formatPhoneInput('1234567')).toBe('(123) 456-7');
            expect(formatPhoneInput('12345678')).toBe('(123) 456-78');
            expect(formatPhoneInput('123456789')).toBe('(123) 456-789');
        });

        it('formats partial input with 4-6 digits', () => {
            expect(formatPhoneInput('1234')).toBe('(123) 4');
            expect(formatPhoneInput('12345')).toBe('(123) 45');
            expect(formatPhoneInput('123456')).toBe('(123) 456');
        });

        it('formats partial input with 1-3 digits', () => {
            expect(formatPhoneInput('1')).toBe('(1');
            expect(formatPhoneInput('12')).toBe('(12');
            expect(formatPhoneInput('123')).toBe('(123');
        });

        it('handles empty input', () => {
            expect(formatPhoneInput('')).toBe('');
        });

        it('strips non-digit characters', () => {
            expect(formatPhoneInput('(123) 456-7890')).toBe('(123) 456-7890');
            expect(formatPhoneInput('123-456-7890')).toBe('(123) 456-7890');
            expect(formatPhoneInput('123.456.7890')).toBe('(123) 456-7890');
            expect(formatPhoneInput('abc123def456ghi7890')).toBe('(123) 456-7890');
        });

        it('limits input to 10 digits', () => {
            expect(formatPhoneInput('12345678901234')).toBe('(123) 456-7890');
            expect(formatPhoneInput('99999999999')).toBe('(999) 999-9999');
        });

        it('handles already formatted input', () => {
            expect(formatPhoneInput('(123) 456-7890')).toBe('(123) 456-7890');
            expect(formatPhoneInput('(555) 123-4567')).toBe('(555) 123-4567');
        });
    });

    describe('formatPhoneDisplay', () => {
        it('formats 10-digit phone with default country code', () => {
            expect(formatPhoneDisplay('1234567890')).toBe('+1 (123) 456-7890');
            expect(formatPhoneDisplay('5551234567')).toBe('+1 (555) 123-4567');
        });

        it('formats phone with custom country code', () => {
            expect(formatPhoneDisplay('1234567890', '+44')).toBe('+44 (123) 456-7890');
            expect(formatPhoneDisplay('5551234567', '+33')).toBe('+33 (555) 123-4567');
        });

        it('strips existing country code before formatting', () => {
            expect(formatPhoneDisplay('+1 1234567890')).toBe('+1 (123) 456-7890');
            expect(formatPhoneDisplay('+1 (123) 456-7890')).toBe('+1 (123) 456-7890');
            expect(formatPhoneDisplay('+44 1234567890')).toBe('+1 (123) 456-7890');
        });

        it('handles 11-digit phone starting with 1', () => {
            expect(formatPhoneDisplay('11234567890')).toBe('+1 (123) 456-7890');
            expect(formatPhoneDisplay('15551234567')).toBe('+1 (555) 123-4567');
        });

        it('returns unformatted phone for non-10-digit input', () => {
            expect(formatPhoneDisplay('123')).toBe('123');
            expect(formatPhoneDisplay('12345')).toBe('12345');
            expect(formatPhoneDisplay('123456789')).toBe('123456789');
        });

        it('handles already formatted phone numbers', () => {
            expect(formatPhoneDisplay('(123) 456-7890')).toBe('+1 (123) 456-7890');
            expect(formatPhoneDisplay('123-456-7890')).toBe('+1 (123) 456-7890');
        });

        it('handles empty string', () => {
            expect(formatPhoneDisplay('')).toBe('');
        });

        it('handles phone with country code already prepended', () => {
            expect(formatPhoneDisplay('+1(123)456-7890')).toBe('+1 (123) 456-7890');
            expect(formatPhoneDisplay('+11234567890')).toBe('+1 (123) 456-7890');
        });

        it('preserves partial phone numbers without formatting', () => {
            expect(formatPhoneDisplay('+1 123')).toBe('123');
            expect(formatPhoneDisplay('+1 (123) 456')).toBe('(123) 456');
        });
    });
});
