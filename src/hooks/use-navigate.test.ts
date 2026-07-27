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
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getSiteRef, mockSiteObject } from '@/test-utils/config';
import { useNavigate } from './use-navigate';

const mockRouterNavigate = vi.fn();

vi.mock('react-router', () => ({
    href: (path: string) => path,
    useNavigate: () => mockRouterNavigate,
}));

vi.mock('@salesforce/storefront-next-runtime/site-context', () => ({
    buildUrl: vi.fn(
        ({ to, urlConfig, params }: { to: string; urlConfig?: unknown; params: Record<string, string> }) => {
            if (!urlConfig) return to;
            return `/${params.siteId}/${params.localeId}${to}`;
        }
    ),
}));

vi.mock('@salesforce/storefront-next-runtime/config', () => ({
    useConfig: () => ({
        url: { prefix: '/:siteId/:localeId' },
    }),
}));

vi.mock('@/hooks/use-current-site-and-locale-ref', () => ({
    useCurrentSiteAndLocaleRef: () => ({
        siteRef: getSiteRef(),
        localeRef: mockSiteObject.defaultLocale,
    }),
}));

describe('useNavigate', () => {
    beforeEach(() => {
        mockRouterNavigate.mockClear();
    });

    describe('numeric to (history navigation)', () => {
        it('passes through navigate(-1) unchanged', () => {
            const { result } = renderHook(() => useNavigate());

            act(() => {
                void result.current(-1);
            });

            expect(mockRouterNavigate).toHaveBeenCalledWith(-1);
        });

        it('passes through navigate(1) unchanged', () => {
            const { result } = renderHook(() => useNavigate());

            act(() => {
                void result.current(1);
            });

            expect(mockRouterNavigate).toHaveBeenCalledWith(1);
        });

        it('does not pass options for numeric navigation', () => {
            const { result } = renderHook(() => useNavigate());

            act(() => {
                void result.current(-2);
            });

            expect(mockRouterNavigate).toHaveBeenCalledWith(-2);
            expect(mockRouterNavigate).toHaveBeenCalledTimes(1);
        });
    });

    describe('string to', () => {
        it('transforms a string path with site context', () => {
            const { result } = renderHook(() => useNavigate());

            act(() => {
                void result.current('/product/123');
            });

            expect(mockRouterNavigate).toHaveBeenCalledWith('/global/en-GB/product/123', undefined);
        });

        it('transforms root path with site context', () => {
            const { result } = renderHook(() => useNavigate());

            act(() => {
                void result.current('/');
            });

            expect(mockRouterNavigate).toHaveBeenCalledWith('/global/en-GB/', undefined);
        });

        it('forwards NavigateOptions for string paths', () => {
            const { result } = renderHook(() => useNavigate());
            const options = { replace: true, state: { from: 'checkout' } };

            act(() => {
                void result.current('/cart', options);
            });

            expect(mockRouterNavigate).toHaveBeenCalledWith('/global/en-GB/cart', options);
        });
    });

    describe('object to with pathname', () => {
        it('transforms the pathname and preserves other properties', () => {
            const { result } = renderHook(() => useNavigate());

            act(() => {
                void result.current({ pathname: '/product/123', search: '?color=red' });
            });

            expect(mockRouterNavigate).toHaveBeenCalledWith(
                { pathname: '/global/en-GB/product/123', search: '?color=red' },
                undefined
            );
        });

        it('transforms pathname and preserves hash', () => {
            const { result } = renderHook(() => useNavigate());

            act(() => {
                void result.current({ pathname: '/product/123', hash: '#details' });
            });

            expect(mockRouterNavigate).toHaveBeenCalledWith(
                { pathname: '/global/en-GB/product/123', hash: '#details' },
                undefined
            );
        });

        it('forwards NavigateOptions for object paths', () => {
            const { result } = renderHook(() => useNavigate());
            const options = { replace: true };

            act(() => {
                void result.current({ pathname: '/checkout' }, options);
            });

            expect(mockRouterNavigate).toHaveBeenCalledWith({ pathname: '/global/en-GB/checkout' }, options);
        });
    });

    describe('object to without pathname', () => {
        it('passes through search-only object unchanged', () => {
            const { result } = renderHook(() => useNavigate());

            act(() => {
                void result.current({ search: '?q=shoes' });
            });

            expect(mockRouterNavigate).toHaveBeenCalledWith({ search: '?q=shoes' }, undefined);
        });

        it('passes through hash-only object unchanged', () => {
            const { result } = renderHook(() => useNavigate());

            act(() => {
                void result.current({ hash: '#section' });
            });

            expect(mockRouterNavigate).toHaveBeenCalledWith({ hash: '#section' }, undefined);
        });

        it('forwards NavigateOptions for passthrough objects', () => {
            const { result } = renderHook(() => useNavigate());
            const options = { preventScrollReset: true };

            act(() => {
                void result.current({ search: '?page=2' }, options);
            });

            expect(mockRouterNavigate).toHaveBeenCalledWith({ search: '?page=2' }, options);
        });
    });
});
