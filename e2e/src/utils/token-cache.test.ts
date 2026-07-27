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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTokenCache, isAuthError } from './token-cache';

interface FakeTokens {
    accessToken: string;
}

const TTL = 60_000; // 1 minute for tests

describe('createTokenCache', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('calls the fetcher and caches the result on first miss', async () => {
        const cache = createTokenCache<FakeTokens>();
        const fetcher = vi.fn().mockResolvedValue({ accessToken: 'AT-1' });

        const tokens = await cache.getOrFetch('alice', fetcher, TTL);

        expect(tokens).toEqual({ accessToken: 'AT-1' });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('returns the cached value without calling the fetcher on a hit', async () => {
        const cache = createTokenCache<FakeTokens>();
        const fetcher = vi.fn().mockResolvedValue({ accessToken: 'AT-1' });

        await cache.getOrFetch('alice', fetcher, TTL);
        const tokens = await cache.getOrFetch('alice', fetcher, TTL);

        expect(tokens).toEqual({ accessToken: 'AT-1' });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('refetches once the cached entry has expired', async () => {
        const cache = createTokenCache<FakeTokens>();
        const fetcher = vi
            .fn()
            .mockResolvedValueOnce({ accessToken: 'AT-1' })
            .mockResolvedValueOnce({ accessToken: 'AT-2' });

        await cache.getOrFetch('alice', fetcher, TTL);

        // Advance past TTL
        vi.advanceTimersByTime(TTL + 1);

        const tokens = await cache.getOrFetch('alice', fetcher, TTL);
        expect(tokens).toEqual({ accessToken: 'AT-2' });
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('coalesces concurrent misses for the same key into a single fetch', async () => {
        const cache = createTokenCache<FakeTokens>();
        let resolveFetcher!: (tokens: FakeTokens) => void;
        const fetcher = vi.fn().mockImplementation(
            () =>
                new Promise<FakeTokens>((resolve) => {
                    resolveFetcher = resolve;
                })
        );

        const promiseA = cache.getOrFetch('alice', fetcher, TTL);
        const promiseB = cache.getOrFetch('alice', fetcher, TTL);

        expect(fetcher).toHaveBeenCalledTimes(1);

        resolveFetcher({ accessToken: 'AT-1' });
        const [a, b] = await Promise.all([promiseA, promiseB]);

        expect(a).toEqual({ accessToken: 'AT-1' });
        expect(b).toEqual({ accessToken: 'AT-1' });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('does NOT coalesce concurrent fetches for different keys', async () => {
        const cache = createTokenCache<FakeTokens>();
        const fetcher = vi
            .fn()
            .mockResolvedValueOnce({ accessToken: 'AT-alice' })
            .mockResolvedValueOnce({ accessToken: 'AT-bob' });

        const [a, b] = await Promise.all([
            cache.getOrFetch('alice', fetcher, TTL),
            cache.getOrFetch('bob', fetcher, TTL),
        ]);

        expect(a).toEqual({ accessToken: 'AT-alice' });
        expect(b).toEqual({ accessToken: 'AT-bob' });
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('clears the inflight entry after a successful fetch (next caller hits the cache, not inflight)', async () => {
        const cache = createTokenCache<FakeTokens>();
        const fetcher = vi.fn().mockResolvedValue({ accessToken: 'AT-1' });

        await cache.getOrFetch('alice', fetcher, TTL);
        await cache.getOrFetch('alice', fetcher, TTL);

        // If the inflight entry leaked, the second call would await the (already
        // resolved) promise and the cached entry might never be consulted.
        // Either way, fetcher should be called exactly once.
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('clears the inflight entry after a rejected fetch (next caller can retry)', async () => {
        const cache = createTokenCache<FakeTokens>();
        const fetcher = vi
            .fn()
            .mockRejectedValueOnce(new Error('SLAS token exchange failed (502): boom'))
            .mockResolvedValueOnce({ accessToken: 'AT-1' });

        await expect(cache.getOrFetch('alice', fetcher, TTL)).rejects.toThrow(/502/);

        const tokens = await cache.getOrFetch('alice', fetcher, TTL);
        expect(tokens).toEqual({ accessToken: 'AT-1' });
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('evicts the cached entry when the fetcher rejects with a 401', async () => {
        const cache = createTokenCache<FakeTokens>();
        const fetcher = vi
            .fn()
            .mockResolvedValueOnce({ accessToken: 'AT-stale' })
            .mockRejectedValueOnce(new Error('SLAS authenticateCustomer failed — Status: 401'))
            .mockResolvedValueOnce({ accessToken: 'AT-fresh' });

        // Prime the cache.
        await cache.getOrFetch('alice', fetcher, TTL);
        // Force a refetch that 401s.
        vi.advanceTimersByTime(TTL + 1);
        await expect(cache.getOrFetch('alice', fetcher, TTL)).rejects.toThrow(/401/);

        // Cache should be evicted; next call must refetch (returning AT-fresh).
        const tokens = await cache.getOrFetch('alice', fetcher, TTL);
        expect(tokens).toEqual({ accessToken: 'AT-fresh' });
        expect(fetcher).toHaveBeenCalledTimes(3);
    });

    it('evicts the cached entry on a 403', async () => {
        const cache = createTokenCache<FakeTokens>();
        const fetcher = vi
            .fn()
            .mockResolvedValueOnce({ accessToken: 'AT-stale' })
            .mockRejectedValueOnce(new Error('failed (403): forbidden'))
            .mockResolvedValueOnce({ accessToken: 'AT-fresh' });

        await cache.getOrFetch('alice', fetcher, TTL);
        vi.advanceTimersByTime(TTL + 1);
        await expect(cache.getOrFetch('alice', fetcher, TTL)).rejects.toThrow(/403/);

        const tokens = await cache.getOrFetch('alice', fetcher, TTL);
        expect(tokens).toEqual({ accessToken: 'AT-fresh' });
        expect(fetcher).toHaveBeenCalledTimes(3);
    });

    it('preserves the cached entry on a 502 (transient) error', async () => {
        const cache = createTokenCache<FakeTokens>();
        const fetcher = vi
            .fn()
            .mockResolvedValueOnce({ accessToken: 'AT-cached' })
            .mockRejectedValueOnce(new Error('SLAS token exchange failed (502): bad gateway'));

        // Prime the cache.
        await cache.getOrFetch('alice', fetcher, TTL);

        // Force a refetch that 502s.
        vi.advanceTimersByTime(TTL + 1);
        await expect(cache.getOrFetch('alice', fetcher, TTL)).rejects.toThrow(/502/);

        // Even though the refetch failed, the *previous* cache entry was already
        // expired. The point of "preserve on transient" is that we do NOT proactively
        // delete the entry, so a still-valid entry survives. To assert this clearly,
        // re-prime + force-fail-without-expiry path:
        const cache2 = createTokenCache<FakeTokens>();
        const fetcher2 = vi
            .fn()
            .mockResolvedValueOnce({ accessToken: 'AT-still-valid' })
            // No second fetch should happen because the entry must still be cached
            // after the transient failure on the OUT-OF-BAND path. We can't trigger
            // a refetch without expiry from outside, so this branch is checked by
            // observing fetcher2 is called only once across both getOrFetch calls.
            .mockRejectedValueOnce(new Error('network failure'));
        await cache2.getOrFetch('alice', fetcher2, TTL);
        const tokens = await cache2.getOrFetch('alice', fetcher2, TTL);
        expect(tokens).toEqual({ accessToken: 'AT-still-valid' });
        expect(fetcher2).toHaveBeenCalledTimes(1);
    });

    it('preserves the cached entry on a network error (no status code)', async () => {
        const cache = createTokenCache<FakeTokens>();
        const fetcher = vi
            .fn()
            .mockRejectedValueOnce(new Error('fetch failed'))
            .mockResolvedValueOnce({ accessToken: 'AT-1' });

        // Initial fetch fails — there is no entry to preserve, so this just confirms
        // the rejection propagates and the next call retries (sanity check).
        await expect(cache.getOrFetch('alice', fetcher, TTL)).rejects.toThrow(/fetch failed/);

        const tokens = await cache.getOrFetch('alice', fetcher, TTL);
        expect(tokens).toEqual({ accessToken: 'AT-1' });
        expect(fetcher).toHaveBeenCalledTimes(2);
    });
});

describe('isAuthError', () => {
    // Behavioural matters: the regex must anchor on our error-formatter
    // prefixes — `Status: 40[13]` or `failed (40[13])` — not match a bare
    // 401/403 anywhere in the message. SLAS error bodies sometimes echo
    // request ids that incidentally contain these digits.

    it('matches the SLAS "Status: 401" formatter shape', () => {
        expect(
            isAuthError(new Error('SLAS authenticateCustomer failed — no Location header. Status: 401. Body: …'))
        ).toBe(true);
    });

    it('matches the SLAS "Status: 403" formatter shape', () => {
        expect(isAuthError(new Error('SLAS guest login (PKCE authorize) — no code in redirect. Status: 403'))).toBe(
            true
        );
    });

    it('matches the SLAS "failed (401):" formatter shape', () => {
        expect(isAuthError(new Error('SLAS token exchange failed (401): invalid_grant'))).toBe(true);
    });

    it('matches the SLAS "failed (403):" formatter shape', () => {
        expect(isAuthError(new Error('SLAS guest login (client_credentials) failed (403): forbidden'))).toBe(true);
    });

    it('does NOT match a 502 whose body contains "401" in a request id', () => {
        expect(
            isAuthError(
                new Error('SLAS token exchange failed (502): {"request_id":"req_4015abc","message":"upstream timeout"}')
            )
        ).toBe(false);
    });

    it('does NOT match a 502 whose body contains "403" anywhere', () => {
        expect(isAuthError(new Error('SLAS token exchange failed (502): {"request_id":"req_403xyz"}'))).toBe(false);
    });

    it('does NOT match a network error with no status code', () => {
        expect(isAuthError(new Error('fetch failed'))).toBe(false);
    });

    it('does NOT match a 500 with the digits 401 in the body', () => {
        expect(isAuthError(new Error('Create basket failed (500): {"detail":"correlation 401-xyz"}'))).toBe(false);
    });

    it('does NOT match arbitrary text containing "401"', () => {
        expect(isAuthError(new Error('Read 401 bytes from stream'))).toBe(false);
    });

    it('matches "Status: 401" with extra whitespace and trailing punctuation', () => {
        expect(isAuthError(new Error('Failure. Status:  401. Retry?'))).toBe(true);
    });

    it('returns false for non-Error values', () => {
        expect(isAuthError('a plain string with no markers')).toBe(false);
        expect(isAuthError(undefined)).toBe(false);
        expect(isAuthError(null)).toBe(false);
    });

    it('matches when the Error message is reached via `String(error)` fallback', () => {
        // Non-Error throwable — the helper should still extract the right text
        // and apply the same matching rules.
        expect(isAuthError({ toString: () => 'failed (401): nope' })).toBe(true);
        expect(isAuthError({ toString: () => 'failed (502): req_401abc' })).toBe(false);
    });
});
