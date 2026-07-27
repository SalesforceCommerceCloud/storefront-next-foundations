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

import { describe, it, expect } from 'vitest';
import { BoundedCache } from './lru-cache.js';

describe('BoundedCache', () => {
    it('returns undefined for a missing key and stores/returns a value', () => {
        const c = new BoundedCache<number>(2);
        expect(c.get('a')).toBeUndefined();
        c.set('a', 1);
        expect(c.get('a')).toBe(1);
    });

    it('evicts the least-recently-used entry when over capacity', () => {
        const c = new BoundedCache<number>(2);
        c.set('a', 1);
        c.set('b', 2);
        c.set('c', 3); // evicts 'a'
        expect(c.get('a')).toBeUndefined();
        expect(c.get('b')).toBe(2);
        expect(c.get('c')).toBe(3);
    });

    it('a get() refreshes recency so the other key is evicted next', () => {
        const c = new BoundedCache<number>(2);
        c.set('a', 1);
        c.set('b', 2);
        expect(c.get('a')).toBe(1); // 'a' now most-recent
        c.set('c', 3); // evicts 'b', not 'a'
        expect(c.get('a')).toBe(1);
        expect(c.get('b')).toBeUndefined();
    });

    it('reports its size', () => {
        const c = new BoundedCache<number>(5);
        c.set('a', 1);
        c.set('b', 2);
        expect(c.size).toBe(2);
    });

    it('throws when constructed with capacity below 1', () => {
        expect(() => new BoundedCache<number>(0)).toThrow(/capacity/i);
    });

    it('updating an existing key does not grow size and refreshes recency', () => {
        const c = new BoundedCache<number>(2);
        c.set('a', 1);
        c.set('b', 2);
        c.set('a', 11); // update 'a' → 'a' is now most-recent, size stays 2
        expect(c.size).toBe(2);
        c.set('c', 3); // evicts 'b' (LRU), keeps 'a'
        expect(c.get('a')).toBe(11);
        expect(c.get('b')).toBeUndefined();
        expect(c.get('c')).toBe(3);
    });
});
