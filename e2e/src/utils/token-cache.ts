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
 * Returns true for HTTP 401 / 403 error messages produced by the SLAS helpers.
 *
 * Anchored on the helpers' two error-formatter prefixes — `Status: 40[13]` or
 * `failed (40[13])` — so we don't false-positive on a 5xx whose body happens
 * to contain those digits in a request id, correlation id, etc. (SLAS bodies
 * routinely echo such ids on transient failures.)
 *
 * Source shapes (see `scapi-helper.ts`):
 *   - `... failed (401): ...` / `... failed (403) for product X: ...`
 *   - `... Status: 401` / `... Status: 401. Body: ...`
 *
 * Exported for direct unit testing — the regex surface is the load-bearing
 * piece of the eviction policy and changes here have spec-wide consequences.
 */
export function isAuthError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /(?:Status:\s*40[13]\b|failed\s*\(40[13]\))/.test(message);
}

interface CachedValue<T> {
    value: T;
    expiresAt: number;
}

/**
 * Per-key cache with concurrent-fetch coalescing and policy-based eviction.
 *
 * Designed for SLAS token caching where:
 * - Repeated fetches for the same shopper trip a 1/sec rate limit (so we cache).
 * - Concurrent fetches for the same shopper would defeat the cache (so we coalesce
 *   inflight promises by key).
 * - Auth-class errors (401/403) genuinely invalidate the token (so we evict).
 * - Transient errors (5xx, network) leave a still-valid cache entry alone (so we
 *   pass the error through but do NOT evict).
 *
 * Pure helper — no CodeceptJS or Playwright dependency — so it can be unit-tested
 * directly. The caller supplies the fetcher closure.
 */
export interface TokenCache<T> {
    /**
     * Return a cached value for `key` if one exists and is unexpired. Otherwise
     * call `fetcher()` to obtain a fresh value, cache it for `ttlMs`, and return
     * it. Concurrent calls for the same `key` share a single fetch.
     */
    getOrFetch(key: string, fetcher: () => Promise<T>, ttlMs: number): Promise<T>;
}

export function createTokenCache<T>(): TokenCache<T> {
    const cache = new Map<string, CachedValue<T>>();
    const inflight = new Map<string, Promise<T>>();

    return {
        async getOrFetch(key: string, fetcher: () => Promise<T>, ttlMs: number): Promise<T> {
            const cached = cache.get(key);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.value;
            }

            const ongoing = inflight.get(key);
            if (ongoing) {
                return ongoing;
            }

            const fetchPromise = (async () => {
                try {
                    const value = await fetcher();
                    cache.set(key, { value, expiresAt: Date.now() + ttlMs });
                    return value;
                } catch (error) {
                    if (isAuthError(error)) {
                        cache.delete(key);
                    }
                    throw error;
                } finally {
                    inflight.delete(key);
                }
            })();
            inflight.set(key, fetchPromise);
            return fetchPromise;
        },
    };
}
