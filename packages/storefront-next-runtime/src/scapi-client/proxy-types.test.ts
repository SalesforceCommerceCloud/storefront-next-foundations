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
import { isOperationMethod, type OperationMap, type KnownKeys, type WithStrictCustomProperties } from './proxy-types';

describe('proxy-types', () => {
    describe('KnownKeys', () => {
        it('should extract only literal keys, not index signatures', () => {
            // Type with both literal keys and index signature
            type TestType = { name: string; age: number } & { [key: string]: unknown };
            type Keys = KnownKeys<TestType>;

            // These should compile - 'name' and 'age' are known keys
            const key1: Keys = 'name';
            const key2: Keys = 'age';
            expect(key1).toBe('name');
            expect(key2).toBe('age');
        });

        it('should work with types that have no index signature', () => {
            type SimpleType = { foo: string; bar: number };
            type Keys = KnownKeys<SimpleType>;

            const key1: Keys = 'foo';
            const key2: Keys = 'bar';
            expect(key1).toBe('foo');
            expect(key2).toBe('bar');
        });

        it('should return never for types with only index signature', () => {
            type IndexOnlyType = { [key: string]: unknown };
            type Keys = KnownKeys<IndexOnlyType>;

            // Keys should be never - no literal keys exist
            // This is a compile-time check; we just verify the type resolves
            const _typeCheck: Keys extends never ? true : false = true;
            expect(_typeCheck).toBe(true);
        });
    });

    describe('WithStrictCustomProperties', () => {
        it('should allow known properties', () => {
            type TestType = { name: string; age: number } & { [key: string]: unknown };
            type Strict = WithStrictCustomProperties<TestType>;

            // This should compile without errors - known properties are allowed
            const valid: Strict = { name: 'test', age: 25 };
            expect(valid.name).toBe('test');
            expect(valid.age).toBe(25);
        });

        it('should allow c_* custom properties', () => {
            type TestType = { name: string } & { [key: string]: unknown };
            type Strict = WithStrictCustomProperties<TestType>;

            // c_* properties should be allowed
            const valid: Strict = { name: 'test', c_customField: 'value', c_anotherCustom: 123 };
            expect(valid.name).toBe('test');
            expect(valid.c_customField).toBe('value');
            expect(valid.c_anotherCustom).toBe(123);
        });

        /**
         * Type-level unit test using @ts-expect-error
         *
         * NOTE: The @ts-expect-error directive below is INTENTIONAL and should NOT be "fixed".
         * This is our unit testing strategy for compile-time type checking:
         * - @ts-expect-error asserts that the following line MUST produce a TypeScript error
         * - If the line compiles without error, the test fails during type checking
         * - This ensures our type transformations correctly reject invalid code
         */
        it('should reject unknown properties that are not c_* (compile-time check)', () => {
            type TestType = { name: string } & { [key: string]: unknown };
            type Strict = WithStrictCustomProperties<TestType>;

            // @ts-expect-error - 'invalidProp' should not be allowed (this is a type-level assertion)
            const invalid: Strict = { name: 'test', invalidProp: 'value' };
            // Runtime check to ensure test runs
            expect(invalid).toBeDefined();
        });

        it('should preserve optional properties', () => {
            type TestType = { required: string; optional?: number } & { [key: string]: unknown };
            type Strict = WithStrictCustomProperties<TestType>;

            // Without optional property
            const withoutOptional: Strict = { required: 'test' };
            expect(withoutOptional.required).toBe('test');

            // With optional property
            const withOptional: Strict = { required: 'test', optional: 42 };
            expect(withOptional.optional).toBe(42);
        });

        it('should handle nested objects without transforming them', () => {
            type TestType = {
                name: string;
                address: { street: string; city: string };
            } & { [key: string]: unknown };
            type Strict = WithStrictCustomProperties<TestType>;

            // Nested objects should keep their original type
            const valid: Strict = {
                name: 'test',
                address: { street: '123 Main', city: 'Boston' },
            };
            expect(valid.address.street).toBe('123 Main');
        });

        it('should pass through non-object types unchanged', () => {
            type StringType = WithStrictCustomProperties<string>;
            type NumberType = WithStrictCustomProperties<number>;

            const str: StringType = 'hello';
            const num: NumberType = 42;
            expect(str).toBe('hello');
            expect(num).toBe(42);
        });
    });

    describe('isOperationMethod', () => {
        const BASE_PATH = '/api/v1' as const;
        const operations: OperationMap = {
            getUser: { m: 'GET', b: BASE_PATH, s: '/users/{id}' },
            createUser: { m: 'POST', b: BASE_PATH, s: '/users' },
            updateUser: { m: 'PUT', b: BASE_PATH, s: '/users/{id}' },
            deleteUser: { m: 'DELETE', b: BASE_PATH, s: '/users/{id}' },
        };

        describe('valid operation names', () => {
            it('should return true for existing operation methods', () => {
                expect(isOperationMethod(operations, 'getUser')).toBe(true);
                expect(isOperationMethod(operations, 'createUser')).toBe(true);
                expect(isOperationMethod(operations, 'updateUser')).toBe(true);
                expect(isOperationMethod(operations, 'deleteUser')).toBe(true);
            });
        });

        describe('invalid operation names', () => {
            it('should return false for non-existent operation methods', () => {
                expect(isOperationMethod(operations, 'listUsers')).toBe(false);
                expect(isOperationMethod(operations, 'nonExistentMethod')).toBe(false);
            });

            it('should return false for HTTP method names', () => {
                expect(isOperationMethod(operations, 'GET')).toBe(false);
                expect(isOperationMethod(operations, 'POST')).toBe(false);
                expect(isOperationMethod(operations, 'PUT')).toBe(false);
                expect(isOperationMethod(operations, 'DELETE')).toBe(false);
            });

            it('should return false for middleware method names', () => {
                expect(isOperationMethod(operations, 'use')).toBe(false);
                expect(isOperationMethod(operations, 'eject')).toBe(false);
            });

            it('should return false for symbol properties', () => {
                const sym = Symbol('test');
                expect(isOperationMethod(operations, sym)).toBe(false);
            });

            it('should return false for numeric properties', () => {
                expect(isOperationMethod(operations, '123')).toBe(false);
            });
        });

        describe('edge cases', () => {
            it('should handle empty operation maps', () => {
                const emptyOps: OperationMap = {};
                expect(isOperationMethod(emptyOps, 'anyMethod')).toBe(false);
            });

            it('should handle operation names with special characters', () => {
                const BASE = '/api' as const;
                const specialOps: OperationMap = {
                    'get-user': { m: 'GET', b: BASE, s: '/users/{id}' },
                    create_user: { m: 'POST', b: BASE, s: '/users' },
                };
                expect(isOperationMethod(specialOps, 'get-user')).toBe(true);
                expect(isOperationMethod(specialOps, 'create_user')).toBe(true);
            });

            it('should be case-sensitive', () => {
                expect(isOperationMethod(operations, 'GetUser')).toBe(false);
                expect(isOperationMethod(operations, 'GETUSER')).toBe(false);
            });
        });
    });
});
