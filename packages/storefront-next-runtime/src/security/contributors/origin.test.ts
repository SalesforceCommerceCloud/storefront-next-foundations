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
import { inspectCspOrigin, normalizeCspOrigin } from './origin';

describe('normalizeCspOrigin', () => {
    it('returns the exact origin for a clean https URL (strips path/query/fragment)', () => {
        expect(normalizeCspOrigin('https://x.my.site.com/foo?a=b#c')).toBe('https://x.my.site.com');
    });
    it('preserves an explicit port', () => {
        expect(normalizeCspOrigin('https://x.my.site.com:8443')).toBe('https://x.my.site.com:8443');
    });
    it.each([
        ['http://x.com', 'non-https'],
        ['https://*.x.com', 'wildcard'],
        ['https://user:pass@x.com', 'credentials'],
        ['not-a-url', 'unparseable'],
        ['', 'empty'],
        ['https://x.com ', 'whitespace'],
    ])('returns null for invalid input %s (%s)', (input) => {
        expect(normalizeCspOrigin(input)).toBeNull();
    });
});

describe('inspectCspOrigin', () => {
    it('reports the canonical origin and no issue for a safe URL', () => {
        expect(inspectCspOrigin('https://x.com/path')).toEqual({ issue: null, origin: 'https://x.com' });
    });
    it.each([
        ['https://*.x.com', 'wildcard'],
        ['https://a.com ;b', 'separator'],
        ['http://x.com', 'not-https'],
        ['https://u:p@x.com', 'credentials'],
        ['nope', 'unparseable'],
    ])('classifies %s as issue=%s with null origin', (input, expectedIssue) => {
        const { issue, origin } = inspectCspOrigin(input);
        expect(issue).toBe(expectedIssue);
        expect(origin).toBeNull();
    });
});
