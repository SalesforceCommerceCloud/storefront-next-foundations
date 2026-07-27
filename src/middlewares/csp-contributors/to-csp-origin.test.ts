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
import { toCspOrigin } from './to-csp-origin';

describe('toCspOrigin', () => {
    it('returns the exact origin for a clean https URL (strips path/query/fragment)', () => {
        expect(toCspOrigin('https://x.my.site.com/foo?a=b#c')).toBe('https://x.my.site.com');
    });
    it('preserves an explicit port', () => {
        expect(toCspOrigin('https://x.my.site.com:8443')).toBe('https://x.my.site.com:8443');
    });
    it.each([
        ['http://x.com', 'non-https'],
        ['https://*.x.com', 'wildcard'],
        ['https://user:pass@x.com', 'credentials'],
        ['not-a-url', 'unparseable'],
        ['', 'empty'],
        ['https://x.com ', 'whitespace'],
    ])('returns null for invalid input %s (%s)', (input) => {
        expect(toCspOrigin(input)).toBeNull();
    });
});
