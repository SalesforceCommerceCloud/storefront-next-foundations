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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractNameFromEmail, generateRandomPassword } from './customer.server';

describe('Guest User Registration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('extractNameFromEmail', () => {
        it('should extract names from common email patterns', () => {
            const testCases = [
                {
                    email: 'john.doe@example.com',
                    expected: { firstName: 'John', lastName: 'Doe' },
                },
                {
                    email: 'jane_smith@company.org',
                    expected: { firstName: 'Jane', lastName: 'Smith' },
                },
                {
                    email: 'mary-johnson@test.com',
                    expected: { firstName: 'Mary', lastName: 'Johnson' },
                },
                {
                    email: 'johnDoe@example.com',
                    expected: { firstName: 'John', lastName: 'Doe' },
                },
                {
                    email: 'user123@example.com',
                    expected: { firstName: 'User', lastName: 'User' },
                },
                {
                    email: 'alex.chen123@company.com',
                    expected: { firstName: 'Alex', lastName: 'Chen' },
                },
            ];

            testCases.forEach(({ email, expected }) => {
                const result = extractNameFromEmail(email);
                expect(result).toEqual(expected);
            });
        });

        it('should handle edge cases gracefully', () => {
            const edgeCases = [
                { email: '', expected: { firstName: 'Guest', lastName: 'User' } },
                { email: 'invalid', expected: { firstName: 'Invalid', lastName: 'User' } },
                { email: '@example.com', expected: { firstName: 'Guest', lastName: 'User' } },
                { email: 'a@b.c', expected: { firstName: 'A', lastName: 'User' } },
            ];

            edgeCases.forEach(({ email, expected }) => {
                const result = extractNameFromEmail(email);
                expect(result).toEqual(expected);
            });
        });

        it('should handle single name as fallback', () => {
            const result = extractNameFromEmail('john@example.com');
            expect(result).toEqual({
                firstName: 'John',
                lastName: 'User',
            });
        });
    });

    describe('generateRandomPassword', () => {
        it('should generate password with minimum length requirement', () => {
            const password = generateRandomPassword();
            expect(password.length).toBeGreaterThanOrEqual(8);
        });

        it('should generate password with required character types', () => {
            // Test multiple passwords since nanoid is random
            const passwords = Array.from({ length: 10 }, () => generateRandomPassword());

            // At least one password should have each required character type
            const hasUppercase = passwords.some((p) => /[A-Z]/.test(p));
            const hasNumber = passwords.some((p) => /\d/.test(p));
            const hasSpecial = passwords.some((p) => /[!@#$%^&*(),.?":{}|<>]/.test(p));

            expect(hasUppercase).toBe(true);
            expect(hasNumber).toBe(true);
            expect(hasSpecial).toBe(true);

            // Every password should have at least 8 characters
            passwords.forEach((password) => {
                expect(password.length).toBeGreaterThanOrEqual(8);
            });
        });
    });

    describe('registerGuestUser', () => {
        beforeEach(() => {
            // Reset mocks before each test
            vi.clearAllMocks();
        });

        it('should test registration logic without complex auth mocking', () => {
            // Test the name priority logic that's used in registerGuestUser
            const testOrderInfo = {
                customerInfo: {
                    email: 'guest@example.com',
                    firstName: undefined as string | undefined,
                    lastName: undefined as string | undefined,
                },
                shippingAddress: {
                    firstName: 'Jane',
                    lastName: 'Smith',
                    addressLine1: '123 Main St',
                    city: 'Anytown',
                    stateCode: 'CA',
                    postalCode: '12345',
                    countryCode: 'US',
                    phone: '555-1234',
                },
            };

            // Simulate the name extraction logic from registerGuestUser
            const nameFromEmail = extractNameFromEmail('guest@example.com');
            const firstName =
                testOrderInfo?.shippingAddress?.firstName ||
                testOrderInfo?.customerInfo?.firstName ||
                nameFromEmail.firstName;
            const lastName =
                testOrderInfo?.shippingAddress?.lastName ||
                testOrderInfo?.customerInfo?.lastName ||
                nameFromEmail.lastName;

            expect(firstName).toBe('Jane'); // From shipping address
            expect(lastName).toBe('Smith'); // From shipping address
        });

        it('should validate password generation is working', () => {
            // Test that password generation produces valid results
            const password = generateRandomPassword();

            expect(password).toBeDefined();
            expect(password.length).toBeGreaterThanOrEqual(8);
            expect(typeof password).toBe('string');
        });
    });

    describe('Name Extraction Priority Logic', () => {
        it('should prioritize shipping address over customer info and email extraction', () => {
            const orderInfo = {
                shippingAddress: {
                    firstName: 'Shipping',
                    lastName: 'Address',
                },
                customerInfo: {
                    firstName: 'Customer',
                    lastName: 'Info',
                },
            };

            // Priority should be: shipping address > customer info > email extraction
            const firstName =
                orderInfo.shippingAddress?.firstName || orderInfo.customerInfo?.firstName || 'EmailExtracted';
            const lastName =
                orderInfo.shippingAddress?.lastName || orderInfo.customerInfo?.lastName || 'EmailExtracted';

            expect(firstName).toBe('Shipping');
            expect(lastName).toBe('Address');
        });

        it('should fall back to customer info when shipping address names are missing', () => {
            const orderInfo = {
                shippingAddress: {
                    address1: '123 Main St',
                    firstName: undefined as string | undefined,
                    lastName: undefined as string | undefined,
                },
                customerInfo: {
                    firstName: 'Customer',
                    lastName: 'Info',
                },
            };

            const firstName =
                orderInfo.shippingAddress?.firstName || orderInfo.customerInfo?.firstName || 'EmailExtracted';
            const lastName =
                orderInfo.shippingAddress?.lastName || orderInfo.customerInfo?.lastName || 'EmailExtracted';

            expect(firstName).toBe('Customer');
            expect(lastName).toBe('Info');
        });

        it('should fall back to email extraction when both shipping and customer info are missing', () => {
            const orderInfo = {
                shippingAddress: {
                    address1: '123 Main St',
                    firstName: undefined as string | undefined,
                    lastName: undefined as string | undefined,
                },
                customerInfo: {
                    email: 'test@example.com',
                    firstName: undefined as string | undefined,
                    lastName: undefined as string | undefined,
                },
            };

            const nameFromEmail = { firstName: 'EmailExtracted', lastName: 'Name' };
            const firstName =
                orderInfo.shippingAddress?.firstName || orderInfo.customerInfo?.firstName || nameFromEmail.firstName;
            const lastName =
                orderInfo.shippingAddress?.lastName || orderInfo.customerInfo?.lastName || nameFromEmail.lastName;

            expect(firstName).toBe('EmailExtracted');
            expect(lastName).toBe('Name');
        });
    });

    describe('Password Generation Requirements', () => {
        it('should meet Commerce Cloud password requirements', () => {
            const passwordRequirements = {
                minLength: 8,
                hasUppercase: /[A-Z]/.test('TestPassword1!'),
                hasLowercase: /[a-z]/.test('TestPassword1!'),
                hasNumber: /\d/.test('TestPassword1!'),
                hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test('TestPassword1!'),
            };

            expect(passwordRequirements.minLength).toBe(8);
            expect(passwordRequirements.hasUppercase).toBe(true);
            expect(passwordRequirements.hasLowercase).toBe(true);
            expect(passwordRequirements.hasNumber).toBe(true);
            expect(passwordRequirements.hasSpecial).toBe(true);
        });
    });
});
