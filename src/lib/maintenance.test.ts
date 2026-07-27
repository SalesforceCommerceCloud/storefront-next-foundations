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
import { createMaintenance, maintenanceContext } from './maintenance';

describe('maintenance.ts', () => {
    describe('createMaintenance', () => {
        describe('initialization', () => {
            it('should create maintenance object with all required methods', () => {
                const maintenance = createMaintenance();

                expect(maintenance).toBeDefined();
                expect(maintenance.set).toBeTypeOf('function');
                expect(maintenance.gate).toBeTypeOf('function');
                expect(maintenance.size).toBe(0);
            });

            it('should start unlocked and accept requests', () => {
                const maintenance = createMaintenance();

                const req = new Request('http://localhost/test');
                const promise = Promise.resolve('test');
                void maintenance.set(req, promise);

                expect(maintenance.size).toBe(1);
            });
        });

        describe('set method', () => {
            it('should add request when not locked', () => {
                const maintenance = createMaintenance();

                const req1 = new Request('http://localhost/test1');
                const promise1 = Promise.resolve('test1');
                void maintenance.set(req1, promise1);

                expect(maintenance.size).toBe(1);
            });

            it('should add multiple requests when not locked', () => {
                const maintenance = createMaintenance();

                const req1 = new Request('http://localhost/test1');
                const req2 = new Request('http://localhost/test2');
                const promise1 = Promise.resolve('test1');
                const promise2 = Promise.resolve('test2');

                void maintenance.set(req1, promise1);
                void maintenance.set(req2, promise2);

                expect(maintenance.size).toBe(2);
            });

            it('should return the promise passed to it', () => {
                const maintenance = createMaintenance();

                const req = new Request('http://localhost/test');
                const promise = Promise.resolve('test-value');
                const result = maintenance.set(req, promise);

                expect(result).toBe(promise);
            });

            it('should not add request when locked', () => {
                const maintenance = createMaintenance();

                const req1 = new Request('http://localhost/test1');
                const req2 = new Request('http://localhost/test2');
                void maintenance.set(req1, Promise.resolve('test1'));

                // Lock it by calling gate
                void maintenance.gate(req1);

                // Try to add another request after locking
                void maintenance.set(req2, Promise.resolve('test2'));

                expect(maintenance.size).toBe(0);
            });
        });

        describe('gate method', () => {
            it('should return false for request not in map', () => {
                const maintenance = createMaintenance();

                const req = new Request('http://localhost/test');
                const result = maintenance.gate(req);

                expect(result).toBe(false);
            });

            it('should return true and lock when request is in map and not locked', () => {
                const maintenance = createMaintenance();

                const req = new Request('http://localhost/test');
                const promise = Promise.resolve('test');
                void maintenance.set(req, promise);

                expect(maintenance.size).toBe(1);

                const result = maintenance.gate(req);

                expect(result).toBe(true);
                expect(maintenance.size).toBe(0); // Should clear requests after locking
            });

            it('should return false when request is in map but already locked', () => {
                const maintenance = createMaintenance();

                const req = new Request('http://localhost/test');
                const promise = Promise.resolve('test');
                void maintenance.set(req, promise);

                // First call locks it
                maintenance.gate(req);

                // Second call should return false since it's locked
                const result = maintenance.gate(req);

                expect(result).toBe(false);
            });

            it('should clear all requests when locking', () => {
                const maintenance = createMaintenance();

                const req1 = new Request('http://localhost/test1');
                const req2 = new Request('http://localhost/test2');
                void maintenance.set(req1, Promise.resolve('test1'));
                void maintenance.set(req2, Promise.resolve('test2'));

                expect(maintenance.size).toBe(2);

                maintenance.gate(req1);

                expect(maintenance.size).toBe(0);
            });
        });

        describe('size property', () => {
            it('should return 0 for new maintenance object', () => {
                const maintenance = createMaintenance();

                expect(maintenance.size).toBe(0);
            });

            it('should return correct count after adding requests', () => {
                const maintenance = createMaintenance();

                void maintenance.set(new Request('http://localhost/test1'), Promise.resolve('test1'));
                expect(maintenance.size).toBe(1);

                void maintenance.set(new Request('http://localhost/test2'), Promise.resolve('test2'));
                expect(maintenance.size).toBe(2);

                void maintenance.set(new Request('http://localhost/test3'), Promise.resolve('test3'));
                expect(maintenance.size).toBe(3);
            });

            it('should be read-only', () => {
                const maintenance = createMaintenance();

                expect(() => {
                    // @ts-expect-error - Testing runtime behavior
                    maintenance.size = 5;
                }).toThrow();
            });
        });

        describe('promise property', () => {
            it('should resolve to false when no requests added', async () => {
                const maintenance = createMaintenance();

                const result = await maintenance.promise;

                expect(result).toBe(false);
            });

            it('should resolve to true when first promise resolves', async () => {
                const maintenance = createMaintenance();

                let resolvePromise: ((value: string) => void) | undefined;
                const promise = new Promise<string>((resolve) => {
                    resolvePromise = resolve;
                });

                void maintenance.set(new Request('http://localhost/test'), promise);

                const promiseResult = maintenance.promise;

                // Resolve the inner promise
                if (resolvePromise) {
                    resolvePromise('test-value');
                }

                const result = await promiseResult;

                expect(result).toBe(true);
            });

            it('should resolve to true when first of multiple promises resolves', async () => {
                const maintenance = createMaintenance();

                let resolvePromise1: ((value: string) => void) | undefined;

                const promise1 = new Promise<string>((resolve) => {
                    resolvePromise1 = resolve;
                });
                const promise2 = new Promise<string>(() => {
                    // Never resolves - we're testing that the first promise wins
                });

                void maintenance.set(new Request('http://localhost/test1'), promise1);
                void maintenance.set(new Request('http://localhost/test2'), promise2);

                const promiseResult = maintenance.promise;

                // Resolve first promise
                if (resolvePromise1) {
                    resolvePromise1('test-value-1');
                }

                const result = await promiseResult;

                expect(result).toBe(true);
            });

            it('should reject when first promise rejects', async () => {
                const maintenance = createMaintenance();

                let rejectPromise: ((reason: unknown) => void) | undefined;
                const promise = new Promise<string>((_, reject) => {
                    rejectPromise = reject;
                });

                void maintenance.set(new Request('http://localhost/test'), promise);

                const promiseResult = maintenance.promise;

                // Reject the inner promise
                const error = new Error('Test error');
                if (rejectPromise) {
                    rejectPromise(error);
                }

                await expect(promiseResult).rejects.toThrow('Test error');
            });

            it('should lock maintenance after promise resolves', async () => {
                const maintenance = createMaintenance();

                let resolvePromise: ((value: string) => void) | undefined;
                const promise = new Promise<string>((resolve) => {
                    resolvePromise = resolve;
                });

                void maintenance.set(new Request('http://localhost/test'), promise);

                const promiseResult = maintenance.promise;
                if (resolvePromise) {
                    resolvePromise('test-value');
                }
                await promiseResult;

                // Try to add new request after locking
                void maintenance.set(new Request('http://localhost/test2'), Promise.resolve('test2'));
                expect(maintenance.size).toBe(0);
            });

            it('should lock maintenance after promise rejects', async () => {
                const maintenance = createMaintenance();

                let rejectPromise: ((reason: unknown) => void) | undefined;
                const promise = new Promise<string>((_, reject) => {
                    rejectPromise = reject;
                });

                void maintenance.set(new Request('http://localhost/test'), promise);

                const promiseResult = maintenance.promise;
                if (rejectPromise) {
                    rejectPromise(new Error('Test error'));
                }

                try {
                    await promiseResult;
                } catch {
                    // Expected
                }

                // Try to add new request after locking
                void maintenance.set(new Request('http://localhost/test2'), Promise.resolve('test2'));
                expect(maintenance.size).toBe(0);
            });

            it('should clear requests after promise resolves', async () => {
                const maintenance = createMaintenance();

                let resolvePromise: ((value: string) => void) | undefined;
                const promise = new Promise<string>((resolve) => {
                    resolvePromise = resolve;
                });

                void maintenance.set(new Request('http://localhost/test1'), promise);
                void maintenance.set(new Request('http://localhost/test2'), Promise.resolve('test2'));

                expect(maintenance.size).toBe(2);

                const promiseResult = maintenance.promise;
                if (resolvePromise) {
                    resolvePromise('test-value');
                }
                await promiseResult;

                expect(maintenance.size).toBe(0);
            });

            it('should be read-only', () => {
                const maintenance = createMaintenance();

                expect(() => {
                    // @ts-expect-error - Testing runtime behavior
                    maintenance.promise = Promise.resolve(true);
                }).toThrow();
            });
        });
    });

    describe('maintenanceContext', () => {
        it('should be defined', () => {
            expect(maintenanceContext).toBeDefined();
        });

        it('should be a context object with defaultValue', () => {
            expect(maintenanceContext).toHaveProperty('defaultValue');
        });
    });
});
