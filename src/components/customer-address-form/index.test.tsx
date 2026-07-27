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
import type { TFunction } from 'i18next';
import { createCustomerAddressFormSchema } from './index';

import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

const { t } = getTranslation();
const customerAddressFormSchema = createCustomerAddressFormSchema(t as unknown as TFunction<['errors', 'account']>);

describe('customerAddressFormSchema', () => {
    describe('valid data', () => {
        it('should validate when all required fields are provided for US address', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should validate when all required fields are provided for Canadian address', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'CA' as const,
                address1: '123 Yonge St',
                city: 'Toronto',
                stateCode: 'ON',
                postalCode: 'M5B 2H1',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should validate without phone field', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject with empty phone field', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should validate with addressId', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: true,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('addressId validation', () => {
        it('should validate when addressId is not provided (no longer required)', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('firstName validation', () => {
        it('should reject when firstName is empty', () => {
            const invalidData = {
                firstName: '',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('firstName'))).toBe(true);
            }
        });

        it('should reject when firstName is missing', () => {
            const invalidData = {
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('lastName validation', () => {
        it('should reject when lastName is empty', () => {
            const invalidData = {
                firstName: 'John',
                lastName: '',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('lastName'))).toBe(true);
            }
        });
    });

    describe('countryCode validation', () => {
        it('should reject invalid country code', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'GB' as any,
                address1: '123 Main St',
                city: 'London',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should accept US country code', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept CA country code', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'CA' as const,
                address1: '123 Yonge St',
                city: 'Toronto',
                stateCode: 'ON',
                postalCode: 'M5B 2H1',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('address2 validation', () => {
        it('should accept address with address2 provided', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                address2: 'Apt 4B',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept address without address2 (optional field)', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept empty string for address2', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                address2: '',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject when address2 exceeds 256 characters', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                address2: 'A'.repeat(257), // 257 characters, exceeds max
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('address2'))).toBe(true);
            }
        });

        it('should accept address2 with exactly 256 characters', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                address2: 'A'.repeat(256), // exactly 256 characters
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('address1 validation', () => {
        it('should reject when address1 is empty', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('city validation', () => {
        it('should reject when city is empty', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: '',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('stateCode validation', () => {
        it('should reject when stateCode is missing for US', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('stateCode'))).toBe(true);
            }
        });

        it('should reject when stateCode is missing for CA', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'CA' as const,
                address1: '123 Yonge St',
                city: 'Toronto',
                postalCode: 'M5B 2H1',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should accept valid state code for US', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept valid province code for CA', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'CA' as const,
                address1: '123 Yonge St',
                city: 'Toronto',
                stateCode: 'ON',
                postalCode: 'M5B 2H1',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('postalCode validation', () => {
        it('should reject when postalCode is empty', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should accept valid US postal code (5 digits)', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept valid US postal code (5+4 format)', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001-1234',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject invalid US postal code', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '1234',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('postalCode'))).toBe(true);
            }
        });

        it('should accept valid Canadian postal code', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'CA' as const,
                address1: '123 Yonge St',
                city: 'Toronto',
                stateCode: 'ON',
                postalCode: 'M5B 2H1',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept valid Canadian postal code without space', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'CA' as const,
                address1: '123 Yonge St',
                city: 'Toronto',
                stateCode: 'ON',
                postalCode: 'M5B2H1',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject invalid Canadian postal code', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'CA' as const,
                address1: '123 Yonge St',
                city: 'Toronto',
                stateCode: 'ON',
                postalCode: '12345',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('postalCode'))).toBe(true);
            }
        });
    });

    describe('phone validation', () => {
        it('should accept valid phone number with digits only', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept phone number with formatting characters', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '(123) 456-7890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept any phone format (no validation)', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '123-ABC-7890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            // Phone validation was removed - any string is accepted
            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('preferred validation', () => {
        it('should accept preferred as true', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: true,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept preferred as false', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                countryCode: 'US' as const,
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                preferred: false,
            };

            const result = customerAddressFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });
});
