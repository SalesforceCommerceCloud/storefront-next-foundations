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
 * @vitest-environment jsdom
 * Use jsdom so the Cookie request header is available (happy-dom strips it per Fetch spec).
 */
import { describe, it, expect, vi } from 'vitest';
import type { Cookie } from 'react-router';
import { lookupFromPath, readCookieFromRequest } from './utils';

describe('Site Context Utils', () => {
    describe('lookupFromPath', () => {
        it('returns segment at lookupFromPathIndex', () => {
            expect(lookupFromPath('/us/en-US/page', 0)).toBe('us');
            expect(lookupFromPath('/us/en-US/page', 1)).toBe('en-US');
            expect(lookupFromPath('/us/en-US/page', 2)).toBe('page');
        });

        it('returns null when path has fewer segments', () => {
            expect(lookupFromPath('/', 0)).toBe(null);
            expect(lookupFromPath('/us', 1)).toBe(null);
        });
    });

    describe('readCookieFromRequest', () => {
        it('returns null without calling cookie.parse when no Cookie header', async () => {
            const parse = vi.fn(() => Promise.resolve(null));
            const cookie: Cookie = { parse, name: 'test', isSigned: false, serialize: () => Promise.resolve('test') };
            const request = new Request('https://example.com/');
            expect(await readCookieFromRequest(request, cookie)).toBe(null);
            expect(parse).not.toHaveBeenCalled();
        });

        it('calls cookie.parse with Cookie header and returns parsed value', async () => {
            const parse = vi.fn((header: string) => Promise.resolve(header ? 'abc' : null));
            const cookie: Cookie = { parse, name: 'test', isSigned: false, serialize: () => Promise.resolve('test') };
            const request = new Request('https://example.com/', { headers: { Cookie: 'test=abc' } });
            expect(await readCookieFromRequest(request, cookie)).toBe('abc');
            expect(parse).toHaveBeenCalledWith('test=abc');
        });
    });
});
