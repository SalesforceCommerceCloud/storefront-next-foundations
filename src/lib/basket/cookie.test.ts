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
import { describe, expect, it } from 'vitest';
import { BASKET_COOKIE_NAME, parseBasketCookie } from './cookie';

const snapshot = { basketId: 'basket-123', totalItemCount: 4, uniqueProductCount: 2, lastModified: '' };

const withCookie = (value: string) => `${BASKET_COOKIE_NAME}=${value}`;

describe('parseBasketCookie', () => {
    it('parses a base64-encoded JSON value (middleware format)', () => {
        const header = withCookie(encodeURIComponent(btoa(JSON.stringify(snapshot))));
        expect(parseBasketCookie(header)).toEqual(snapshot);
    });

    it('extracts the cookie when surrounded by other cookies', () => {
        const header = `foo=bar; ${withCookie(btoa(JSON.stringify(snapshot)))}; baz=qux`;
        expect(parseBasketCookie(header)).toEqual(snapshot);
    });

    it('returns null when the cookie is absent', () => {
        expect(parseBasketCookie('foo=bar; baz=qux')).toBeNull();
    });

    it('returns null for an empty header', () => {
        expect(parseBasketCookie('')).toBeNull();
    });

    it('returns null when the value cannot be parsed as JSON', () => {
        expect(parseBasketCookie(withCookie(encodeURIComponent('not-a-valid-json-string')))).toBeNull();
    });

    it('returns null when the parsed object lacks a non-empty basketId', () => {
        expect(
            parseBasketCookie(withCookie(btoa(JSON.stringify({ totalItemCount: 1, uniqueProductCount: 1 }))))
        ).toBeNull();
        expect(parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, basketId: '' }))))).toBeNull();
        expect(parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, basketId: 42 }))))).toBeNull();
    });

    it('returns null when totalItemCount is missing or non-numeric', () => {
        // The badge consumes these counts verbatim. A malformed cookie that smuggles a string, null,
        // or boolean past the guard would surface in the UI (`"3"` rendering with no formatting,
        // `null` breaking a `count > 0` check, etc.). The non-negative-safe-integer guard rejects every
        // non-number plus `NaN` and ±Infinity, so future code paths that bypass `JSON.parse`'s NaN/Infinity
        // rejection (e.g. a writer using `eval` or a non-strict JSON variant) are also covered.
        expect(parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, totalItemCount: '4' }))))).toBeNull();
        expect(parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, totalItemCount: null }))))).toBeNull();
        expect(parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, totalItemCount: true }))))).toBeNull();
        expect(parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, totalItemCount: {} }))))).toBeNull();
        // JSON.stringify drops `undefined`-valued fields, so the field arrives missing on the read side.
        expect(
            parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, totalItemCount: undefined }))))
        ).toBeNull();
    });

    it('returns null when uniqueProductCount is missing or non-numeric', () => {
        expect(
            parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, uniqueProductCount: '2' }))))
        ).toBeNull();
        expect(
            parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, uniqueProductCount: null }))))
        ).toBeNull();
        expect(
            parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, uniqueProductCount: true }))))
        ).toBeNull();
        expect(parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, uniqueProductCount: {} }))))).toBeNull();
        expect(
            parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, uniqueProductCount: undefined }))))
        ).toBeNull();
    });

    it('accepts zero counts (empty cart is a valid snapshot)', () => {
        // Zero is a non-negative integer — the guard must not reject a freshly-cleared basket.
        const empty = { basketId: 'basket-empty', totalItemCount: 0, uniqueProductCount: 0, lastModified: '' };
        expect(parseBasketCookie(withCookie(btoa(JSON.stringify(empty))))).toEqual(empty);
    });

    it('returns null when counts are negative or fractional', () => {
        // The writer (`defaultCreateSnapshot`) only emits non-negative integers. A negative or fractional
        // count means tampering or a writer bug — surface either as `-5 items` / `1.5 items` would be a
        // visible UI defect, so the validator rejects them.
        expect(parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, totalItemCount: -1 }))))).toBeNull();
        expect(parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, uniqueProductCount: -1 }))))).toBeNull();
        expect(parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, totalItemCount: 1.5 }))))).toBeNull();
        expect(
            parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, uniqueProductCount: 0.1 }))))
        ).toBeNull();
    });

    it('returns null when counts exceed the safe-integer range', () => {
        // Past `Number.MAX_SAFE_INTEGER` (2^53 - 1) double precision starts collapsing adjacent integers, so
        // the value can no longer survive a round-trip through JSON. Reject anything that isn't a safe integer
        // to keep the badge UI from rendering an absurd or imprecise count.
        expect(
            parseBasketCookie(
                withCookie(btoa(JSON.stringify({ ...snapshot, totalItemCount: Number.MAX_SAFE_INTEGER + 1 })))
            )
        ).toBeNull();
        expect(
            parseBasketCookie(
                withCookie(btoa(JSON.stringify({ ...snapshot, uniqueProductCount: Number.MAX_SAFE_INTEGER + 1 })))
            )
        ).toBeNull();
    });

    it('returns null when the cookie value is a JSON primitive rather than an object', () => {
        expect(parseBasketCookie(withCookie(btoa(JSON.stringify('just-a-string'))))).toBeNull();
        expect(parseBasketCookie(withCookie(btoa(JSON.stringify(null))))).toBeNull();
    });

    describe('lastModified field', () => {
        it('accepts an empty string lastModified (basket with no lastModified from SCAPI)', () => {
            const s = { ...snapshot, lastModified: '' };
            expect(parseBasketCookie(withCookie(btoa(JSON.stringify(s))))).toEqual(s);
        });

        it('accepts a valid ISO-8601 lastModified', () => {
            const s = { ...snapshot, lastModified: '2026-06-29T10:23:44.000Z' };
            expect(parseBasketCookie(withCookie(btoa(JSON.stringify(s))))).toEqual(s);
        });

        it('tolerates a missing lastModified and normalizes it to "" (pre-lastModified cookie)', () => {
            // A cookie written before this field was introduced lacks lastModified entirely (JSON.stringify drops
            // undefined-valued keys). Rejecting it would discard otherwise-valid cookies on the first read after a
            // deploy, blanking the cart badge; instead the reader accepts it and normalizes lastModified to ''.
            const withoutLastModified = { ...snapshot };
            delete (withoutLastModified as Partial<typeof snapshot>).lastModified;
            expect(parseBasketCookie(withCookie(btoa(JSON.stringify(withoutLastModified))))).toEqual({
                ...withoutLastModified,
                lastModified: '',
            });
        });

        it('returns null when lastModified is present but not a string', () => {
            // A present (non-undefined) non-string value indicates tampering or an incompatible writer, so reject it.
            expect(
                parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, lastModified: 12345 }))))
            ).toBeNull();
            expect(parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, lastModified: null }))))).toBeNull();
            expect(parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, lastModified: true }))))).toBeNull();
        });

        it('returns null when lastModified is a non-empty non-ASCII string', () => {
            // A localized date string or emoji would break the ASCII-only decoder shortcut.
            expect(
                parseBasketCookie(withCookie(btoa(JSON.stringify({ ...snapshot, lastModified: '2026-Grüße' }))))
            ).toBeNull();
        });
    });

    // -----------------------------------------------------------------------------------------
    // ASCII-only pipeline limits
    //
    // The shortcut decoder used here only works for ASCII payloads. The validator's `basketId` ASCII
    // check (`ASCII_PRINTABLE`) closes the loop: if a writer ever uses React Router's full
    // `createCookie` encode pipeline with non-ASCII content, the shortcut decoder Mojibake-corrupts
    // the string into Latin-1 reinterpreted bytes — almost all of which lie outside the printable ASCII
    // range and so fail the regex. The validator returns `null` rather than serving a silently-corrupted
    // basketId to downstream fetches.
    //
    // These tests document the failure modes and pin the fail-closed contract:
    //
    // 1. **Silent Mojibake → caught by validator**. The shortcut decoder still produces a Mojibake
    //    string post-`atob`, but the ASCII regex on `basketId` rejects it.
    // 2. **Hard failure**. Malformed `%`-triplets or raw bytes that are not valid base64 throw
    //    during decode and surface as `null`.
    //
    // If the snapshot writer is ever changed to use the full React Router pipeline for `basketId`
    // (i.e. `basketId` becomes intentionally non-ASCII), the decoder must be upgraded to invert the
    // full pipeline (`decodeURIComponent → atob → myEscape → decodeURIComponent → JSON.parse`) and
    // the ASCII guard relaxed.
    // -----------------------------------------------------------------------------------------
    describe('ASCII-only pipeline limits', () => {
        it('rejects a non-ASCII basketId written via the full React Router pipeline', () => {
            const unicodeSnapshot = { ...snapshot, basketId: 'b-Grüße' };
            const bridged = btoa(unescape(encodeURIComponent(JSON.stringify(unicodeSnapshot))));

            // `atob` decodes successfully and the parsed JSON is shape-valid, but `basketId` lands as
            // Latin-1 Mojibake (e.g. 0xC3 0xBC bytes reinterpreted as separate Latin-1 chars), and those
            // chars sit outside printable ASCII — `ASCII_PRINTABLE` rejects them.
            expect(parseBasketCookie(withCookie(encodeURIComponent(bridged)))).toBeNull();
        });

        it('rejects an emoji basketId written via the full React Router pipeline', () => {
            const unicodeSnapshot = { ...snapshot, basketId: 'cart-🛒' };
            const bridged = btoa(unescape(encodeURIComponent(JSON.stringify(unicodeSnapshot))));

            expect(parseBasketCookie(withCookie(encodeURIComponent(bridged)))).toBeNull();
        });

        it('rejects a tampered basketId containing control bytes', () => {
            // Direct tampering rather than encoding pipeline mismatch — a basketId containing a NUL or
            // other control byte should fail the printable-ASCII check rather than reach downstream code.
            const tampered = { ...snapshot, basketId: 'basket-\x00-with-null' };
            expect(parseBasketCookie(withCookie(btoa(JSON.stringify(tampered))))).toBeNull();
        });

        it('returns null when the writer omits base64 and relies on URL-encoding alone', () => {
            // A plausible misuse — write URL-encoded JSON straight to the cookie without btoa. The
            // shortcut decoder runs `atob` on the JSON-looking string; the `{` character isn't part of
            // the base64 alphabet, so `atob` throws `InvalidCharacterError` and we fall through to null.
            expect(parseBasketCookie(withCookie(encodeURIComponent(JSON.stringify(snapshot))))).toBeNull();
        });

        it('returns null when the writer emits raw non-ASCII bytes on the wire', () => {
            // Raw non-ASCII bytes on the wire violate RFC 6265. `decodeURIComponent` rejects the
            // resulting malformed %-triplets (here 0xC3 0x28 — an invalid UTF-8 sequence) with URIError.
            expect(parseBasketCookie(`${BASKET_COOKIE_NAME}=%C3%28`)).toBeNull();
        });
    });
});
