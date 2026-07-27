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
import { describe, expect, it } from 'vitest';
import { createCustomerProfileFormSchema } from './index';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

const { t } = getTranslation();
const customerProfileFormSchema = createCustomerProfileFormSchema(t);

describe('customerProfileFormSchema', () => {
    describe('valid data', () => {
        it('should validate when all required fields are provided with valid email', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '1234567890',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should validate when all fields including optional ones are provided', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '1234567890',
                gender: '1',
                birthday: '1990-05-15',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should validate without phone field', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should validate with empty phone field', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should validate with only required fields and optional fields empty', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '',
                gender: '',
                birthday: '',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('firstName validation', () => {
        it('should reject when firstName is empty', () => {
            const invalidData = {
                firstName: '',
                lastName: 'Doe',
                email: 'john.doe@example.com',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('firstName'))).toBe(true);
            }
        });

        it('should reject when firstName is missing', () => {
            const invalidData = {
                lastName: 'Doe',
                email: 'john.doe@example.com',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should accept single character firstName', () => {
            const validData = {
                firstName: 'J',
                lastName: 'Doe',
                email: 'john.doe@example.com',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('lastName validation', () => {
        it('should reject when lastName is empty', () => {
            const invalidData = {
                firstName: 'John',
                lastName: '',
                email: 'john.doe@example.com',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('lastName'))).toBe(true);
            }
        });

        it('should reject when lastName is missing', () => {
            const invalidData = {
                firstName: 'John',
                email: 'john.doe@example.com',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('phone validation', () => {
        it('should accept valid phone number with digits only', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '1234567890',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept valid phone number with international prefix', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '+1234567890',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept phone number with formatting characters', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '(123) 456-7890', // Will be cleaned by the regex
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject invalid phone format with letters', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '123-ABC-7890',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('phone'))).toBe(true);
            }
        });

        it('should reject phone number starting with 0', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '0123456789',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject phone number that is too long', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '123456789012345678', // Too long
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should accept empty phone as valid', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept phone with spaces and formatting that gets cleaned', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '+1 (555) 123-4567',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('gender validation', () => {
        it('should validate without gender field', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should validate with empty gender field', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                gender: '',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept gender value of 1 (Male)', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                gender: '1',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept gender value of 2 (Female)', () => {
            const validData = {
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'jane.doe@example.com',
                gender: '2',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('birthday validation', () => {
        it('should validate without birthday field', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should validate with empty birthday field', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                birthday: '',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept valid date format (YYYY-MM-DD)', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                birthday: '1990-01-15',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept birthday with other date formats', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                birthday: '2000-12-31',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject future dates', () => {
            // Create a date one year in the future using local date components
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            const year = futureDate.getFullYear();
            const month = String(futureDate.getMonth() + 1).padStart(2, '0');
            const day = String(futureDate.getDate()).padStart(2, '0');
            const futureDateString = `${year}-${month}-${day}`;

            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                birthday: futureDateString,
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('birthday'))).toBe(true);
            }
        });

        it('should accept today as valid birthday', () => {
            // Use local date components to avoid UTC timezone issues
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;

            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                birthday: today,
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        describe('birthday validation', () => {
            // Test the specific fix: parsing date components locally instead of as UTC
            // This ensures dates like "2026-01-01" are parsed as local Jan 1, not UTC Dec 31
            const year = new Date().getFullYear() - 1;
            it.each([
                `${year}-01-01`, // Past New Year - commonly affected by UTC offset
                `${year}-12-31`, // Past New Year's Eve - commonly affected by UTC offset
                `${year}-06-15`, // Past mid-year date
                '2000-02-29', // Leap year date (historical)
            ])('should handle timezone-aware date parsing correctly for %s', (dateString) => {
                const validData = {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com',
                    birthday: dateString,
                };

                const result = customerProfileFormSchema.safeParse(validData);
                expect(result.success).toBe(true);
            });
        });
    });

    describe('edge cases', () => {
        it('should handle names with special characters', () => {
            const validData = {
                firstName: 'Jean-Pierre',
                lastName: "O'Brien",
                email: 'j.p@example.com',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle names with unicode characters', () => {
            const validData = {
                firstName: 'José',
                lastName: 'García',
                email: 'jose@example.com',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle email with subdomain', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@mail.example.com',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle all minimum required fields', () => {
            const validData = {
                firstName: 'A',
                lastName: 'B',
                email: 'a@b.co',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });
});
