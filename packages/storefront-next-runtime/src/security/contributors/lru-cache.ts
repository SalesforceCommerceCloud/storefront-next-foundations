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
 * Minimal bounded LRU cache. Map preserves insertion order, so the first key
 * in iteration order is the least-recently-used; `get` re-inserts to refresh
 * recency. No external dependency. Used by the CSP resolver to memoize
 * per-request bodies keyed on the fired-set.
 */
export class BoundedCache<V> {
    private readonly store = new Map<string, V>();

    constructor(private readonly capacity: number) {
        if (capacity < 1) throw new Error('BoundedCache capacity must be >= 1');
    }

    get(key: string): V | undefined {
        if (!this.store.has(key)) return undefined;
        const value = this.store.get(key) as V;
        // Refresh recency: delete + re-set moves the key to the most-recent end.
        this.store.delete(key);
        this.store.set(key, value);
        return value;
    }

    set(key: string, value: V): void {
        // Delete first so re-inserting moves the key to the most-recent end.
        this.store.delete(key);
        this.store.set(key, value);
        if (this.store.size > this.capacity) {
            // Evict the least-recently-used = first key in iteration order.
            const oldest = this.store.keys().next().value;
            if (oldest !== undefined) this.store.delete(oldest);
        }
    }

    get size(): number {
        return this.store.size;
    }
}
