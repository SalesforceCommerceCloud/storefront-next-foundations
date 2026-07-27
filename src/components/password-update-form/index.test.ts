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
import { createPasswordUpdateFormSchema } from './index';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

const { t } = getTranslation();
const passwordUpdateFormSchema = createPasswordUpdateFormSchema(t);

describe('passwordUpdateFormSchema', () => {
    describe('valid data', () => {
        it('should validate when all required fields are provided and passwords match', () => {
            const validData = {
                currentPassword: 'OldPassword123',
                password: 'NewPassword123',
                confirmPassword: 'NewPassword123',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('currentPassword validation', () => {
        it('should reject when currentPassword is empty', () => {
            const invalidData = {
                currentPassword: '',
                password: 'NewPassword123',
                confirmPassword: 'NewPassword123',
            };

            const result = passwordUpdateFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('currentPassword'))).toBe(true);
            }
        });

        it('should reject when currentPassword is missing', () => {
            const invalidData = {
                password: 'NewPassword123',
                confirmPassword: 'NewPassword123',
            };

            const result = passwordUpdateFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('password validation', () => {
        it('should reject when password is too short', () => {
            const invalidData = {
                currentPassword: 'OldPassword123',
                password: 'Short',
                confirmPassword: 'Short',
            };

            const result = passwordUpdateFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('password'))).toBe(true);
            }
        });

        it('should accept password with 8 characters', () => {
            const validData = {
                currentPassword: 'OldPassword123',
                password: '12345678',
                confirmPassword: '12345678',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject when password is missing', () => {
            const invalidData = {
                currentPassword: 'OldPassword123',
                confirmPassword: 'NewPassword123',
            };

            const result = passwordUpdateFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('confirmPassword validation', () => {
        it('should reject when confirmPassword is empty', () => {
            const invalidData = {
                currentPassword: 'OldPassword123',
                password: 'NewPassword123',
                confirmPassword: '',
            };

            const result = passwordUpdateFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('confirmPassword'))).toBe(true);
            }
        });

        it('should reject when passwords do not match', () => {
            const invalidData = {
                currentPassword: 'OldPassword123',
                password: 'NewPassword123',
                confirmPassword: 'DifferentPassword123',
            };

            const result = passwordUpdateFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('confirmPassword'))).toBe(true);
            }
        });

        it('should accept when passwords match exactly', () => {
            const validData = {
                currentPassword: 'OldPassword123',
                password: 'NewPassword123!@#',
                confirmPassword: 'NewPassword123!@#',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle passwords with special characters', () => {
            const validData = {
                currentPassword: 'OldPassword123!@#',
                password: 'NewPassword123!@#$%^&*',
                confirmPassword: 'NewPassword123!@#$%^&*',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle passwords with unicode characters', () => {
            const validData = {
                currentPassword: 'OldPassword123',
                password: 'NewPassword✓✓✓',
                confirmPassword: 'NewPassword✓✓✓',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle case-sensitive password matching', () => {
            const invalidData = {
                currentPassword: 'OldPassword123',
                password: 'NewPassword123',
                confirmPassword: 'newpassword123', // Different case
            };

            const result = passwordUpdateFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should accept password with exactly 8 characters', () => {
            const validData = {
                currentPassword: 'OldPass123',
                password: '12345678',
                confirmPassword: '12345678',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject password with 7 characters', () => {
            const invalidData = {
                currentPassword: 'OldPass123',
                password: '1234567',
                confirmPassword: '1234567',
            };

            const result = passwordUpdateFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('password'))).toBe(true);
            }
        });

        it('should handle very long passwords', () => {
            const longPassword = 'A'.repeat(200);
            const validData = {
                currentPassword: 'OldPassword123',
                password: longPassword,
                confirmPassword: longPassword,
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle whitespace in passwords', () => {
            const validData = {
                currentPassword: 'OldPassword123',
                password: 'Password 123',
                confirmPassword: 'Password 123',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle passwords with only numbers', () => {
            const validData = {
                currentPassword: 'OldPassword123',
                password: '12345678',
                confirmPassword: '12345678',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle passwords with only letters', () => {
            const validData = {
                currentPassword: 'OldPassword123',
                password: 'abcdefghijkl',
                confirmPassword: 'abcdefghijkl',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle passwords with leading/trailing spaces', () => {
            const validData = {
                currentPassword: 'OldPassword123',
                password: ' NewPassword123 ',
                confirmPassword: ' NewPassword123 ',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle identical current and new password', () => {
            const samePassword = 'SamePassword123';
            const validData = {
                currentPassword: samePassword,
                password: samePassword,
                confirmPassword: samePassword,
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            // Schema allows same password (no business rule against it)
            expect(result.success).toBe(true);
        });

        it('should handle single character passwords after 8 chars minimum is met', () => {
            // This tests that spaces count toward the 8 character minimum
            const validData = {
                currentPassword: 'OldPassword123',
                password: '        ', // 8 spaces
                confirmPassword: '        ',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject when password has less than 8 characters including spaces', () => {
            const invalidData = {
                currentPassword: 'OldPassword123',
                password: '       ', // 7 spaces
                confirmPassword: '       ',
            };

            const result = passwordUpdateFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should handle newline and tab characters in passwords', () => {
            const validData = {
                currentPassword: 'OldPassword123',
                password: 'New\nPass\t123',
                confirmPassword: 'New\nPass\t123',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle special unicode passwords with emoji', () => {
            const validData = {
                currentPassword: 'OldPassword123',
                password: 'NewPass🔥123',
                confirmPassword: 'NewPass🔥123',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle passwords with quotes and apostrophes', () => {
            const validData = {
                currentPassword: "OldPassword'123",
                password: 'New"Password"123',
                confirmPassword: 'New"Password"123',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('confirmPassword edge cases', () => {
        it('should reject when confirmPassword has trailing whitespace', () => {
            const invalidData = {
                currentPassword: 'OldPassword123',
                password: 'NewPassword123',
                confirmPassword: 'NewPassword123 ', // Extra space
            };

            const result = passwordUpdateFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('confirmPassword'))).toBe(true);
            }
        });

        it('should reject when confirmPassword has leading whitespace', () => {
            const invalidData = {
                currentPassword: 'OldPassword123',
                password: 'NewPassword123',
                confirmPassword: ' NewPassword123', // Leading space
            };

            const result = passwordUpdateFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject when confirmPassword is missing', () => {
            const invalidData = {
                currentPassword: 'OldPassword123',
                password: 'NewPassword123',
            };

            const result = passwordUpdateFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('confirmPassword'))).toBe(true);
            }
        });
    });

    describe('currentPassword edge cases', () => {
        it('should accept currentPassword with special characters', () => {
            const validData = {
                currentPassword: 'Old!@#$%Password',
                password: 'NewPassword123',
                confirmPassword: 'NewPassword123',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept currentPassword with only spaces', () => {
            const validData = {
                currentPassword: '        ', // 8 spaces
                password: 'NewPassword123',
                confirmPassword: 'NewPassword123',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept currentPassword with unicode characters', () => {
            const validData = {
                currentPassword: 'Old密碼123',
                password: 'NewPassword123',
                confirmPassword: 'NewPassword123',
            };

            const result = passwordUpdateFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });
});
