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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeResource } from './resource-encoding';

describe('fetcher registry', () => {
    const res = (client: string, method: string, options: unknown = {}) => encodeResource(client, method, options);

    // The registry is module-level singleton state. Reset the module graph and re-import before each test so every
    // case starts with an empty registry — no test-only reset hook needed in the production module.
    let createFetcherRegistration: typeof import('./fetcher-registry').createFetcherRegistration;
    let invokeMatchingFetchers: typeof import('./fetcher-registry').invokeMatchingFetchers;

    beforeEach(async () => {
        vi.resetModules();
        ({ createFetcherRegistration, invokeMatchingFetchers } = await import('./fetcher-registry'));
    });

    it('replays only the load invocations whose resource matches the predicate', () => {
        const loadProduct = vi.fn(async () => {});
        const loadBasket = vi.fn(async () => {});
        createFetcherRegistration(res('shopperProducts', 'getProduct', { params: { path: { id: 'A' } } })).register(
            loadProduct,
            '/resource/api/client/product'
        );
        createFetcherRegistration(res('shopperBaskets', 'getBasket')).register(
            loadBasket,
            '/resource/api/client/basket'
        );

        invokeMatchingFetchers((i) => i.client === 'shopperProducts');

        expect(loadProduct).toHaveBeenCalledTimes(1);
        expect(loadBasket).not.toHaveBeenCalled();
    });

    it('replays the load invocation with the params captured at registration', () => {
        const load = vi.fn(async () => {});
        createFetcherRegistration(res('shopperProducts', 'getProduct')).register(load, '/resource/api/client/product', {
            flushSync: true,
        });

        invokeMatchingFetchers(() => true);

        expect(load).toHaveBeenCalledWith('/resource/api/client/product', { flushSync: true });
    });

    it('passes the decoded options to the predicate for param-level scoping', () => {
        const loadA = vi.fn(async () => {});
        const loadB = vi.fn(async () => {});
        createFetcherRegistration(res('shopperProducts', 'getProduct', { params: { path: { id: 'A' } } })).register(
            loadA,
            '/a'
        );
        createFetcherRegistration(res('shopperProducts', 'getProduct', { params: { path: { id: 'B' } } })).register(
            loadB,
            '/b'
        );

        invokeMatchingFetchers((i) => (i.options as { params?: { path?: { id?: string } } })?.params?.path?.id === 'A');

        expect(loadA).toHaveBeenCalledTimes(1);
        expect(loadB).not.toHaveBeenCalled();
    });

    it('leaves no registry entry for a handle that never registers an invocation', () => {
        const load = vi.fn(async () => {});
        // Open a handle but never call register() — it must not occupy a slot.
        createFetcherRegistration(res('shopperProducts', 'getProduct'));

        // A second key that does register, to prove the walk runs at all.
        createFetcherRegistration(res('shopperBaskets', 'getBasket')).register(load, '/basket');

        invokeMatchingFetchers(() => true);

        expect(load).toHaveBeenCalledTimes(1);
    });

    it('unregister removes the entry so it is no longer replayed', () => {
        const load = vi.fn(async () => {});
        const registration = createFetcherRegistration(res('shopperProducts', 'getProduct'));
        registration.register(load, '/product');
        registration.unregister();

        invokeMatchingFetchers(() => true);

        expect(load).not.toHaveBeenCalled();
    });

    it('unregister is idempotent', () => {
        const load = vi.fn(async () => {});
        const registration = createFetcherRegistration(res('shopperProducts', 'getProduct'));
        registration.register(load, '/product');

        registration.unregister();
        expect(() => registration.unregister()).not.toThrow();

        invokeMatchingFetchers(() => true);
        expect(load).not.toHaveBeenCalled();
    });

    it('re-registering the same key replaces the prior load reference', () => {
        const key = res('shopperProducts', 'getProduct');
        const stale = vi.fn(async () => {});
        const fresh = vi.fn(async () => {});
        createFetcherRegistration(key).register(stale, '/product');
        createFetcherRegistration(key).register(fresh, '/product');

        invokeMatchingFetchers(() => true);

        expect(stale).not.toHaveBeenCalled();
        expect(fresh).toHaveBeenCalledTimes(1);
    });

    it('skips entries whose key cannot be decoded rather than throwing', () => {
        const load = vi.fn(async () => {});
        createFetcherRegistration('not-base64url!!').register(load, '/x');

        expect(() => invokeMatchingFetchers(() => true)).not.toThrow();
        expect(load).not.toHaveBeenCalled();
    });

    it('a stale unregister does not remove a re-registered entry', () => {
        const key = res('shopperProducts', 'getProduct');
        const first = vi.fn(async () => {});
        const firstRegistration = createFetcherRegistration(key);
        firstRegistration.register(first, '/product');

        // Re-register the same key with a fresh load, then run the *stale* unregister: it must not evict the newer
        // entry, because that entry is no longer the one the stale handle owns.
        const second = vi.fn(async () => {});
        createFetcherRegistration(key).register(second, '/product');
        firstRegistration.unregister();

        invokeMatchingFetchers(() => true);
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
    });

    // React Router shares one fetcher state across every `useScapiFetcher` with the same encoded key, so the registry
    // entry must outlive every mounted handle — not just the most recently registered one.
    describe('shared key (multiple handles, one fetcher state)', () => {
        it('keeps replaying for a surviving handle after a sibling under the same key unregisters', () => {
            const key = res('shopperProducts', 'getProduct', { params: { path: { id: 'A' } } });
            // Both handles for the same key produce functionally-identical replays — `() => fetcher.load(href)` against
            // React Router's single shared fetcher state — so one bound load models either.
            const load = vi.fn(async () => {});

            const survivor = createFetcherRegistration(key);
            survivor.register(load, '/product');
            const sibling = createFetcherRegistration(key);
            sibling.register(load, '/product');

            // The sibling unmounts; the survivor is still mounted and must remain revalidatable.
            sibling.unregister();

            invokeMatchingFetchers(() => true);
            expect(load).toHaveBeenCalledTimes(1);
        });

        it('removes the entry only once the last handle under the key unregisters', () => {
            const key = res('shopperProducts', 'getProduct');
            const load = vi.fn(async () => {});

            const a = createFetcherRegistration(key);
            a.register(load, '/product');
            const b = createFetcherRegistration(key);
            b.register(load, '/product');

            a.unregister();
            // One handle is gone, but `b` still holds the shared fetcher — the entry must persist.
            invokeMatchingFetchers(() => true);
            expect(load).toHaveBeenCalledTimes(1);

            load.mockClear();
            b.unregister();
            // Last handle gone: the entry is removed and nothing replays.
            invokeMatchingFetchers(() => true);
            expect(load).not.toHaveBeenCalled();
        });
    });
});
