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
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRecommenders, type Recommendation, type Product } from './use-recommenders';
import { resourceRoutes } from '@/route-paths';
import { mockAltSiteObject } from '@/test-utils/config';

vi.mock('@salesforce/storefront-next-runtime/site-context', async (importOriginal) => {
    const actual = await importOriginal<object>();
    return {
        ...actual,
        useSite: vi.fn(() => ({
            site: { id: mockAltSiteObject.id, defaultLocale: mockAltSiteObject.defaultLocale },
            language: mockAltSiteObject.defaultLocale,
            currency: mockAltSiteObject.defaultCurrency,
        })),
    };
});

const buildResponse = (body: Recommendation, ok = true): Response =>
    ({
        ok,
        json: () => Promise.resolve(body),
    }) as unknown as Response;

describe('useRecommenders (rewired to /resource/recommendations)', () => {
    let mockFetch: ReturnType<typeof vi.fn<typeof fetch>>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch = vi
            .fn<typeof fetch>()
            .mockResolvedValue(buildResponse({ recs: [{ productId: 'p-1' }] } as Recommendation));
        vi.stubGlobal('fetch', mockFetch);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('initialization', () => {
        it('exposes default state', () => {
            const { result } = renderHook(() => useRecommenders(true));
            expect(result.current.isLoading).toBe(false);
            expect(result.current.isEnabled).toBe(true);
            expect(result.current.recommendations).toEqual({});
            expect(result.current.error).toBeNull();
        });

        it('respects isEnabled = false', async () => {
            const { result } = renderHook(() => useRecommenders(false));
            expect(result.current.isEnabled).toBe(false);
            await act(async () => {
                await result.current.getRecommendations('home');
            });
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    describe('getRecommendations', () => {
        it('GETs /resource/recommendations with the wire format encoded as query params', async () => {
            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getRecommendations('home-new-arrivals');
            });

            expect(mockFetch).toHaveBeenCalledTimes(1);
            const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
            const parsed = new URL(url, 'http://localhost');
            expect(parsed.pathname).toBe(resourceRoutes.recommendations);
            expect((init?.method ?? 'GET').toUpperCase()).toBe('GET');
            expect(parsed.searchParams.get('recommenderName')).toBe('home-new-arrivals');
            // Hook does NOT include cookieId/userId/clientIp/clientUserAgent — server stamps them.
            expect(parsed.searchParams.get('cookieId')).toBeNull();
            expect(parsed.searchParams.get('userId')).toBeNull();
            expect(parsed.searchParams.get('clientIp')).toBeNull();
        });

        it('encodes products and args as JSON query params', async () => {
            const { result } = renderHook(() => useRecommenders(true));
            const products: Product[] = [{ id: 'sku-1' }, { id: 'sku-2' }];
            const args = { limit: 8, anchor: 'sku-1' };

            await act(async () => {
                await result.current.getRecommendations('home', products, args);
            });

            const [url] = mockFetch.mock.calls[0] as [string];
            const parsed = new URL(url, 'http://localhost');
            expect(JSON.parse(parsed.searchParams.get('products') ?? 'null')).toEqual(products);
            expect(JSON.parse(parsed.searchParams.get('args') ?? 'null')).toEqual(args);
            // currency is sourced from site context
            expect(parsed.searchParams.get('currency')).toBe(mockAltSiteObject.defaultCurrency);
        });

        it('omits products and args params when not provided', async () => {
            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getRecommendations('home');
            });

            const [url] = mockFetch.mock.calls[0] as [string];
            const parsed = new URL(url, 'http://localhost');
            expect(parsed.searchParams.get('products')).toBeNull();
            expect(parsed.searchParams.get('args')).toBeNull();
        });

        it('stores response and stamps recommenderName onto recommendations', async () => {
            mockFetch.mockResolvedValueOnce(buildResponse({ recs: [{ productId: 'p-1' }] } as Recommendation));

            const { result } = renderHook(() => useRecommenders(true));
            await act(async () => {
                await result.current.getRecommendations('home');
            });

            await waitFor(() => {
                expect(result.current.recommendations.recommenderName).toBe('home');
                expect(result.current.recommendations.recs).toHaveLength(1);
            });
        });

        it('sets loading state during fetch', async () => {
            let resolveFetch: ((value: Response) => void) | undefined;
            mockFetch.mockImplementationOnce(() => {
                return new Promise<Response>((resolve) => {
                    resolveFetch = resolve;
                });
            });

            const { result } = renderHook(() => useRecommenders(true));
            act(() => {
                void result.current.getRecommendations('home');
            });
            expect(result.current.isLoading).toBe(true);

            await act(async () => {
                resolveFetch?.(buildResponse({ recs: [] }));
                await Promise.resolve();
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('aborts the previous request on consecutive calls', async () => {
            const signals: AbortSignal[] = [];
            mockFetch.mockImplementation((_url, init?: RequestInit) => {
                return new Promise<Response>((resolve, reject) => {
                    if (init?.signal) {
                        signals.push(init.signal);
                        init.signal.addEventListener('abort', () => {
                            reject(new DOMException('aborted', 'AbortError'));
                        });
                    }
                    // Resolve only the second call's promise
                    if (signals.length === 2) {
                        resolve(buildResponse({ recs: [{ productId: 'p-2' }] } as Recommendation));
                    }
                });
            });

            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                void result.current.getRecommendations('first');
                await result.current.getRecommendations('second');
            });

            expect(signals).toHaveLength(2);
            expect(signals[0]?.aborted).toBe(true);
            expect(signals[1]?.aborted).toBe(false);
        });

        it('aborts the in-flight request on unmount', () => {
            let signal: AbortSignal | undefined;
            mockFetch.mockImplementation((_url, init?: RequestInit) => {
                return new Promise<Response>((_resolve, reject) => {
                    signal = init?.signal ?? undefined;
                    init?.signal?.addEventListener('abort', () => {
                        reject(new DOMException('aborted', 'AbortError'));
                    });
                });
            });

            const { result, unmount } = renderHook(() => useRecommenders(true));
            act(() => {
                void result.current.getRecommendations('home');
            });
            unmount();
            expect(signal?.aborted).toBe(true);
        });

        it('sets error on non-OK responses', async () => {
            mockFetch.mockResolvedValueOnce(buildResponse({} as Recommendation, false));
            const { result } = renderHook(() => useRecommenders(true));
            await act(async () => {
                await result.current.getRecommendations('home');
            });
            await waitFor(() => {
                expect(result.current.error).toBeTruthy();
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('sets error on fetch rejection', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            const { result } = renderHook(() => useRecommenders(true));
            await act(async () => {
                await result.current.getRecommendations('home');
            });
            await waitFor(() => {
                expect(result.current.error).toBeTruthy();
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('does NOT set error on AbortError', async () => {
            mockFetch.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
            const { result } = renderHook(() => useRecommenders(true));
            await act(async () => {
                await result.current.getRecommendations('home');
            });
            expect(result.current.error).toBeNull();
        });
    });

    describe('getZoneRecommendations', () => {
        it('sends type=zone as a query param', async () => {
            const { result } = renderHook(() => useRecommenders(true));
            await act(async () => {
                await result.current.getZoneRecommendations('home-zone');
            });

            const [url] = mockFetch.mock.calls[0] as [string];
            const parsed = new URL(url, 'http://localhost');
            expect(parsed.searchParams.get('recommenderName')).toBe('home-zone');
            expect(parsed.searchParams.get('type')).toBe('zone');
        });

        it('does not call fetch when disabled', async () => {
            const { result } = renderHook(() => useRecommenders(false));
            await act(async () => {
                await result.current.getZoneRecommendations('home-zone');
            });
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });
});
