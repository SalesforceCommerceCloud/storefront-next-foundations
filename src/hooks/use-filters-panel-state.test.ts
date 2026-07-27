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
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useLocation } from 'react-router';
import { useNavigate } from '@/hooks/use-navigate';
import {
    FILTERS_CLOSED,
    FILTERS_OPEN,
    FILTERS_QUERY_PARAM,
    getSearchWithoutFiltersParam,
    getSearchWithoutActionParams,
    getSearchWithoutClientOnlyParams,
    getInitialFiltersOpen,
    useFiltersPanelState,
} from './use-filters-panel-state';

vi.mock('react-router', () => ({
    href: (path: string) => path,
    useLocation: vi.fn(),
}));

vi.mock('@/hooks/use-navigate', () => ({
    useNavigate: vi.fn(),
}));

describe('use-filters-panel-state', () => {
    const mockNavigate = vi.fn();
    const mockLocation = {
        pathname: '/search',
        search: '',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useLocation).mockReturnValue(mockLocation as ReturnType<typeof useLocation>);
        vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    });

    describe('getInitialFiltersOpen', () => {
        test('returns true when filters query param is open', () => {
            expect(getInitialFiltersOpen(new URLSearchParams('q=shoes&filters=open'))).toBe(true);
        });

        test('returns false when filters query param is closed or missing', () => {
            expect(getInitialFiltersOpen(new URLSearchParams('q=shoes&filters=closed'))).toBe(false);
            expect(getInitialFiltersOpen(new URLSearchParams('q=shoes'))).toBe(false);
        });
    });

    describe('getSearchWithoutFiltersParam', () => {
        test('removes filters from query string and preserves other params', () => {
            expect(getSearchWithoutFiltersParam('?q=boots&filters=open&refine=color:red')).toBe(
                '?q=boots&refine=color%3Ared'
            );
        });

        test('returns empty string when filters is the only param', () => {
            expect(getSearchWithoutFiltersParam('?filters=closed')).toBe('');
        });
    });

    describe('getSearchWithoutActionParams', () => {
        test('removes action and actionParams while preserving other params', () => {
            expect(
                getSearchWithoutActionParams('?q=shoes&action=addToWishlist&actionParams=%7B%7D&sort=price-asc')
            ).toBe('?q=shoes&sort=price-asc');
        });

        test('returns empty string when only action params are present', () => {
            expect(getSearchWithoutActionParams('?action=addToWishlist&actionParams=%7B%7D')).toBe('');
        });

        test('preserves filters param', () => {
            expect(getSearchWithoutActionParams('?filters=open&action=addToWishlist')).toBe('?filters=open');
        });

        test('returns empty string for empty search', () => {
            expect(getSearchWithoutActionParams('')).toBe('');
        });
    });

    describe('getSearchWithoutClientOnlyParams', () => {
        test('removes filters, action, and actionParams while preserving other params', () => {
            expect(
                getSearchWithoutClientOnlyParams(
                    '?q=shoes&filters=open&action=addToWishlist&actionParams=%7B%7D&sort=price-asc'
                )
            ).toBe('?q=shoes&sort=price-asc');
        });

        test('returns empty string when only client-only params are present', () => {
            expect(getSearchWithoutClientOnlyParams('?filters=open&action=addToWishlist&actionParams=%7B%7D')).toBe('');
        });

        test('preserves non-client-only params', () => {
            expect(getSearchWithoutClientOnlyParams('?q=shoes&offset=10&refine=color:red')).toBe(
                '?q=shoes&offset=10&refine=color%3Ared'
            );
        });
    });

    describe('useFiltersPanelState', () => {
        test('uses location search as source of truth on mount', () => {
            mockLocation.search = `?${FILTERS_QUERY_PARAM}=${FILTERS_CLOSED}`;
            const { result } = renderHook(() => useFiltersPanelState(true));
            expect(result.current[0]).toBe(false);

            mockLocation.search = `?q=boots&${FILTERS_QUERY_PARAM}=${FILTERS_OPEN}`;
            const rerendered = renderHook(() => useFiltersPanelState(false));
            expect(rerendered.result.current[0]).toBe(true);
        });

        test('toggleFiltersOpen sets filters=open and preserves existing params', () => {
            mockLocation.search = '?q=shoes';
            const { result } = renderHook(() => useFiltersPanelState(false));

            act(() => {
                result.current[1]();
            });

            expect(result.current[0]).toBe(true);
            expect(mockNavigate).toHaveBeenCalledWith(
                {
                    pathname: '/search',
                    search: '?q=shoes&filters=open',
                },
                { replace: true }
            );
        });

        test('toggleFiltersOpen sets filters=closed when currently open', () => {
            mockLocation.search = '?q=shoes&filters=open';
            const { result } = renderHook(() => useFiltersPanelState(true));

            act(() => {
                result.current[1]();
            });

            expect(result.current[0]).toBe(false);
            expect(mockNavigate).toHaveBeenCalledWith(
                {
                    pathname: '/search',
                    search: '?q=shoes&filters=closed',
                },
                { replace: true }
            );
        });
    });

    test('exports stable query param constants', () => {
        expect(FILTERS_QUERY_PARAM).toBe('filters');
        expect(FILTERS_OPEN).toBe('open');
        expect(FILTERS_CLOSED).toBe('closed');
    });
});
