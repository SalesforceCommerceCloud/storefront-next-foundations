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
import { redactEmailForLog } from './log-redact.server';

describe('redactEmailForLog', () => {
    it('replaces the local-part with a short hash and keeps the domain', () => {
        const out = redactEmailForLog('shopper@example.com');
        expect(out).toMatch(/^[0-9a-f]{8}@example\.com$/);
    });

    it('is deterministic — same input maps to same output', () => {
        expect(redactEmailForLog('shopper@example.com')).toBe(redactEmailForLog('shopper@example.com'));
    });

    it('is case-insensitive on the local-part (Foo@x.com == foo@x.com)', () => {
        expect(redactEmailForLog('Shopper@example.com')).toBe(redactEmailForLog('shopper@example.com'));
    });

    it('preserves the domain in plaintext', () => {
        expect(redactEmailForLog('a@store.example.com')?.endsWith('@store.example.com')).toBe(true);
    });

    it('produces different hashes for different local-parts', () => {
        expect(redactEmailForLog('a@x.com')).not.toBe(redactEmailForLog('b@x.com'));
    });

    it('returns undefined for falsy input', () => {
        expect(redactEmailForLog(undefined)).toBeUndefined();
        expect(redactEmailForLog(null)).toBeUndefined();
        expect(redactEmailForLog('')).toBeUndefined();
    });

    it('returns undefined for malformed input (no @)', () => {
        expect(redactEmailForLog('not-an-email')).toBeUndefined();
    });

    it('returns undefined for malformed input (@ at start)', () => {
        expect(redactEmailForLog('@example.com')).toBeUndefined();
    });

    it('returns undefined for malformed input (@ at end)', () => {
        expect(redactEmailForLog('shopper@')).toBeUndefined();
    });

    it('handles addresses with a + tag (gmail-style)', () => {
        const out = redactEmailForLog('shopper+test@example.com');
        expect(out).toMatch(/^[0-9a-f]{8}@example\.com$/);
        // + tags must not collapse to the same hash as the bare local-part
        expect(out).not.toBe(redactEmailForLog('shopper@example.com'));
    });

    it('handles multiple @ signs by treating the last one as the boundary', () => {
        const out = redactEmailForLog('weird@nested@example.com');
        expect(out).toMatch(/^[0-9a-f]{8}@example\.com$/);
    });
});
