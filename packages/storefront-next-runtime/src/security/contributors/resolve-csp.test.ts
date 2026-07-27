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

import { describe, it, expect, vi } from 'vitest';
import { resolveCsp } from './resolve-csp';
import type { CspContributor } from './types.js';
import type { CspDirectives } from '../types.js';

const base: CspDirectives = {
    'connect-src': ["'self'"],
    'frame-ancestors': ["'self'"],
};

const bootStatic: CspContributor = {
    id: 'agent',
    isActive: () => true,
    contribute: () => ({ 'connect-src': ['https://agent.example.com'] }),
};

const inactive: CspContributor = {
    id: 'off',
    isActive: () => false,
    contribute: () => ({ 'connect-src': ['https://nope.example.com'] }),
};

const perReq: CspContributor = {
    id: 'pd',
    isActive: () => true,
    contribute: () => ({ 'frame-ancestors': ['https://admin.example.com'] }),
    perRequest: { shouldApply: (url) => url.includes('mode=') },
};

describe('resolveCsp', () => {
    it('folds active boot-static contributions into the static directives (union, deduped)', () => {
        const r = resolveCsp({ baseDirectives: { ...base }, contributors: [bootStatic] });
        expect(r.staticDirectives['connect-src']).toEqual(["'self'", 'https://agent.example.com']);
    });

    it('omits inactive contributors', () => {
        const r = resolveCsp({ baseDirectives: { ...base }, contributors: [inactive] });
        expect(r.staticDirectives['connect-src']).toEqual(["'self'"]);
    });

    it('does not fold per-request contributions into the static body', () => {
        const r = resolveCsp({ baseDirectives: { ...base }, contributors: [perReq] });
        expect(r.staticDirectives['frame-ancestors']).toEqual(["'self'"]);
    });

    it('returns the static directives (same reference) when no per-request guard fires', () => {
        const r = resolveCsp({ baseDirectives: { ...base }, contributors: [perReq] });
        const forShopper = r.directivesForRequest('https://store.example.com/product/1');
        expect(forShopper).toBe(r.staticDirectives);
    });

    it('applies a per-request contribution when its guard fires', () => {
        const r = resolveCsp({ baseDirectives: { ...base }, contributors: [perReq] });
        const forEdit = r.directivesForRequest('https://store.example.com/?mode=EDIT');
        expect(forEdit['frame-ancestors']).toEqual(["'self'", 'https://admin.example.com']);
    });

    it('memoizes by fired-set: same fired-set returns the same object reference', () => {
        const r = resolveCsp({ baseDirectives: { ...base }, contributors: [perReq] });
        const a = r.directivesForRequest('https://store.example.com/?mode=EDIT');
        const b = r.directivesForRequest('https://store.example.com/x?mode=PREVIEW&mode=EDIT');
        expect(b).toBe(a);
    });

    it('warns at boot when 2^P exceeds the cache ceiling', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const many: CspContributor[] = Array.from({ length: 12 }, (_, i) => ({
            id: `pr-${i}`,
            isActive: () => true,
            contribute: () => ({ 'connect-src': [`https://h${i}.example.com`] }),
            perRequest: { shouldApply: (url) => url.includes(`p${i}=`) },
        }));
        resolveCsp({ baseDirectives: { ...base }, contributors: many, cacheCeiling: 256 });
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(/2\^12|exceeds/i));
        spy.mockRestore();
    });

    it('unions two per-request contributions when both guards fire (fired-set key is order-stable)', () => {
        const pdA: CspContributor = {
            id: 'pd-a',
            isActive: () => true,
            contribute: () => ({ 'frame-ancestors': ['https://a.example.com'] }),
            perRequest: { shouldApply: (url) => url.includes('a=') },
        };
        const pdB: CspContributor = {
            id: 'pd-b',
            isActive: () => true,
            contribute: () => ({ 'frame-ancestors': ['https://b.example.com'] }),
            perRequest: { shouldApply: (url) => url.includes('b=') },
        };
        const r = resolveCsp({ baseDirectives: { ...base }, contributors: [pdA, pdB] });
        const both = r.directivesForRequest('https://store.example.com/?a=1&b=2');
        expect(both['frame-ancestors']).toEqual(["'self'", 'https://a.example.com', 'https://b.example.com']);
        // Same fired set, different URL/param order → same cached object (stable key).
        const again = r.directivesForRequest('https://store.example.com/?b=9&a=9');
        expect(again).toBe(both);
    });

    it('treats an active contributor that contributes {} as a no-op (same static reference)', () => {
        const empty: CspContributor = { id: 'empty', isActive: () => true, contribute: () => ({}) };
        const r = resolveCsp({ baseDirectives: { ...base }, contributors: [empty] });
        expect(r.staticDirectives).toEqual(base);
    });

    it('adds a directive not already present in the base directives', () => {
        const adder: CspContributor = {
            id: 'adder',
            isActive: () => true,
            contribute: () => ({ 'img-src': ['https://img.example.com'] }),
        };
        const r = resolveCsp({ baseDirectives: { ...base }, contributors: [adder] });
        expect(r.staticDirectives['img-src']).toEqual(['https://img.example.com']);
    });

    it('invokes a per-request contributor’s contribute() once at boot, never on the request path', () => {
        const contribute = vi.fn(() => ({ 'frame-ancestors': ['https://admin.example.com'] }));
        const pd: CspContributor = {
            id: 'pd',
            isActive: () => true,
            contribute,
            perRequest: { shouldApply: (url) => url.includes('mode=') },
        };
        const r = resolveCsp({ baseDirectives: { ...base }, contributors: [pd] });
        const callsAfterBoot = contribute.mock.calls.length;
        // Fire the guard across several distinct requests (incl. a fresh fired-set miss).
        r.directivesForRequest('https://store.example.com/?mode=EDIT');
        r.directivesForRequest('https://store.example.com/?mode=PREVIEW');
        r.directivesForRequest('https://store.example.com/product/1');
        expect(contribute).toHaveBeenCalledTimes(callsAfterBoot);
    });
});
