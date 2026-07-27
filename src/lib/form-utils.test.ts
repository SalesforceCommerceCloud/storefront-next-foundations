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
import { formatCardNumber, formatExpiryDate, stripNonDigits, formatPhoneNumber } from './form-utils';

describe('Form Utilities', () => {
    describe('formatCardNumber', () => {
        it('should format card number with spaces every 4 digits', () => {
            expect(formatCardNumber('1234567890123456')).toBe('1234 5678 9012 3456');
            expect(formatCardNumber('123456789012345')).toBe('1234 5678 9012 345');
            expect(formatCardNumber('1234')).toBe('1234');
        });

        it('should handle non-digit characters', () => {
            expect(formatCardNumber('1234-5678-9012-3456')).toBe('1234 5678 9012 3456');
            expect(formatCardNumber('1234abc5678def9012')).toBe('1234 5678 9012');
        });

        it('should limit to 19 digits', () => {
            expect(formatCardNumber('12345678901234567890')).toBe('1234 5678 9012 3456 789');
        });

        it('should handle empty string', () => {
            expect(formatCardNumber('')).toBe('');
        });
    });

    describe('formatExpiryDate', () => {
        it('should format MM/YY correctly', () => {
            expect(formatExpiryDate('1225')).toBe('12/25');
            expect(formatExpiryDate('0522')).toBe('05/22');
        });

        it('should add slash after MM', () => {
            expect(formatExpiryDate('12')).toBe('12/');
            expect(formatExpiryDate('1')).toBe('1');
        });

        it('should handle partial input', () => {
            expect(formatExpiryDate('123')).toBe('12/3');
        });

        it('should handle non-digit characters', () => {
            expect(formatExpiryDate('12/25')).toBe('12/25');
            expect(formatExpiryDate('12abc25')).toBe('12/25');
        });

        it('should limit to 4 digits', () => {
            expect(formatExpiryDate('1225678')).toBe('12/25');
        });

        it('should handle empty string', () => {
            expect(formatExpiryDate('')).toBe('');
        });
    });

    describe('stripNonDigits', () => {
        it('should remove all non-digit characters', () => {
            expect(stripNonDigits('1234 5678 9012 3456')).toBe('1234567890123456');
            expect(stripNonDigits('123-abc-456')).toBe('123456');
            expect(stripNonDigits('(123) 456-7890')).toBe('1234567890');
        });

        it('should handle strings with only digits', () => {
            expect(stripNonDigits('1234567890')).toBe('1234567890');
        });

        it('should handle empty string', () => {
            expect(stripNonDigits('')).toBe('');
        });

        it('should handle strings with no digits', () => {
            expect(stripNonDigits('abc-def-ghi')).toBe('');
        });
    });

    describe('formatPhoneNumber', () => {
        it('should format phone number with dashes', () => {
            expect(formatPhoneNumber('1234567890')).toBe('123-456-7890');
        });

        it('should handle partial input', () => {
            expect(formatPhoneNumber('123456')).toBe('123-456');
            expect(formatPhoneNumber('123')).toBe('123');
        });

        it('should handle non-digit characters', () => {
            expect(formatPhoneNumber('(123) 456-7890')).toBe('123-456-7890');
            expect(formatPhoneNumber('123abc456def7890')).toBe('123-456-7890');
        });

        it('should limit to 10 digits', () => {
            expect(formatPhoneNumber('12345678901234')).toBe('123-456-7890');
        });

        it('should handle empty string', () => {
            expect(formatPhoneNumber('')).toBe('');
        });
    });
});
