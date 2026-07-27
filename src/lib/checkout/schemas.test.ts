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
import { createPaymentSchema, getPaymentDefaultValues, parsePaymentFromFormData } from './schemas';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

const { t } = getTranslation();

describe('Payment Schema and Validation', () => {
    describe('paymentSchema', () => {
        it('should validate new credit card payment', () => {
            const paymentSchema = createPaymentSchema(t);
            const validNewCardData = {
                useSavedPaymentMethod: false,
                selectedSavedPaymentMethod: undefined,
                cardNumber: '4111111111111111',
                expiryDate: '12/28',
                cvv: '123',
                cardholderName: 'John Doe', // Updated field name
                useDifferentBilling: false, // Same as shipping by default
            };

            const result = paymentSchema.safeParse(validNewCardData);
            expect(result.success).toBe(true);
        });

        it('should validate saved payment method', () => {
            const paymentSchema = createPaymentSchema(t);
            const validSavedPaymentData = {
                useSavedPaymentMethod: true,
                selectedSavedPaymentMethod: 'card_123',
                // Card fields should be optional when using saved payment
                cardNumber: '',
                expiryDate: '',
                cvv: '',
                cardholderName: '', // Updated field name
                useDifferentBilling: false, // Same as shipping by default
            };

            const result = paymentSchema.safeParse(validSavedPaymentData);
            expect(result.success).toBe(true);
        });

        it('should reject new card payment with missing fields', () => {
            const paymentSchema = createPaymentSchema(t);
            const invalidNewCardData = {
                useSavedPaymentMethod: false,
                selectedSavedPaymentMethod: undefined,
                cardNumber: '', // Missing
                expiryDate: '12/28',
                cvv: '123',
                cardholderName: 'John Doe', // Updated field name
                useDifferentBilling: false, // Same as shipping by default
            };

            const result = paymentSchema.safeParse(invalidNewCardData);
            expect(result.success).toBe(false);
            expect(result.error?.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        message: 'Please enter your card number.', // Updated message
                    }),
                ])
            );
        });

        it('should reject saved payment without selected method', () => {
            const paymentSchema = createPaymentSchema(t);
            const invalidSavedPaymentData = {
                useSavedPaymentMethod: true,
                selectedSavedPaymentMethod: undefined, // Missing
                cardNumber: '',
                expiryDate: '',
                cvv: '',
                cardholderName: '', // Updated field name
                useDifferentBilling: false, // Same as shipping by default
            };

            const result = paymentSchema.safeParse(invalidSavedPaymentData);
            expect(result.success).toBe(false);
            expect(result.error?.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        message: 'Please enter your card number.', // Will likely validate card fields
                    }),
                ])
            );
        });

        it('should validate card number format', () => {
            const paymentSchema = createPaymentSchema(t);
            const invalidCardNumber = {
                useSavedPaymentMethod: false,
                selectedSavedPaymentMethod: undefined,
                cardNumber: '1234', // Too short
                expiryDate: '12/28',
                cvv: '123',
                cardholderName: 'John Doe', // Updated field name
                useDifferentBilling: false, // Same as shipping by default
            };

            const result = paymentSchema.safeParse(invalidCardNumber);
            expect(result.success).toBe(false);
            expect(result.error?.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        message: t('checkout:payment.cardNumberInvalidLength'),
                    }),
                ])
            );
        });

        it('should validate expiry date format', () => {
            const paymentSchema = createPaymentSchema(t);
            const invalidExpiryDate = {
                useSavedPaymentMethod: false,
                selectedSavedPaymentMethod: undefined,
                cardNumber: '4111111111111111',
                expiryDate: '13/28', // Invalid month
                cvv: '123',
                cardholderName: 'John Doe', // Updated field name
                useDifferentBilling: false, // Same as shipping by default
            };

            const result = paymentSchema.safeParse(invalidExpiryDate);
            expect(result.success).toBe(false);
            expect(result.error?.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        message: t('checkout:payment.expiryInvalid'),
                    }),
                ])
            );
        });

        it('should validate CVV length', () => {
            const paymentSchema = createPaymentSchema(t);
            const invalidCVV = {
                useSavedPaymentMethod: false,
                selectedSavedPaymentMethod: undefined,
                cardNumber: '4111111111111111',
                expiryDate: '12/28',
                cvv: '12', // Too short
                cardholderName: 'John Doe', // Updated field name
                useDifferentBilling: false, // Same as shipping by default
            };

            const result = paymentSchema.safeParse(invalidCVV);
            expect(result.success).toBe(false);
            expect(result.error?.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        message: t('checkout:payment.cvvInvalidFormat'),
                    }),
                ])
            );
        });
    });

    describe('getPaymentDefaultValues', () => {
        it('should return default values for new payment', () => {
            const result = getPaymentDefaultValues({}); // Function now requires params object

            expect(result).toEqual({
                cardNumber: '',
                cardholderName: '', // Updated field name
                expiryDate: '',
                cvv: '',
                useDifferentBilling: false,
                useSavedPaymentMethod: false,
                selectedSavedPaymentMethod: undefined,
                savePaymentToProfile: false,
                // Billing address fields - default to empty
                billingFirstName: '',
                billingLastName: '',
                billingAddress1: '',
                billingAddress2: '',
                billingCity: '',
                billingCountryCode: 'US',
                billingStateCode: '',
                billingPostalCode: '',
                billingPhone: '',
            });
        });

        it('should return values with shipping address data', () => {
            const shippingAddress = {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                address2: 'Apt 4B',
                city: 'Anytown',
                stateCode: 'CA',
                postalCode: '12345',
                phone: '555-0123',
            };

            const result = getPaymentDefaultValues({ shippingAddress });

            expect(result).toEqual({
                cardNumber: '',
                cardholderName: 'John Doe', // Composed from shipping address
                expiryDate: '',
                cvv: '',
                useDifferentBilling: false,
                useSavedPaymentMethod: false,
                selectedSavedPaymentMethod: undefined,
                savePaymentToProfile: false,
                billingFirstName: '',
                billingLastName: '',
                billingAddress1: '',
                billingAddress2: '',
                billingCity: '',
                billingCountryCode: 'US',
                billingStateCode: '',
                billingPostalCode: '',
                billingPhone: '',
            });
        });

        it('should use payment method holder name', () => {
            const paymentMethod = {
                holder: 'Jane Smith',
            };

            const result = getPaymentDefaultValues({ paymentMethod });

            expect(result).toEqual({
                cardNumber: '',
                cardholderName: 'Jane Smith', // Uses payment method holder
                expiryDate: '',
                cvv: '',
                useDifferentBilling: false,
                useSavedPaymentMethod: false,
                selectedSavedPaymentMethod: undefined,
                savePaymentToProfile: false,
                // Billing address fields - default to empty
                billingFirstName: '',
                billingLastName: '',
                billingAddress1: '',
                billingAddress2: '',
                billingCity: '',
                billingCountryCode: 'US',
                billingStateCode: '',
                billingPostalCode: '',
                billingPhone: '',
            });
        });

        it('should prioritize payment method holder over shipping address name', () => {
            const shippingAddress = {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Anytown',
                stateCode: 'CA',
                postalCode: '12345',
            };
            const paymentMethod = {
                holder: 'Jane Smith', // Should override shipping address name
            };

            const result = getPaymentDefaultValues({
                shippingAddress,
                paymentMethod,
            });

            expect(result).toEqual({
                cardNumber: '',
                cardholderName: 'Jane Smith', // Payment method holder takes priority
                expiryDate: '',
                cvv: '',
                useDifferentBilling: false,
                useSavedPaymentMethod: false,
                selectedSavedPaymentMethod: undefined,
                savePaymentToProfile: false,
                billingFirstName: '',
                billingLastName: '',
                billingAddress1: '',
                billingAddress2: '',
                billingCity: '',
                billingCountryCode: 'US',
                billingStateCode: '',
                billingPostalCode: '',
                billingPhone: '',
            });
        });
    });

    describe('parsePaymentFromFormData', () => {
        it('should parse savePaymentToProfile as true when formData has "true"', () => {
            const formData = new FormData();
            formData.set('savePaymentToProfile', 'true');
            const result = parsePaymentFromFormData(formData);
            expect(result.savePaymentToProfile).toBe(true);
        });

        it('should parse savePaymentToProfile as false when formData has "false"', () => {
            const formData = new FormData();
            formData.set('savePaymentToProfile', 'false');
            const result = parsePaymentFromFormData(formData);
            expect(result.savePaymentToProfile).toBe(false);
        });

        it('should parse savePaymentToProfile as false when formData omits the key', () => {
            const formData = new FormData();
            const result = parsePaymentFromFormData(formData);
            expect(result.savePaymentToProfile).toBe(false);
        });
    });

    describe('payment schema with savePaymentToProfile', () => {
        it('should validate new card payment with savePaymentToProfile true', () => {
            const paymentSchema = createPaymentSchema(t);
            const validData = {
                useSavedPaymentMethod: false,
                selectedSavedPaymentMethod: undefined,
                cardNumber: '4111111111111111',
                expiryDate: '12/28',
                cvv: '123',
                cardholderName: 'John Doe',
                useDifferentBilling: false,
                savePaymentToProfile: true,
            };

            const result = paymentSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.savePaymentToProfile).toBe(true);
            }
        });
    });
});
