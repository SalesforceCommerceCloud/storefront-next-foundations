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
import { describe, test, expect } from 'vitest';
import { getCheckoutDisplayError, isUnauthorizedError } from './checkout-display-error';

const mockT = (key: string) => `translated:${key}`;

describe('getCheckoutDisplayError', () => {
    test('returns undefined when data is null', () => {
        expect(getCheckoutDisplayError(null)).toBeUndefined();
    });

    test('returns undefined when data is undefined', () => {
        expect(getCheckoutDisplayError(undefined)).toBeUndefined();
    });

    test('returns undefined when step does not match', () => {
        expect(
            getCheckoutDisplayError({ step: 'contactInfo', formError: 'Email required' }, 'shippingAddress')
        ).toBeUndefined();
    });

    test('returns formError when step matches', () => {
        expect(getCheckoutDisplayError({ step: 'contactInfo', formError: 'Email already in use' }, 'contactInfo')).toBe(
            'Email already in use'
        );
    });

    test('returns error when step matches and formError is absent', () => {
        expect(getCheckoutDisplayError({ step: 'payment', error: 'Payment failed' }, 'payment')).toBe('Payment failed');
    });

    test('prefers error over formError when both present', () => {
        expect(
            getCheckoutDisplayError(
                { step: 'contactInfo', error: 'Server error', formError: 'Validation error' },
                'contactInfo'
            )
        ).toBe('Server error');
    });

    test('returns undefined when step matches but message is empty string', () => {
        expect(getCheckoutDisplayError({ step: 'contactInfo', formError: '' }, 'contactInfo')).toBeUndefined();
    });

    test('returns undefined when step matches but message is not a string', () => {
        expect(
            getCheckoutDisplayError({ step: 'contactInfo', formError: 123 as unknown as string }, 'contactInfo')
        ).toBeUndefined();
    });

    test('returns message when step is not passed (any step)', () => {
        expect(getCheckoutDisplayError({ step: 'shipping', formError: 'Address invalid' })).toBe('Address invalid');
    });

    describe('ActionError with t() - step+code mapping', () => {
        test('maps OPERATION_FAILED at contactInfo to contactInfoFailed', () => {
            const data = { step: 'contactInfo', error: { code: 'OPERATION_FAILED', message: 'API error' } };
            expect(getCheckoutDisplayError(data, 'contactInfo', mockT)).toBe(
                'translated:errors:checkout.contactInfoFailed'
            );
        });

        test('maps OPERATION_FAILED at shippingAddress to addressValidationFailed', () => {
            const data = { step: 'shippingAddress', error: { code: 'OPERATION_FAILED', message: 'API error' } };
            expect(getCheckoutDisplayError(data, 'shippingAddress', mockT)).toBe(
                'translated:errors:checkout.addressValidationFailed'
            );
        });

        test('maps OPERATION_FAILED at shippingOptions to shippingMethodNotAvailable', () => {
            const data = { step: 'shippingOptions', error: { code: 'OPERATION_FAILED', message: 'API error' } };
            expect(getCheckoutDisplayError(data, 'shippingOptions', mockT)).toBe(
                'translated:errors:checkout.shippingMethodNotAvailable'
            );
        });

        test('maps OPERATION_FAILED at payment to paymentProcessingFailed', () => {
            const data = { step: 'payment', error: { code: 'OPERATION_FAILED', message: 'API error' } };
            expect(getCheckoutDisplayError(data, 'payment', mockT)).toBe(
                'translated:errors:checkout.paymentProcessingFailed'
            );
        });

        test('maps NOT_FOUND at payment to paymentProcessingFailed (step override)', () => {
            const data = { step: 'payment', error: { code: 'NOT_FOUND', message: 'API error' } };
            expect(getCheckoutDisplayError(data, 'payment', mockT)).toBe(
                'translated:errors:checkout.paymentProcessingFailed'
            );
        });

        test('maps OPERATION_FAILED at placeOrder to orderCreationFailed', () => {
            const data = { step: 'placeOrder', error: { code: 'OPERATION_FAILED', message: 'API error' } };
            expect(getCheckoutDisplayError(data, 'placeOrder', mockT)).toBe(
                'translated:errors:checkout.orderCreationFailed'
            );
        });

        test('maps REQUIRED_FIELD at placeOrder to checkoutIncomplete', () => {
            const data = { step: 'placeOrder', error: { code: 'REQUIRED_FIELD', message: 'Missing payment' } };
            expect(getCheckoutDisplayError(data, 'placeOrder', mockT)).toBe(
                'translated:errors:checkout.checkoutIncomplete'
            );
        });
    });

    describe('ActionError with t() - global code mapping', () => {
        test('maps NOT_FOUND to basketNotFound (global)', () => {
            const data = { step: 'contactInfo', error: { code: 'NOT_FOUND', message: 'Basket gone' } };
            expect(getCheckoutDisplayError(data, 'contactInfo', mockT)).toBe('translated:errors:api.basketNotFound');
        });

        test('maps NOT_AUTHENTICATED to unauthorized', () => {
            const data = { step: 'payment', error: { code: 'NOT_AUTHENTICATED', message: '401' } };
            expect(getCheckoutDisplayError(data, 'payment', mockT)).toBe('translated:errors:api.unauthorized');
        });

        test('maps NOT_AUTHORIZED to unauthorized', () => {
            const data = { step: 'contactInfo', error: { code: 'NOT_AUTHORIZED', message: '403' } };
            expect(getCheckoutDisplayError(data, 'contactInfo', mockT)).toBe('translated:errors:api.unauthorized');
        });

        test('maps EXPIRED to unauthorized', () => {
            const data = { step: 'payment', error: { code: 'EXPIRED', message: 'Token expired' } };
            expect(getCheckoutDisplayError(data, 'payment', mockT)).toBe('translated:errors:api.unauthorized');
        });

        test('maps INVALID_INPUT to badRequest', () => {
            const data = { step: 'contactInfo', error: { code: 'INVALID_INPUT', message: 'Bad data' } };
            expect(getCheckoutDisplayError(data, 'contactInfo', mockT)).toBe('translated:errors:api.badRequest');
        });

        test('maps OUT_OF_STOCK to stockNotAvailable', () => {
            const data = { step: 'placeOrder', error: { code: 'OUT_OF_STOCK', message: 'No stock' } };
            expect(getCheckoutDisplayError(data, 'placeOrder', mockT)).toBe(
                'translated:errors:checkout.stockNotAvailable'
            );
        });
    });

    describe('ActionError with t() - default fallback', () => {
        test('falls back to serverError for unmapped codes', () => {
            const data = { step: 'contactInfo', error: { code: 'CONFLICT', message: 'Conflict' } };
            expect(getCheckoutDisplayError(data, 'contactInfo', mockT)).toBe('translated:errors:api.serverError');
        });

        test('falls back to serverError for UNKNOWN code', () => {
            const data = { step: 'payment', error: { code: 'UNKNOWN', message: 'Unknown' } };
            expect(getCheckoutDisplayError(data, 'payment', mockT)).toBe('translated:errors:api.serverError');
        });

        test('falls back to serverError for RATE_LIMITED code', () => {
            const data = { step: 'placeOrder', error: { code: 'RATE_LIMITED', message: 'Slow down' } };
            expect(getCheckoutDisplayError(data, 'placeOrder', mockT)).toBe('translated:errors:api.serverError');
        });
    });

    describe('ActionError without t() - backward compat', () => {
        test('returns raw message when t is not provided', () => {
            const data = {
                step: 'contactInfo',
                error: { code: 'OPERATION_FAILED', message: 'Raw SCAPI error message' },
            };
            expect(getCheckoutDisplayError(data, 'contactInfo')).toBe('Raw SCAPI error message');
        });

        test('returns undefined when t is not provided and message is empty', () => {
            const data = { step: 'payment', error: { code: 'OPERATION_FAILED', message: '' } };
            expect(getCheckoutDisplayError(data, 'payment')).toBeUndefined();
        });
    });
});

describe('isUnauthorizedError', () => {
    test('returns false for null data', () => {
        expect(isUnauthorizedError(null)).toBe(false);
    });

    test('returns false for undefined data', () => {
        expect(isUnauthorizedError(undefined)).toBe(false);
    });

    test('returns true for NOT_AUTHENTICATED code', () => {
        expect(isUnauthorizedError({ error: { code: 'NOT_AUTHENTICATED', message: '401' } })).toBe(true);
    });

    test('returns true for NOT_AUTHORIZED code', () => {
        expect(isUnauthorizedError({ error: { code: 'NOT_AUTHORIZED', message: '403' } })).toBe(true);
    });

    test('returns true for EXPIRED code', () => {
        expect(isUnauthorizedError({ error: { code: 'EXPIRED', message: 'Token expired' } })).toBe(true);
    });

    test('returns false for non-auth error code', () => {
        expect(isUnauthorizedError({ error: { code: 'NOT_FOUND', message: 'Basket not found' } })).toBe(false);
    });

    test('returns false when error is a plain string', () => {
        expect(isUnauthorizedError({ formError: 'Session expired' })).toBe(false);
    });

    test('returns false when error field is absent', () => {
        expect(isUnauthorizedError({ step: 'payment' })).toBe(false);
    });
});
