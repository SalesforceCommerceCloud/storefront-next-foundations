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
import {
    detectCardType,
    getCardTypeDisplay,
    getFormattedMaskedCardNumber,
    getLastFourDigits,
    hasValidPaymentCard,
} from './payment-utils';

describe('detectCardType', () => {
    test('detects Visa cards', () => {
        expect(detectCardType('4111111111111111')).toBe('Visa'); // Standard test Visa
        expect(detectCardType('4111 1111 1111 1111')).toBe('Visa'); // With spaces
        expect(detectCardType('4000000000000002')).toBe('Visa'); // Another test Visa
        expect(detectCardType('4111111111111')).toBe('Visa'); // 13-digit Visa
    });

    test('detects Mastercard', () => {
        expect(detectCardType('5555555555554444')).toBe('Mastercard'); // Classic range 5[1-5]
        expect(detectCardType('5105105105105100')).toBe('Mastercard');
        expect(detectCardType('2223000048400011')).toBe('Mastercard'); // New range 2[2-7]
        expect(detectCardType('2720990000000015')).toBe('Mastercard');
    });

    test('detects American Express', () => {
        expect(detectCardType('378282246310005')).toBe('American Express'); // Starts with 37
        expect(detectCardType('371449635398431')).toBe('American Express');
        expect(detectCardType('343434343434343')).toBe('American Express'); // Starts with 34
    });

    test('detects Discover', () => {
        expect(detectCardType('6011111111111117')).toBe('Discover');
        expect(detectCardType('6011000990139424')).toBe('Discover');
    });

    test('detects Diners Club', () => {
        expect(detectCardType('30569309025904')).toBe('Diners Club'); // Starts with 30[0-5]
        expect(detectCardType('36227206271667')).toBe('Diners Club'); // Starts with 36
        expect(detectCardType('38520000023237')).toBe('Diners Club'); // Starts with 38
    });

    test('detects JCB', () => {
        expect(detectCardType('3530111333300000')).toBe('JCB');
        expect(detectCardType('3566002020360505')).toBe('JCB');
    });

    test('handles invalid or unknown cards', () => {
        expect(detectCardType('')).toBe('Unknown');
        expect(detectCardType('1234567890123456')).toBe('Credit Card'); // Doesn't match any pattern
        expect(detectCardType('9999999999999999')).toBe('Credit Card');
        expect(detectCardType('abc')).toBe('Credit Card'); // Non-numeric
    });

    test('handles cards with formatting', () => {
        expect(detectCardType('4111-1111-1111-1111')).toBe('Visa');
        expect(detectCardType('5555 5555 5555 4444')).toBe('Mastercard');
        expect(detectCardType('3782-822463-10005')).toBe('American Express');
    });

    test('validates card length requirements', () => {
        expect(detectCardType('4111111111111')).toBe('Visa'); // 13 digits - valid Visa
        expect(detectCardType('41111111111111111111')).toBe('Credit Card'); // 20 digits - too long for Visa
        expect(detectCardType('51111111111111111')).toBe('Credit Card'); // 17 digits - wrong length for Mastercard
        expect(detectCardType('34343434343434')).toBe('Credit Card'); // 14 digits - too short for Amex
    });
});

describe('getCardTypeDisplay', () => {
    test('returns fallback when instrument is undefined or missing type', () => {
        expect(getCardTypeDisplay(undefined, 'Card')).toBe('Card');
        // no paymentCard and no paymentMethodId
        expect(getCardTypeDisplay({} as any, 'Card')).toBe('Card');
    });

    test('normalizes common card types', () => {
        expect(getCardTypeDisplay({ paymentCard: { cardType: 'discover' } } as any)).toBe('Discover');
        expect(getCardTypeDisplay({ paymentCard: { cardType: 'diners' } } as any)).toBe('Diners Club');
        expect(getCardTypeDisplay({ paymentCard: { cardType: 'jcb' } } as any)).toBe('JCB');
    });

    test('falls back to original when no normalization match', () => {
        expect(getCardTypeDisplay({ paymentCard: { cardType: 'UnionPay' } } as any)).toBe('UnionPay');
    });
});

describe('getFormattedMaskedCardNumber', () => {
    test('handles undefined instrument and returns default mask', () => {
        expect(getFormattedMaskedCardNumber(undefined)).toBe('**** **** **** ****');
    });

    test('returns existing masked value as-is', () => {
        expect(getFormattedMaskedCardNumber({ paymentCard: { maskedNumber: '**** **** **** 4242' } } as any)).toBe(
            '**** **** **** 4242'
        );
    });

    test('masks when only last digits available', () => {
        expect(getFormattedMaskedCardNumber({ paymentCard: { maskedNumber: '1234567890123456' } } as any)).toBe(
            '**** **** **** 3456'
        );
    });
});

describe('getLastFourDigits', () => {
    test('returns placeholders for undefined and extracts digits from mixed strings', () => {
        expect(getLastFourDigits(undefined)).toBe('****');
        expect(getLastFourDigits('**** **** **** 1337')).toBe('1337');
        // not enough digits present so fallback
        expect(getLastFourDigits('****-****-****-9a8b')).toBe('****');
        expect(getLastFourDigits('** 1 2 3 4')).toBe('1234');
    });

    test('prefers numberLastDigits when provided and valid (customer payment instruments)', () => {
        expect(getLastFourDigits('Visa ****', '4242')).toBe('4242');
        expect(getLastFourDigits(undefined, '1234')).toBe('1234');
        expect(getLastFourDigits('************5678', '0000')).toBe('0000');
        // invalid numberLastDigits falls back to maskedNumber
        expect(getLastFourDigits('************1234', 'ab')).toBe('1234');
        expect(getLastFourDigits('************1234', '12')).toBe('1234');
    });
});

describe('hasValidPaymentCard', () => {
    test('handles saved payment methods', () => {
        // valid saved card
        expect(
            hasValidPaymentCard({
                paymentInstrumentId: 'id',
                paymentMethodId: 'CREDIT_CARD',
                paymentCard: { cardType: 'Visa' },
            } as any)
        ).toBe(true);
        // CREDIT_CARD (visa) from customer profile - accepted via startsWith
        expect(
            hasValidPaymentCard({
                paymentInstrumentId: 'id',
                paymentMethodId: 'CREDIT_CARD (visa)',
                paymentCard: { cardType: 'Visa' },
            } as any)
        ).toBe(true);
        // missing card type
        expect(
            hasValidPaymentCard({ paymentInstrumentId: 'id', paymentMethodId: 'CREDIT_CARD', paymentCard: {} } as any)
        ).toBe(false);
        // not a credit card method
        expect(hasValidPaymentCard({ paymentInstrumentId: 'id', paymentMethodId: 'PayPal' } as any)).toBe(false);
    });

    test('handles new payment methods based on masked numbers', () => {
        expect(hasValidPaymentCard({ maskedCreditCardNumber: '**** **** **** 1111' } as any)).toBe(true);
        expect(hasValidPaymentCard({ paymentCard: { maskedCreditCardNumber: '**** **** **** 2222' } } as any)).toBe(
            true
        );
        expect(hasValidPaymentCard({ paymentCard: { maskedNumber: '1234567890123456' } } as any)).toBe(true);
        expect(hasValidPaymentCard({} as any)).toBe(false);
    });
});
