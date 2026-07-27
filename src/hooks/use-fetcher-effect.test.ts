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
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { FetcherWithComponents } from 'react-router';
import { useFetcherEffect, type FetcherEffectConfig } from './use-fetcher-effect';

// Mock data types for testing
interface TestData {
    id: string;
    name: string;
    email: string;
}

interface SuccessErrorData {
    success: boolean;
    error?: string;
    data?: TestData;
}

interface ErrorsData {
    success: boolean;
    errors?: string[];
    data?: TestData;
}

// Helper function to create a mock fetcher
function createMockFetcher<TData = unknown>(
    initialState: 'idle' | 'loading' | 'submitting' = 'idle',
    initialData?: TData
): FetcherWithComponents<TData> {
    return {
        state: initialState,
        data: initialData,
        load: vi.fn().mockResolvedValue(undefined),
        submit: vi.fn().mockResolvedValue(undefined),
        formAction: undefined,
        formData: undefined,
        formEncType: 'application/x-www-form-urlencoded',
        formMethod: 'GET',
        formTarget: undefined,
        formText: undefined,
        text: undefined,
        json: undefined,
        type: 'init',
    } as unknown as FetcherWithComponents<TData>;
}

describe('useFetcherEffect', () => {
    let mockOnSuccess: (data: unknown) => void;
    let mockOnError: (error: string | string[], data?: unknown) => void;

    beforeEach(() => {
        mockOnSuccess = vi.fn();
        mockOnError = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Success scenarios with default detection', () => {
        it('should call onSuccess when data has success: true', () => {
            const testData: SuccessErrorData = {
                success: true,
                data: { id: '123', name: 'John Doe', email: 'john@example.com' },
            };
            const fetcher = createMockFetcher('idle', testData);

            const config: FetcherEffectConfig<SuccessErrorData> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(testData);
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should call onSuccess when data is truthy (no success property)', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData);

            const config: FetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(testData);
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should call onSuccess with primitive data types', () => {
            const stringData = 'test string';
            const fetcher = createMockFetcher('idle', stringData);

            const config: FetcherEffectConfig<string> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(stringData);
        });

        it('should call onSuccess with array data', () => {
            const arrayData = [1, 2, 3, 4, 5];
            const fetcher = createMockFetcher('idle', arrayData);

            const config: FetcherEffectConfig<number[]> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(arrayData);
        });

        it('should call onSuccess when fetcher is in loading state with data', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('loading', testData);

            const config: FetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            // Loading state with data means action completed but revalidation is happening
            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(testData);
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should not call onSuccess when data has success: false', () => {
            const testData: SuccessErrorData = {
                success: false,
                error: 'Some error',
            };
            const fetcher = createMockFetcher('idle', testData);

            const config: FetcherEffectConfig<SuccessErrorData> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).not.toHaveBeenCalled();
        });

        it('should not call onSuccess when data is null or undefined', () => {
            const fetcher = createMockFetcher('idle', undefined);

            const config: FetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).not.toHaveBeenCalled();
            expect(mockOnError).not.toHaveBeenCalled();
        });
    });

    describe('Error scenarios with default detection', () => {
        it('should call onError when data has success: false and error property', () => {
            const errorData: SuccessErrorData = {
                success: false,
                error: 'Validation failed',
            };
            const fetcher = createMockFetcher('idle', errorData);

            const config: FetcherEffectConfig<SuccessErrorData> = {
                onError: mockOnError,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnError).toHaveBeenCalledTimes(1);
            expect(mockOnError).toHaveBeenCalledWith('Validation failed', errorData);
            expect(mockOnSuccess).not.toHaveBeenCalled();
        });

        it('should call onError when data has success: false and errors property', () => {
            const errors = ['Validation failed', 'Email already exists'];
            const errorData: ErrorsData = {
                success: false,
                errors,
            };
            const fetcher = createMockFetcher('idle', errorData);

            const config: FetcherEffectConfig<ErrorsData> = {
                onError: mockOnError,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnError).toHaveBeenCalledTimes(1);
            expect(mockOnError).toHaveBeenCalledWith(errors, errorData);
            expect(mockOnSuccess).not.toHaveBeenCalled();
        });

        it('should call onError when fetcher is in loading state with error data', () => {
            const errorData: SuccessErrorData = {
                success: false,
                error: 'Some error',
            };
            const fetcher = createMockFetcher('loading', errorData);

            const config: FetcherEffectConfig<SuccessErrorData> = {
                onError: mockOnError,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            // Loading state with data means action completed but revalidation is happening
            expect(mockOnError).toHaveBeenCalledTimes(1);
            expect(mockOnError).toHaveBeenCalledWith('Some error', errorData);
            expect(mockOnSuccess).not.toHaveBeenCalled();
        });

        it('should not call onError when data has success: true', () => {
            const successData: SuccessErrorData = {
                success: true,
                data: { id: '123', name: 'John Doe', email: 'john@example.com' },
            };
            const fetcher = createMockFetcher('idle', successData);

            const config: FetcherEffectConfig<SuccessErrorData> = {
                onError: mockOnError,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should not call onError when no error property exists', () => {
            const errorData: SuccessErrorData = {
                success: false,
            };
            const fetcher = createMockFetcher('idle', errorData);

            const config: FetcherEffectConfig<SuccessErrorData> = {
                onError: mockOnError,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnError).not.toHaveBeenCalled();
        });
    });

    describe('State transitions', () => {
        it('should handle state transition from loading to idle with success', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            let fetcher = createMockFetcher<TestData>('loading', undefined);

            const config: FetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
                onError: mockOnError,
            };

            const { rerender } = renderHook(() => useFetcherEffect(fetcher, config));

            // Initially no callbacks should be called
            expect(mockOnSuccess).not.toHaveBeenCalled();
            expect(mockOnError).not.toHaveBeenCalled();

            // Simulate state transition to idle with success
            fetcher = createMockFetcher('idle', testData);
            rerender();

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(testData);
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle state transition from submitting to idle with error', () => {
            const errorData: SuccessErrorData = {
                success: false,
                error: 'Validation failed',
            };
            let fetcher = createMockFetcher<SuccessErrorData>('submitting', undefined);

            const config: FetcherEffectConfig<SuccessErrorData> = {
                onSuccess: mockOnSuccess,
                onError: mockOnError,
            };

            const { rerender } = renderHook(() => useFetcherEffect(fetcher, config));

            // Initially no callbacks should be called
            expect(mockOnSuccess).not.toHaveBeenCalled();
            expect(mockOnError).not.toHaveBeenCalled();

            // Simulate state transition to idle with error
            fetcher = createMockFetcher('idle', errorData);
            rerender();

            expect(mockOnError).toHaveBeenCalledTimes(1);
            expect(mockOnError).toHaveBeenCalledWith('Validation failed', errorData);
            expect(mockOnSuccess).not.toHaveBeenCalled();
        });

        it('should not call callbacks multiple times for same state', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData);

            const config: FetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
            };

            const { rerender } = renderHook(() => useFetcherEffect(fetcher, config));

            // First render should call onSuccess
            expect(mockOnSuccess).toHaveBeenCalledTimes(1);

            // Re-render with same state should not call onSuccess again
            rerender();
            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
        });
    });

    describe('Callback configuration', () => {
        it('should work with only onSuccess callback', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData);

            const config: FetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(testData);
        });

        it('should work with only onError callback', () => {
            const errorData: SuccessErrorData = {
                success: false,
                error: 'Validation failed',
            };
            const fetcher = createMockFetcher('idle', errorData);

            const config: FetcherEffectConfig<SuccessErrorData> = {
                onError: mockOnError,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnError).toHaveBeenCalledTimes(1);
            expect(mockOnError).toHaveBeenCalledWith('Validation failed', errorData);
        });

        it('should work with both callbacks', () => {
            const testData: SuccessErrorData = {
                success: true,
                data: { id: '123', name: 'John Doe', email: 'john@example.com' },
            };
            const fetcher = createMockFetcher('idle', testData);

            const config: FetcherEffectConfig<SuccessErrorData> = {
                onSuccess: mockOnSuccess,
                onError: mockOnError,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(testData);
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should work with empty config object', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData);

            const config: FetcherEffectConfig<TestData> = {};

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).not.toHaveBeenCalled();
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should work with undefined callbacks', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData);

            const config: FetcherEffectConfig<TestData> = {
                onSuccess: undefined,
                onError: undefined,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).not.toHaveBeenCalled();
            expect(mockOnError).not.toHaveBeenCalled();
        });
    });

    describe('Edge cases', () => {
        it('should handle fetcher with empty object data', () => {
            const fetcher = createMockFetcher('idle', {});

            const config: FetcherEffectConfig<Record<string, unknown>> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith({});
        });

        it('should handle fetcher with empty array data', () => {
            const fetcher = createMockFetcher('idle', []);

            const config: FetcherEffectConfig<unknown[]> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith([]);
        });

        it('should handle fetcher with zero data', () => {
            const fetcher = createMockFetcher('idle', 0);

            const config: FetcherEffectConfig<number> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(0);
        });

        it('should handle fetcher with false data', () => {
            const fetcher = createMockFetcher('idle', false);

            const config: FetcherEffectConfig<boolean> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(false);
        });

        it('should handle complex nested data structures', () => {
            const complexData = {
                user: {
                    id: '123',
                    profile: {
                        name: 'John Doe',
                        preferences: {
                            theme: 'dark',
                            notifications: true,
                        },
                    },
                },
                items: [
                    { id: 1, name: 'Item 1' },
                    { id: 2, name: 'Item 2' },
                ],
            };
            const fetcher = createMockFetcher('idle', complexData);

            const config: FetcherEffectConfig<typeof complexData> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(complexData);
        });

        it('should handle empty errors array', () => {
            const errorData: ErrorsData = {
                success: false,
                errors: [],
            };
            const fetcher = createMockFetcher('idle', errorData);

            const config: FetcherEffectConfig<ErrorsData> = {
                onError: mockOnError,
            };

            renderHook(() => useFetcherEffect(fetcher, config));

            // Empty array is still considered an error array, so it should be called
            expect(mockOnError).toHaveBeenCalledTimes(1);
            expect(mockOnError).toHaveBeenCalledWith([], errorData);
        });
    });

    describe('Callback stability', () => {
        it('should handle callback functions that throw errors gracefully', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData);

            const throwingOnSuccess = vi.fn(() => {
                throw new Error('Callback error');
            });

            const config: FetcherEffectConfig<TestData> = {
                onSuccess: throwingOnSuccess,
            };

            // This should not throw an error
            expect(() => {
                renderHook(() => useFetcherEffect(fetcher, config));
            }).not.toThrow();

            expect(throwingOnSuccess).toHaveBeenCalledTimes(1);
        });

        it('should handle onError callback that throws errors gracefully', () => {
            const errorData: SuccessErrorData = {
                success: false,
                error: 'Validation failed',
            };
            const fetcher = createMockFetcher('idle', errorData);

            const throwingOnError = vi.fn(() => {
                throw new Error('Callback error');
            });

            const config: FetcherEffectConfig<SuccessErrorData> = {
                onError: throwingOnError,
            };

            // This should not throw an error
            expect(() => {
                renderHook(() => useFetcherEffect(fetcher, config));
            }).not.toThrow();

            expect(throwingOnError).toHaveBeenCalledTimes(1);
        });
    });
});
