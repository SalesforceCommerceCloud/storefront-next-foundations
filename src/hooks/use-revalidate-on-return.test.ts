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
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRevalidateOnReturn } from './use-revalidate-on-return';
import { BASKET_COOKIE_NAME } from '@/lib/basket/cookie';

// --- react-router mocks ---

const mockRevalidate = vi.fn();
let mockNavigationState: 'idle' | 'loading' | 'submitting' = 'idle';
let mockFetchers: Array<{ state: 'idle' | 'loading' | 'submitting' }> = [];
let mockRevalidatorState: 'idle' | 'loading' = 'idle';

vi.mock('react-router', () => ({
    useRevalidator: () => ({ revalidate: mockRevalidate, state: mockRevalidatorState }),
    useNavigation: () => ({ state: mockNavigationState }),
    useFetchers: () => mockFetchers,
}));

// --- cookie helpers ---

// Write a valid basket cookie into document.cookie with no intervening React render.
const writeBasketCookie = (lastModified: string, basketId = 'basket-123') => {
    const payload = JSON.stringify({
        basketId,
        totalItemCount: 1,
        uniqueProductCount: 1,
        lastModified,
    });
    document.cookie = `${BASKET_COOKIE_NAME}=${btoa(payload)}; path=/`;
};

const clearBasketCookie = () => {
    document.cookie = `${BASKET_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

// The basket identity the route "rendered with" for tests that should NOT revalidate (matching id,
// known non-empty timestamp). Cases that should revalidate diverge from this on purpose.
const RENDERED = { basketId: 'basket-123', lastModified: '2026-06-29T10:00:00.000Z' };

// Helpers to fire browser events
const triggerVisibilityVisible = () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
    });
};

const triggerWindowFocus = () => {
    act(() => {
        window.dispatchEvent(new Event('focus'));
    });
};

describe('useRevalidateOnReturn', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigationState = 'idle';
        mockFetchers = [];
        mockRevalidatorState = 'idle';
        clearBasketCookie();
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    });

    describe('real return-to-tab path: cookie mutated after render with NO re-render', () => {
        it('revalidates on visibilitychange when the cookie lastModified is newer', async () => {
            // Render with T1. No cookie is present yet (cleared in beforeEach).
            renderHook(() => useRevalidateOnReturn(RENDERED));

            // The browser syncs a newer revision of the SAME basket from another tab. No re-render.
            writeBasketCookie('2026-06-29T11:00:00.000Z');

            triggerVisibilityVisible();

            await waitFor(() => {
                expect(mockRevalidate).toHaveBeenCalledOnce();
            });
        });

        it('revalidates when the cookie basketId differs (basket swapped in another tab) even if lastModified matches', async () => {
            // Guest → registered handoff / destroy + recreate can swap basketId while the timestamp is
            // unchanged. Keying on lastModified alone would miss this; keying on basketId catches it.
            renderHook(() => useRevalidateOnReturn(RENDERED));

            writeBasketCookie(RENDERED.lastModified, 'basket-999');

            triggerVisibilityVisible();

            await waitFor(() => {
                expect(mockRevalidate).toHaveBeenCalledOnce();
            });
        });

        it('revalidates when freshness is unknown (cookie lastModified is empty)', async () => {
            // A pre-existing or freshly-created basket can carry an empty lastModified. Treat unknown
            // freshness as a refresh signal rather than assuming unchanged.
            renderHook(() => useRevalidateOnReturn(RENDERED));

            writeBasketCookie('');

            triggerVisibilityVisible();

            await waitFor(() => {
                expect(mockRevalidate).toHaveBeenCalledOnce();
            });
        });

        it('revalidates when the rendered basket had no lastModified (unknown freshness)', async () => {
            // The route rendered with a timestamp-less basket; any live cookie is unknown-vs-unknown.
            renderHook(() => useRevalidateOnReturn({ basketId: 'basket-123', lastModified: '' }));

            writeBasketCookie('2026-06-29T11:00:00.000Z');

            triggerVisibilityVisible();

            await waitFor(() => {
                expect(mockRevalidate).toHaveBeenCalledOnce();
            });
        });

        it('does NOT revalidate when basketId and lastModified both match the rendered basket', () => {
            renderHook(() => useRevalidateOnReturn(RENDERED));

            // Same basket, same revision - no change.
            writeBasketCookie(RENDERED.lastModified, RENDERED.basketId);

            triggerVisibilityVisible();

            expect(mockRevalidate).not.toHaveBeenCalled();
        });

        it('does NOT revalidate when cookie is absent', () => {
            renderHook(() => useRevalidateOnReturn(RENDERED));
            // Cookie stays cleared. Trigger return.
            triggerVisibilityVisible();
            expect(mockRevalidate).not.toHaveBeenCalled();
        });

        it('does NOT revalidate when navigation is in flight', () => {
            // Navigation is already loading at render time (the shopper is mid-navigation
            // when the tab returns). The hook renders with this in-flight state in its refs.
            mockNavigationState = 'loading';
            renderHook(() => useRevalidateOnReturn(RENDERED));
            writeBasketCookie('2026-06-29T11:00:00.000Z');

            triggerVisibilityVisible();

            expect(mockRevalidate).not.toHaveBeenCalled();
        });

        it('does NOT revalidate when a fetcher is submitting', () => {
            // Fetcher is already submitting at render time.
            mockFetchers = [{ state: 'submitting' }];
            renderHook(() => useRevalidateOnReturn(RENDERED));
            writeBasketCookie('2026-06-29T11:00:00.000Z');

            triggerVisibilityVisible();

            expect(mockRevalidate).not.toHaveBeenCalled();
        });

        it('does NOT revalidate when a fetcher is loading', () => {
            // Fetcher is already loading at render time.
            mockFetchers = [{ state: 'loading' }];
            renderHook(() => useRevalidateOnReturn(RENDERED));
            writeBasketCookie('2026-06-29T11:00:00.000Z');

            triggerVisibilityVisible();

            expect(mockRevalidate).not.toHaveBeenCalled();
        });

        it('does NOT revalidate when a revalidation is already in flight', () => {
            // The revalidator is already running (e.g. a prior trigger started one).
            mockRevalidatorState = 'loading';
            renderHook(() => useRevalidateOnReturn(RENDERED));
            writeBasketCookie('2026-06-29T11:00:00.000Z');

            triggerVisibilityVisible();

            expect(mockRevalidate).not.toHaveBeenCalled();
        });
    });

    describe('focus trigger', () => {
        it('revalidates on window focus when the cookie lastModified is newer', async () => {
            renderHook(() => useRevalidateOnReturn(RENDERED));

            // Cookie updated in another tab, no React re-render.
            writeBasketCookie('2026-06-29T12:00:00.000Z');

            triggerWindowFocus();

            await waitFor(() => {
                expect(mockRevalidate).toHaveBeenCalledOnce();
            });
        });

        it('does NOT revalidate on focus when basketId and lastModified both match rendered', () => {
            renderHook(() => useRevalidateOnReturn(RENDERED));
            writeBasketCookie(RENDERED.lastModified, RENDERED.basketId);

            triggerWindowFocus();

            expect(mockRevalidate).not.toHaveBeenCalled();
        });

        it('does NOT revalidate on focus when navigation is not idle', () => {
            // Navigation is already submitting at render time.
            mockNavigationState = 'submitting';
            renderHook(() => useRevalidateOnReturn(RENDERED));
            writeBasketCookie('2026-06-29T12:00:00.000Z');

            triggerWindowFocus();

            expect(mockRevalidate).not.toHaveBeenCalled();
        });
    });

    describe('event listener cleanup', () => {
        it('removes event listeners on unmount', () => {
            const removeDocSpy = vi.spyOn(document, 'removeEventListener');
            const removeWinSpy = vi.spyOn(window, 'removeEventListener');

            const { unmount } = renderHook(() => useRevalidateOnReturn(RENDERED));
            unmount();

            expect(removeDocSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
            expect(removeWinSpy).toHaveBeenCalledWith('focus', expect.any(Function));
        });
    });
});
