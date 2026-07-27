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
import { describe, expect, test } from 'vitest';
import { decodeBase64Url, encodeBase64Url } from '@/lib/url';
import { decodeResource, encodeResource } from './resource-encoding';

describe('encodeResource', () => {
    test('encodes a regular SCAPI client+method+options tuple', () => {
        const encoded = encodeResource('shopperProducts', 'getProduct', {
            params: { path: { id: 'apple-ipod' } },
        });
        const decoded = JSON.parse(decodeBase64Url(encoded));
        expect(decoded).toEqual(['shopperProducts', 'getProduct', { params: { path: { id: 'apple-ipod' } } }]);
    });

    test('encodes a helper namespace tuple with helperName injected into options', () => {
        const encoded = encodeResource('helpers', 'basket', {
            helperName: 'getOrCreateBasket',
            currency: 'USD',
        });
        const decoded = JSON.parse(decodeBase64Url(encoded));
        expect(decoded).toEqual(['helpers', 'basket', { helperName: 'getOrCreateBasket', currency: 'USD' }]);
    });

    test('produces stable output for structurally identical options', () => {
        const a = encodeResource('shopperProducts', 'getProduct', {
            params: { path: { id: 'x' } },
        });
        const b = encodeResource('shopperProducts', 'getProduct', {
            params: { path: { id: 'x' } },
        });
        expect(a).toBe(b);
    });
});

describe('decodeResource', () => {
    test('decodes a regular SCAPI client+method+options tuple', () => {
        const encoded = encodeResource('shopperProducts', 'getProduct', { params: { path: { id: 'A' } } });
        expect(decodeResource(encoded)).toEqual({
            client: 'shopperProducts',
            method: 'getProduct',
            options: { params: { path: { id: 'A' } } },
        });
    });

    test('decodes a helper-namespace tuple', () => {
        const encoded = encodeResource('helpers', 'basket', {
            helperName: 'getOrCreateBasket',
            body: { currency: 'USD' },
        });
        expect(decodeResource(encoded)).toEqual({
            client: 'helpers',
            method: 'basket',
            options: { helperName: 'getOrCreateBasket', body: { currency: 'USD' } },
        });
    });

    test('round-trips with encodeResource', () => {
        const options = { params: { query: { id: 'x', levels: 2 } } };
        expect(decodeResource(encodeResource('shopperProducts', 'getCategory', options))).toEqual({
            client: 'shopperProducts',
            method: 'getCategory',
            options,
        });
    });

    test('returns null for a malformed (non-base64url) string', () => {
        expect(decodeResource('not-base64url!!')).toBeNull();
    });

    test('returns null for an empty string', () => {
        expect(decodeResource('')).toBeNull();
    });

    test('returns null when the encoded value is not a 3-tuple of [string, string, unknown]', () => {
        expect(decodeResource(encodeBase64Url(JSON.stringify([1, 2, 3])))).toBeNull();
    });
});
