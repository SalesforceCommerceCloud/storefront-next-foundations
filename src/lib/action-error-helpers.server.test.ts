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
import { httpStatusForErrorCode } from './action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';

describe('httpStatusForErrorCode', () => {
    test.each([
        [ErrorCode.INVALID_INPUT, 400],
        [ErrorCode.REQUIRED_FIELD, 400],
        [ErrorCode.NOT_AUTHENTICATED, 401],
        [ErrorCode.NOT_AUTHORIZED, 403],
        [ErrorCode.NOT_FOUND, 404],
        [ErrorCode.METHOD_NOT_ALLOWED, 405],
        [ErrorCode.CONFLICT, 409],
        [ErrorCode.EXPIRED, 410],
        [ErrorCode.RATE_LIMITED, 429],
    ])('maps %s to HTTP %i', (code, status) => {
        expect(httpStatusForErrorCode(code)).toBe(status);
    });

    test('EXPIRED is a 4xx, not a server error', () => {
        // Regression: EXPIRED previously fell through to the 500 default, which
        // misreported expired-coupon business outcomes as server faults.
        expect(httpStatusForErrorCode(ErrorCode.EXPIRED)).toBeLessThan(500);
    });

    test('falls through to 500 for codes without a canonical 1:1 status', () => {
        expect(httpStatusForErrorCode(ErrorCode.OPERATION_FAILED)).toBe(500);
        expect(httpStatusForErrorCode(ErrorCode.UNKNOWN)).toBe(500);
        expect(httpStatusForErrorCode('SOMETHING_UNMAPPED')).toBe(500);
    });
});
