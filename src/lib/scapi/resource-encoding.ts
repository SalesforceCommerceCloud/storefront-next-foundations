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
import { decodeBase64Url, encodeBase64Url } from '@/lib/url';

/** Base path of the SCAPI resource client route. Shared by `useScapiFetcher`, `useScapiFetchClient`, and `useScapiFetchHelper`. */
export const RESOURCE_API_ROUTE = '/resource/api/client';

/**
 * The decoded form of an encoded resource string: the `[client, method, options]` tuple as a named object.
 * `client` is either a SCAPI client key (e.g. `shopperProducts`) or the literal `'helpers'`; for helpers, `method`
 * is the namespace and the helper name lives in `options.helperName`.
 */
export type DecodedResource = {
    client: string;
    method: string;
    options: unknown;
};

/**
 * Encode a SCAPI resource tuple as a base64-url string for the
 * `/resource/api/client/$resource` route. Shared by `useScapiFetcher`,
 * `useScapiFetchClient`, and `useScapiFetchHelper`.
 *
 * Two shapes are supported:
 *
 *   1. Regular SCAPI client + method + options
 *      `encodeResource('shopperProducts', 'getProduct', { params: ... })`
 *      → encoded tuple `['shopperProducts', 'getProduct', { params: ... }]`
 *
 *   2. Helper namespace + helper method + options (with `helperName`)
 *      `encodeResource('helpers', 'basket', { helperName: 'getOrCreateBasket', ... })`
 *      → encoded tuple `['helpers', 'basket', { helperName: 'getOrCreateBasket', ... }]`
 *
 * The route's `loader`/`action` accept either tuple shape.
 */
export function encodeResource(client: string, method: string, options: unknown): string {
    return encodeBase64Url(JSON.stringify([client, method, options]));
}

/**
 * Decode a base64-url string produced by {@link encodeResource} back into its {@link DecodedResource}. The inverse of
 * `encodeResource`.
 *
 * Returns `null` when the input is not a valid encoded `[client, method, options]` tuple — callers treat `null` as
 * "not decodable, ignore it".
 *
 * @param encoded - The base64-url encoded resource string (also used as the `useFetcher` key).
 */
export function decodeResource(encoded: string): DecodedResource | null {
    try {
        const tuple = JSON.parse(decodeBase64Url(encoded)) as unknown;
        if (
            Array.isArray(tuple) &&
            tuple.length === 3 &&
            typeof tuple[0] === 'string' &&
            typeof tuple[1] === 'string'
        ) {
            return { client: tuple[0], method: tuple[1], options: tuple[2] };
        }
    } catch {
        // Malformed base64url or JSON — fall through to null.
    }
    return null;
}
