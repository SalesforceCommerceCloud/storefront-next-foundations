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

/**
 * Single source of truth for the mini-cart's UI state — whether the flyout is `open` and whether its data panel is
 * `panelMounted`. There is one mini cart per client, so a module-scoped external store fits: no provider to thread, and
 * the state is reachable from both inside and outside the React tree. Three decisions:
 *
 * - **Store, not context.** The state has two kinds of reader: one inside React that re-renders when a slice changes, and
 *   one outside React (a router lifecycle callback) that needs a synchronous read where hooks and context are
 *   unavailable. Context cannot serve the second, so one external store serves both — {@link useMiniCartStore} for the
 *   reactive read, {@link isMiniCartPanelMounted} for the synchronous one.
 * - **Leaf module.** This module imports only `react`, so it stays a safe dependency for a server-side route `loader`
 *   without dragging in client-only code or forming an import cycle. State lives here; the lifecycle that flips
 *   `panelMounted` is driven from wherever the data panel mounts.
 * - **Slice selectors.** `open` and `panelMounted` have independent writers, so subscribing to a single slice avoids
 *   re-rendering a consumer when the other slice changes.
 *
 * SSR: the store mutates only via client handlers/effects, never during server render. {@link useMiniCartStore}'s server
 * snapshot reads a frozen closed state, so SSR HTML always renders the flyout closed and the post-hydration client read
 * may diverge without a mismatch warning.
 */
import { useSyncExternalStore } from 'react';

interface MiniCartState {
    /** Whether the mini-cart flyout is open. */
    open: boolean;
    /** Whether the flyout's data panel (the `useMiniCartData` consumer) is currently mounted. */
    panelMounted: boolean;
}

let state: MiniCartState = { open: false, panelMounted: false };

// Frozen closed state for the server snapshot — see the SSR note in the module docblock. Selecting from this rather than
// the live `state` guarantees SSR renders the flyout closed even if the module variable were somehow non-default.
const SERVER_STATE: MiniCartState = Object.freeze({ open: false, panelMounted: false });

const listeners = new Set<() => void>();

const setState = (partial: Partial<MiniCartState>): void => {
    const next = { ...state, ...partial };
    // Skip the notify when nothing actually changed so identical writes (e.g. a no-op toggle) don't wake subscribers.
    if (next.open === state.open && next.panelMounted === state.panelMounted) {
        return;
    }
    state = next;
    for (const listener of listeners) {
        listener();
    }
};

const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

/** Opens or closes the mini-cart flyout. Callable from anywhere — event handlers, effects, or other modules. */
export const setMiniCartOpen = (open: boolean): void => setState({ open });

/** Marks the mini-cart data panel as mounted. Call from the data panel's mount effect. */
export const markMiniCartPanelMounted = (): void => setState({ panelMounted: true });

/** Marks the mini-cart data panel as unmounted. Call from the data panel's unmount cleanup. */
export const markMiniCartPanelUnmounted = (): void => setState({ panelMounted: false });

/**
 * Whether the mini-cart data panel is currently mounted. A synchronous, non-reactive read for callers outside the React
 * tree. The value is meaningful on the client only; on the server it stays `false`.
 */
export const isMiniCartPanelMounted = (): boolean => state.panelMounted;

/**
 * Subscribes to a slice of the mini-cart store, re-rendering the caller only when the selected value changes.
 *
 * The selector MUST return a primitive (or an otherwise referentially-stable value): `useSyncExternalStore` compares
 * successive snapshots with `Object.is`, so a selector that allocates a fresh object every call would loop forever. All
 * current consumers select a single boolean.
 */
export function useMiniCartStore<T>(selector: (state: MiniCartState) => T): T {
    return useSyncExternalStore(
        subscribe,
        () => selector(state),
        () => selector(SERVER_STATE)
    );
}
