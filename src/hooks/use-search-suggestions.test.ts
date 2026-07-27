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
import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';
import type { ShopperSearch } from '@/scapi';
import { useSearchSuggestions } from './use-search-suggestions';
import { useScapiFetcher } from './use-scapi-fetcher';

vi.mock('./use-scapi-fetcher', () => ({
    useScapiFetcher: vi.fn(),
}));

const mockUseScapiFetcher = useScapiFetcher as any;

describe('useSearchSuggestions', () => {
    let mockFetcher: {
        state: 'idle' | 'loading' | 'submitting';
        load: MockedFunction<() => Promise<void>>;
        data: ShopperSearch.schemas['SuggestionResult'] | undefined;
        success: boolean;
        errors: string[] | undefined;
    };

    const mockSuggestionResult: ShopperSearch.schemas['SuggestionResult'] = {
        searchPhrase: 'dress',
        categorySuggestions: {
            categories: [{ id: 'dresses', name: 'Dresses', parentCategoryName: 'Clothing' }],
            suggestedTerms: [],
        },
        productSuggestions: {
            products: [{ productId: 'dress-001', productName: 'Summer Dress', currency: 'USD', price: 99.99 }],
            suggestedTerms: [],
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockFetcher = {
            state: 'idle',
            load: vi.fn().mockResolvedValue(undefined),
            data: undefined,
            success: false,
            errors: undefined,
        };

        mockUseScapiFetcher.mockReturnValue(mockFetcher as never);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('should initialize with correct parameters', () => {
            renderHook(() =>
                useSearchSuggestions({
                    q: 'dress',
                    expand: ['images', 'prices'],
                    limit: 10,
                    currency: 'USD',
                })
            );

            expect(mockUseScapiFetcher).toHaveBeenCalledWith('shopperSearch', 'getSearchSuggestions', {
                params: {
                    query: {
                        currency: 'USD',
                        q: 'dress',
                        expand: ['images', 'prices'],
                        limit: 10,
                    },
                },
            });
        });

        it('should handle minimal parameters', () => {
            renderHook(() => useSearchSuggestions({ q: 'shirt' }));

            expect(mockUseScapiFetcher).toHaveBeenCalledWith('shopperSearch', 'getSearchSuggestions', {
                params: {
                    query: {
                        q: 'shirt',
                    },
                },
            });
        });

        it('should exclude undefined optional parameters', () => {
            renderHook(() =>
                useSearchSuggestions({
                    q: 'jacket',
                    expand: undefined,
                    limit: undefined,
                    currency: undefined,
                })
            );

            expect(mockUseScapiFetcher).toHaveBeenCalledWith('shopperSearch', 'getSearchSuggestions', {
                params: {
                    query: {
                        q: 'jacket',
                    },
                },
            });
        });
    });

    describe('state management', () => {
        it('should return loading state from fetcher', () => {
            mockFetcher.state = 'loading';

            const { result } = renderHook(() => useSearchSuggestions({ q: 'dress' }));

            expect(result.current.isLoading).toBe(true);
        });

        it('should return non-loading state when fetcher is idle', () => {
            mockFetcher.state = 'idle';

            const { result } = renderHook(() => useSearchSuggestions({ q: 'dress' }));

            expect(result.current.isLoading).toBe(false);
        });

        it('should return undefined data initially', () => {
            mockFetcher.data = undefined;
            const { result } = renderHook(() => useSearchSuggestions({ q: 'dress' }));

            expect(result.current.data).toBeUndefined();
        });
    });

    describe('refetch function', () => {
        it('should call fetcher.load when enabled and query is provided', async () => {
            const { result } = renderHook(() => useSearchSuggestions({ q: 'dress', enabled: true }));

            await result.current.refetch();

            expect(mockFetcher.load).toHaveBeenCalledTimes(1);
        });

        it('should return data from fetcher after successful load', () => {
            mockFetcher.data = mockSuggestionResult;
            const { result } = renderHook(() => useSearchSuggestions({ q: 'dress' }));

            expect(result.current.data).toEqual(mockSuggestionResult);
        });

        it('should throw error when disabled', async () => {
            const { result } = renderHook(() => useSearchSuggestions({ q: 'dress', enabled: false }));

            await expect(result.current.refetch()).rejects.toThrow('Search suggestions disabled or query is empty');
            expect(mockFetcher.load).not.toHaveBeenCalled();
        });

        it('should throw error when query is empty', async () => {
            const { result } = renderHook(() => useSearchSuggestions({ q: '', enabled: true }));

            await expect(result.current.refetch()).rejects.toThrow('Search suggestions disabled or query is empty');
            expect(mockFetcher.load).not.toHaveBeenCalled();
        });

        it('should throw error when query is only whitespace', async () => {
            const { result } = renderHook(() => useSearchSuggestions({ q: '   ', enabled: true }));

            await expect(result.current.refetch()).rejects.toThrow('Search suggestions disabled or query is empty');
            expect(mockFetcher.load).not.toHaveBeenCalled();
        });

        it('should default to enabled when not specified', async () => {
            const { result } = renderHook(() => useSearchSuggestions({ q: 'dress' }));

            await result.current.refetch();

            expect(mockFetcher.load).toHaveBeenCalledTimes(1);
        });

        it('should handle fetcher.load errors', async () => {
            const error = new Error('API Error');
            mockFetcher.load.mockRejectedValue(error);

            const { result } = renderHook(() => useSearchSuggestions({ q: 'dress' }));

            await expect(result.current.refetch()).rejects.toThrow('API Error');
        });
    });

    describe('parameter updates', () => {
        it('should update useFetch parameters when props change', () => {
            const { rerender } = renderHook(
                ({ q, expand, limit, currency }) => useSearchSuggestions({ q, expand, limit, currency }),
                {
                    initialProps: {
                        q: 'dress',
                        expand: ['images'] as ('images' | 'prices')[],
                        limit: 5,
                        currency: 'USD',
                    },
                }
            );

            expect(mockUseScapiFetcher).toHaveBeenLastCalledWith('shopperSearch', 'getSearchSuggestions', {
                params: {
                    query: {
                        q: 'dress',
                        expand: ['images'],
                        limit: 5,
                        currency: 'USD',
                    },
                },
            });

            rerender({
                q: 'shirt',
                expand: ['images', 'prices'],
                limit: 10,
                currency: 'EUR',
            });

            expect(mockUseScapiFetcher).toHaveBeenLastCalledWith('shopperSearch', 'getSearchSuggestions', {
                params: {
                    query: {
                        q: 'shirt',
                        expand: ['images', 'prices'],
                        limit: 10,
                        currency: 'EUR',
                    },
                },
            });
        });

        it('should memoize parameters correctly', () => {
            const { rerender } = renderHook(() =>
                useSearchSuggestions({
                    q: 'dress',
                    expand: ['images', 'prices'],
                    limit: 10,
                    currency: 'USD',
                })
            );

            const firstCallArgs = mockUseScapiFetcher.mock.calls[0];
            rerender();
            const secondCallArgs = mockUseScapiFetcher.mock.calls[1];

            expect(firstCallArgs[2]).toStrictEqual(secondCallArgs[2]);
        });
    });

    describe('enabled functionality', () => {
        it('should handle enabled parameter correctly in refetch', async () => {
            const { result, rerender } = renderHook(({ enabled }) => useSearchSuggestions({ q: 'dress', enabled }), {
                initialProps: { enabled: true },
            });

            await expect(result.current.refetch()).resolves.toBeUndefined();

            rerender({ enabled: false });

            await expect(result.current.refetch()).rejects.toThrow('Search suggestions disabled or query is empty');
        });
    });

    describe('includeEinsteinSuggestedPhrases parameter', () => {
        it('should include includeEinsteinSuggestedPhrases when true', () => {
            renderHook(() => useSearchSuggestions({ q: 'dress', includeEinsteinSuggestedPhrases: true }));

            expect(mockUseScapiFetcher).toHaveBeenCalledWith('shopperSearch', 'getSearchSuggestions', {
                params: {
                    query: {
                        q: 'dress',
                        includeEinsteinSuggestedPhrases: true,
                    },
                },
            });
        });

        it('should include includeEinsteinSuggestedPhrases when false', () => {
            renderHook(() => useSearchSuggestions({ q: 'dress', includeEinsteinSuggestedPhrases: false }));

            expect(mockUseScapiFetcher).toHaveBeenCalledWith('shopperSearch', 'getSearchSuggestions', {
                params: {
                    query: {
                        q: 'dress',
                        includeEinsteinSuggestedPhrases: false,
                    },
                },
            });
        });

        it('should exclude includeEinsteinSuggestedPhrases when undefined', () => {
            renderHook(() => useSearchSuggestions({ q: 'dress', includeEinsteinSuggestedPhrases: undefined }));

            expect(mockUseScapiFetcher).toHaveBeenCalledWith('shopperSearch', 'getSearchSuggestions', {
                params: {
                    query: {
                        q: 'dress',
                    },
                },
            });
        });

        it('should exclude includeEinsteinSuggestedPhrases when not provided', () => {
            renderHook(() => useSearchSuggestions({ q: 'dress' }));

            expect(mockUseScapiFetcher).toHaveBeenCalledWith('shopperSearch', 'getSearchSuggestions', {
                params: {
                    query: {
                        q: 'dress',
                    },
                },
            });
        });

        it('should handle includeEinsteinSuggestedPhrases with other parameters', () => {
            renderHook(() =>
                useSearchSuggestions({
                    q: 'dress',
                    expand: ['images', 'prices'],
                    limit: 10,
                    currency: 'USD',
                    includeEinsteinSuggestedPhrases: true,
                })
            );

            expect(mockUseScapiFetcher).toHaveBeenCalledWith('shopperSearch', 'getSearchSuggestions', {
                params: {
                    query: {
                        q: 'dress',
                        expand: ['images', 'prices'],
                        limit: 10,
                        currency: 'USD',
                        includeEinsteinSuggestedPhrases: true,
                    },
                },
            });
        });

        it('should update includeEinsteinSuggestedPhrases parameter on rerender', () => {
            const { rerender } = renderHook(
                ({ includeEinsteinSuggestedPhrases }) =>
                    useSearchSuggestions({ q: 'dress', includeEinsteinSuggestedPhrases }),
                {
                    initialProps: { includeEinsteinSuggestedPhrases: true },
                }
            );

            expect(mockUseScapiFetcher).toHaveBeenLastCalledWith('shopperSearch', 'getSearchSuggestions', {
                params: {
                    query: {
                        q: 'dress',
                        includeEinsteinSuggestedPhrases: true,
                    },
                },
            });

            rerender({ includeEinsteinSuggestedPhrases: false });

            expect(mockUseScapiFetcher).toHaveBeenLastCalledWith('shopperSearch', 'getSearchSuggestions', {
                params: {
                    query: {
                        q: 'dress',
                        includeEinsteinSuggestedPhrases: false,
                    },
                },
            });
        });
    });
});
