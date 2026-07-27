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
import { useEffect, useRef } from 'react';
import { useFetchers, useNavigation, useRevalidator } from 'react-router';
import { parseBasketCookie } from '@/lib/basket/cookie';

/** The basket identity the route rendered with, used to detect a cross-tab change on return. */
export type RenderedBasketIdentity = {
    basketId?: string;
    lastModified?: string;
};

/**
 * Revalidates the current route when the user returns to this tab and the basket cookie shows a
 * different basket (by `basketId`) or a newer revision (by `lastModified`) than the one the route
 * last rendered with.
 *
 * Reads the cookie at trigger time (visibilitychange/focus) rather than from React state. The
 * BasketProvider's cookie store uses a no-op subscribe, so its snapshot value is only updated on
 * React re-renders - which do not happen on a backgrounded tab. Reading document.cookie directly in
 * the handler gives the live value that the browser synced from another tab.
 *
 * Comparison keys on BOTH `basketId` and `lastModified`: a basket swap in another tab (guest →
 * registered handoff, or destroy + recreate) can change `basketId` while leaving `lastModified`
 * unchanged or empty, so keying on `lastModified` alone would miss it. An empty `lastModified` on
 * either side is treated as unknown freshness and triggers revalidation rather than being assumed
 * unchanged - the cost is one extra loader pass on return, which is the feature's accepted failure
 * mode (see changeset).
 *
 * Triggers on `visibilitychange → visible` and `focus`. Skips revalidation when navigation, any
 * fetcher, or an existing revalidation is in flight to avoid interrupting mid-input interactions.
 * Treats a missing or malformed cookie as no change signal.
 *
 * @param rendered - The basket identity the route rendered with. Pass
 *   `{ basketId: basket?.basketId, lastModified: basket?.lastModified }` from the loader data.
 */
export function useRevalidateOnReturn(rendered: RenderedBasketIdentity): void {
    const revalidator = useRevalidator();
    const navigation = useNavigation();
    const fetchers = useFetchers();

    const revalidatorRef = useRef(revalidator);
    const navigationRef = useRef(navigation);
    const fetchersRef = useRef(fetchers);
    const renderedRef = useRef(rendered);

    // Mirror the latest values into refs after each commit so the persistent event
    // handlers always read current state. Writing refs in an effect (not during
    // render) keeps render pure under concurrent rendering.
    useEffect(() => {
        revalidatorRef.current = revalidator;
        navigationRef.current = navigation;
        fetchersRef.current = fetchers;
        renderedRef.current = rendered;
    });

    useEffect(() => {
        const tryRevalidate = () => {
            // Read the live cookie at trigger time. The BasketProvider's
            // useSyncExternalStore subscribe is a no-op, so React's committed
            // snapshot value is stale on a backgrounded tab that had no renders.
            if (typeof document === 'undefined') {
                return;
            }
            const liveSnapshot = parseBasketCookie(document.cookie);

            // A missing or malformed cookie carries no change signal.
            if (!liveSnapshot) {
                return;
            }

            // Decide whether the live basket differs from what the route rendered with. A different
            // basketId means the basket was swapped in another tab; a different lastModified means it
            // was mutated. An empty lastModified on either side is unknown freshness, so refresh to be
            // safe rather than assume unchanged.
            const renderedIdentity = renderedRef.current;
            const basketChanged = liveSnapshot.basketId !== renderedIdentity.basketId;
            const revisionChanged = liveSnapshot.lastModified !== (renderedIdentity.lastModified ?? '');
            const freshnessUnknown = !liveSnapshot.lastModified || !renderedIdentity.lastModified;
            if (!basketChanged && !revisionChanged && !freshnessUnknown) {
                return;
            }

            // Do not interrupt in-flight navigation, mutations, or an ongoing revalidation.
            if (navigationRef.current.state !== 'idle') {
                return;
            }
            if (fetchersRef.current.some((f) => f.state !== 'idle')) {
                return;
            }
            if (revalidatorRef.current.state !== 'idle') {
                return;
            }

            void revalidatorRef.current.revalidate();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                tryRevalidate();
            }
        };

        // Returning to a tab often fires both `focus` and `visibilitychange`. A double
        // call is harmless: React Router coalesces concurrent revalidations into one
        // loader pass, and the idle guard above skips the second call once one is running.
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', tryRevalidate);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', tryRevalidate);
        };
        // Empty deps: the handlers read all state through refs and document.cookie
        // directly. This mirrors the BackNavigationRevalidator pattern in root.tsx.
    }, []);
}
