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
import { RequiredError } from './required';

describe('RequiredError', () => {
    test('is an instance of Error', () => {
        const error = new RequiredError('missing value');
        expect(error).toBeInstanceOf(Error);
    });

    test('has name "RequiredError"', () => {
        const error = new RequiredError('missing value');
        expect(error.name).toBe('RequiredError');
    });

    test('carries the provided message', () => {
        const error = new RequiredError('field X is required');
        expect(error.message).toBe('field X is required');
    });

    describe('assert', () => {
        test('throws when value is null (default isEmpty)', () => {
            expect(() => RequiredError.assert(null, 'required')).toThrow(RequiredError);
        });

        test('throws when value is undefined (default isEmpty)', () => {
            expect(() => RequiredError.assert(undefined, 'required')).toThrow(RequiredError);
        });

        test('does not throw when value is present (default isEmpty)', () => {
            expect(() => RequiredError.assert('hello', 'required')).not.toThrow();
        });

        test('does not throw for falsy-but-non-nullish values (default isEmpty)', () => {
            expect(() => RequiredError.assert(0, 'required')).not.toThrow();
            expect(() => RequiredError.assert('', 'required')).not.toThrow();
            expect(() => RequiredError.assert(false, 'required')).not.toThrow();
        });

        test('uses custom isEmpty function', () => {
            const isEmptyString = (v: string) => v === '';
            expect(() => RequiredError.assert('', 'required', isEmptyString)).toThrow(RequiredError);
            expect(() => RequiredError.assert('value', 'required', isEmptyString)).not.toThrow();
        });

        test('thrown error contains the provided message', () => {
            expect(() => RequiredError.assert(null, 'aspect type is required')).toThrow('aspect type is required');
        });

        test('throws for all falsy values when negated Boolean is used as isEmpty', () => {
            const isFalsy = (v: unknown): boolean => !v;
            expect(() => RequiredError.assert('', 'required', isFalsy)).toThrow(RequiredError);
            expect(() => RequiredError.assert(0, 'required', isFalsy)).toThrow(RequiredError);
            expect(() => RequiredError.assert(null, 'required', isFalsy)).toThrow(RequiredError);
            expect(() => RequiredError.assert(undefined, 'required', isFalsy)).toThrow(RequiredError);
            expect(() => RequiredError.assert('value', 'required', isFalsy)).not.toThrow();
        });
    });
});
