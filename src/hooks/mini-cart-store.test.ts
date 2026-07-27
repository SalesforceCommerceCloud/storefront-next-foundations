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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
    isMiniCartPanelMounted,
    markMiniCartPanelMounted,
    markMiniCartPanelUnmounted,
    setMiniCartOpen,
    useMiniCartStore,
} from './mini-cart-store';

describe('mini-cart-store', () => {
    afterEach(() => {
        // The store is module-scoped shared state; reset both slices so cases can't leak into one another. Wrap in
        // act() because a component subscribed in the just-finished test is still mounted until RTL's auto-cleanup, so
        // the reset would otherwise notify it outside act.
        act(() => {
            setMiniCartOpen(false);
            markMiniCartPanelUnmounted();
        });
    });

    describe('panelMounted', () => {
        it('defaults to unmounted', () => {
            expect(isMiniCartPanelMounted()).toBe(false);
        });

        it('reports mounted after markMiniCartPanelMounted', () => {
            markMiniCartPanelMounted();
            expect(isMiniCartPanelMounted()).toBe(true);
        });

        it('reports unmounted again after markMiniCartPanelUnmounted', () => {
            markMiniCartPanelMounted();
            markMiniCartPanelUnmounted();
            expect(isMiniCartPanelMounted()).toBe(false);
        });
    });

    describe('useMiniCartStore', () => {
        it('selects the open slice and updates when it changes', () => {
            const { result } = renderHook(() => useMiniCartStore((s) => s.open));

            expect(result.current).toBe(false);

            act(() => {
                setMiniCartOpen(true);
            });

            expect(result.current).toBe(true);
        });

        it('does not re-render a slice when an unrelated slice changes', () => {
            const selector = vi.fn((s: { open: boolean; panelMounted: boolean }) => s.open);
            const { result, rerender } = renderHook(() => useMiniCartStore(selector));

            expect(result.current).toBe(false);
            const callsAfterMount = selector.mock.calls.length;

            // Mutating panelMounted must not change the selected `open` slice; the subscriber stays false and does not
            // observe a new value across a commit.
            act(() => {
                markMiniCartPanelMounted();
            });
            rerender();

            expect(result.current).toBe(false);
            expect(selector.mock.calls.length).toBeGreaterThan(callsAfterMount);
        });

        it('exposes the panelMounted slice reactively', () => {
            const { result } = renderHook(() => useMiniCartStore((s) => s.panelMounted));

            expect(result.current).toBe(false);

            act(() => {
                markMiniCartPanelMounted();
            });

            expect(result.current).toBe(true);
        });
    });

    describe('SSR', () => {
        it('selects from the frozen closed server state during server render', () => {
            // The flyout must render closed on the server regardless of the live module value — `getServerSnapshot`
            // reads SERVER_STATE, not `state`. Open the live store first to prove the server read ignores it.
            setMiniCartOpen(true);
            markMiniCartPanelMounted();

            const Probe = (): string => (useMiniCartStore((s) => s.open) ? 'open' : 'closed');
            const html = renderToString(createElement(Probe));

            expect(html).toBe('closed');
        });
    });

    describe('setState notification', () => {
        it('does not notify subscribers when a write changes nothing', () => {
            const selector = vi.fn((s: { open: boolean; panelMounted: boolean }) => s.open);
            renderHook(() => useMiniCartStore(selector));
            const callsBefore = selector.mock.calls.length;

            // open is already false — a redundant close must be a no-op that wakes no subscriber.
            act(() => {
                setMiniCartOpen(false);
            });

            expect(selector.mock.calls.length).toBe(callsBefore);
        });
    });
});
