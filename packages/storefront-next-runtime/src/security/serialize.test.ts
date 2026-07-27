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
import { serializeCsp, serializePermissionsPolicy, serializeHsts } from './serialize';

describe('serializeCsp', () => {
    it('serializes a single directive', () => {
        expect(serializeCsp({ 'default-src': ["'self'"] })).toBe("default-src 'self'");
    });

    it('serializes multiple directives separated by semicolons', () => {
        const out = serializeCsp({
            'default-src': ["'self'"],
            'script-src': ["'self'", 'https://x.example'],
        });
        expect(out).toBe("default-src 'self'; script-src 'self' https://x.example");
    });

    it('serializes the upgrade-insecure-requests flag with no value', () => {
        const out = serializeCsp({
            'default-src': ["'self'"],
            'upgrade-insecure-requests': true,
        });
        expect(out).toBe("default-src 'self'; upgrade-insecure-requests");
    });

    it('omits a directive whose array is empty', () => {
        const out = serializeCsp({
            'default-src': ["'self'"],
            'script-src': [],
        });
        expect(out).toBe("default-src 'self'");
    });

    it('appends a per-request nonce to script-src when provided', () => {
        const out = serializeCsp({ 'script-src': ["'self'"] }, { nonce: 'AbC123==' });
        expect(out).toBe("script-src 'self' 'nonce-AbC123=='");
    });

    it('appends nonce to script-src even when script-src is absent', () => {
        const out = serializeCsp({ 'default-src': ["'self'"] }, { nonce: 'AbC123==' });
        expect(out).toBe("default-src 'self'; script-src 'nonce-AbC123=='");
    });
});

describe('serializePermissionsPolicy', () => {
    it('serializes an empty allowlist as `name=()`', () => {
        expect(serializePermissionsPolicy({ camera: [] })).toBe('camera=()');
    });

    it('quotes individual origins', () => {
        expect(serializePermissionsPolicy({ geolocation: ['self', 'https://x.example'] })).toBe(
            'geolocation=(self "https://x.example")'
        );
    });

    it('emits the wildcard `*` unquoted', () => {
        expect(serializePermissionsPolicy({ fullscreen: ['*'] })).toBe('fullscreen=(*)');
    });

    it('joins multiple features with commas', () => {
        expect(serializePermissionsPolicy({ camera: [], microphone: [] })).toBe('camera=(), microphone=()');
    });
});

describe('serializeHsts', () => {
    it('serializes max-age only', () => {
        expect(serializeHsts({ maxAge: 100, includeSubDomains: false, preload: false })).toBe('max-age=100');
    });

    it('appends includeSubDomains', () => {
        expect(serializeHsts({ maxAge: 100, includeSubDomains: true, preload: false })).toBe(
            'max-age=100; includeSubDomains'
        );
    });

    it('appends preload after includeSubDomains', () => {
        expect(serializeHsts({ maxAge: 100, includeSubDomains: true, preload: true })).toBe(
            'max-age=100; includeSubDomains; preload'
        );
    });
});
