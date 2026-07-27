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
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

import { useStoreLocatorList, type SearchStoresResult } from './use-store-locator-list';
import { resourceRoutes } from '@/route-paths';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import type { ShopperStores } from '@/scapi';

// Mock react-router useFetcher (called twice: once for store search, once for set-selected-store action)
const mockSearchFetcher = {
    state: 'idle' as 'idle' | 'loading',
    data: undefined as SearchStoresResult | undefined,
    load: vi.fn(),
    submit: vi.fn(),
};

const mockStoreFetcher = {
    state: 'idle' as 'idle' | 'loading',
    data: undefined,
    load: vi.fn(),
    submit: vi.fn(),
};

let fetcherCallCount = 0;
vi.mock('react-router', () => ({
    href: (path: string) => path,
    useFetcher: () => {
        fetcherCallCount++;
        // First call is the search fetcher, second is the store action fetcher
        return fetcherCallCount % 2 === 1 ? mockSearchFetcher : mockStoreFetcher;
    },
    createContext: vi.fn(),
}));

// Mock React to avoid createContext issues
vi.mock('react', async () => {
    const actual = await vi.importActual('react');
    return {
        ...actual,
        createContext: actual.createContext,
    };
});

// Mock store state used by the hook
const mockStore = {
    mode: 'input' as 'input' | 'device',
    searchParams: undefined as { countryCode: string; postalCode: string } | undefined,
    deviceCoordinates: { latitude: undefined as number | undefined, longitude: undefined as number | undefined },
    config: {
        radius: 25,
        radiusUnit: 'mi',
        limit: 50,
        supportedCountries: [{ countryCode: 'US', countryName: 'United States' }],
    },
    selectedStoreInfo: null as { id: string; name: string; inventoryId?: string } | null,
    setSelectedStoreInfo: vi.fn(),
    geoError: false,
    shouldSearch: false,
    setShouldSearch: vi.fn(),
};
vi.mock('@/extensions/store-locator/providers/store-locator', () => ({
    default: ({ children }: { children: React.ReactNode }) => children,
    useStoreLocator: (selector: any) => selector(mockStore),
}));

describe('useStoreLocatorList', () => {
    beforeEach(() => {
        fetcherCallCount = 0;
        mockSearchFetcher.state = 'idle';
        mockSearchFetcher.data = undefined;
        mockSearchFetcher.load.mockClear();
        mockSearchFetcher.submit.mockClear();
        mockStoreFetcher.state = 'idle';
        mockStoreFetcher.data = undefined;
        mockStoreFetcher.load.mockClear();
        mockStoreFetcher.submit.mockClear();
        mockStore.mode = 'input';
        mockStore.searchParams = undefined;
        mockStore.deviceCoordinates = { latitude: undefined, longitude: undefined };
        mockStore.shouldSearch = false;
        mockStore.setShouldSearch.mockClear();
        mockStore.selectedStoreInfo = null;
    });

    test('triggers search when shouldSearch and input params present', () => {
        mockStore.shouldSearch = true;
        mockStore.searchParams = { countryCode: 'US', postalCode: '94105' };
        renderHook(() => useStoreLocatorList(), { wrapper: AllProvidersWrapper });
        expect(mockSearchFetcher.load).toHaveBeenCalled();
        expect(mockStore.setShouldSearch).toHaveBeenCalledWith(false);
    });

    test('triggers search for device mode when coordinates present', () => {
        mockStore.mode = 'device';
        mockStore.shouldSearch = true;
        mockStore.deviceCoordinates = { latitude: 1, longitude: 2 };
        renderHook(() => useStoreLocatorList(), { wrapper: AllProvidersWrapper });
        expect(mockSearchFetcher.load).toHaveBeenCalled();
        expect(mockStore.setShouldSearch).toHaveBeenCalledWith(false);
    });

    test('exposes stores from fetcher data and supports pagination', async () => {
        // initial render — no data yet
        const { result, rerender } = renderHook(() => useStoreLocatorList(), { wrapper: AllProvidersWrapper });
        expect(result.current.stores).toEqual([]);

        // provide data from fetcher
        mockSearchFetcher.data = {
            success: true,
            stores: {
                data: new Array(15)
                    .fill(null)
                    .map((_, i) => ({ id: String(i) })) as unknown as ShopperStores.schemas['Store'][],
                limit: 15,
                total: 15,
            },
        };
        rerender();
        expect(result.current.stores.length).toBe(15);
        expect(result.current.storesPaginated.length).toBe(10);

        act(() => {
            result.current.setPage((p) => p + 1);
        });

        await waitFor(() => {
            expect(result.current.storesPaginated.length).toBe(15);
        });
    });

    test('submits to server action when store changes', () => {
        const { result } = renderHook(() => useStoreLocatorList(), { wrapper: AllProvidersWrapper });

        // Initially no submission
        expect(mockStoreFetcher.submit).not.toHaveBeenCalled();

        // Set a store
        act(() => {
            result.current.setSelectedStoreInfo({
                id: 'store1',
                name: 'Store 1',
                inventoryId: 'inv1',
            });
        });

        // Should submit to server action for cookie persistence
        expect(mockStoreFetcher.submit).toHaveBeenCalledTimes(1);
        expect(mockStore.setSelectedStoreInfo).toHaveBeenCalledWith({
            id: 'store1',
            name: 'Store 1',
            inventoryId: 'inv1',
        });

        // Verify the form data and action
        const [formData, options] = mockStoreFetcher.submit.mock.calls[0];
        expect(formData.get('storeInfo')).toBe(JSON.stringify({ id: 'store1', name: 'Store 1', inventoryId: 'inv1' }));
        expect(options).toEqual({ method: 'POST', action: resourceRoutes.setSelectedStore });
    });

    test('submits empty storeInfo when clearing store', () => {
        mockStore.selectedStoreInfo = {
            id: 'store1',
            name: 'Store 1',
            inventoryId: 'inv1',
        };

        const { result } = renderHook(() => useStoreLocatorList(), { wrapper: AllProvidersWrapper });

        // Clear the store
        act(() => {
            result.current.setSelectedStoreInfo(null);
        });

        // Should submit with empty storeInfo to clear cookie
        expect(mockStoreFetcher.submit).toHaveBeenCalledTimes(1);
        const [formData] = mockStoreFetcher.submit.mock.calls[0];
        expect(formData.get('storeInfo')).toBe('');
    });
});
