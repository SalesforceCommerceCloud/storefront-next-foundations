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
 * Shared test utilities for SLAS authentication.
 *
 * The auth middleware decodes the access token JWT and treats missing `isb` (customer ID)
 * or `sub.usid` claims as a critical token-integrity failure (throws AuthTokenInvalidError).
 * Test fixtures must therefore produce structurally valid SLAS-shaped tokens, otherwise
 * happy-path tests blow up on the new validation. This module centralizes that scaffolding.
 */

import type { ShopperLogin } from '@/scapi';
import { mockSiteObject } from '@/test-utils/config';

/** Default values that flow into the mock JWT and the surrounding token-response shape. */
export const MOCK_ACCESS_TOKEN_DEFAULTS = {
    customerId: 'customer-789',
    usid: 'usid-abc',
    siteId: mockSiteObject.id,
} as const;

interface MockAccessTokenOverrides {
    /** Override the `exp` claim (Unix seconds). Defaults to now + 30 minutes. */
    exp?: number;
    /** Override the `isb` claim string in full. Use to test malformed tokens. */
    isb?: string;
    /** Override the `sub` claim string in full. Use to test malformed tokens. */
    sub?: string;
    /** Override the customer ID embedded in the default `isb` claim (gcid). */
    customerId?: string;
    /** Override the registered customer ID embedded in the default `isb` claim (rcid). */
    rcid?: string;
    /** Override the usid embedded in the default `sub` claim. */
    usid?: string;
    /** Override the channel id embedded in the default `isb` claim. */
    chid?: string;
    /** Optional extra claims merged onto the JWT payload (dnt, iss, etc.). */
    extra?: Record<string, unknown>;
}

/**
 * Build a structurally valid SLAS-shaped JWT for use as a mock access token.
 *
 * - SLAS guarantees `isb` (gcid/rcid) and `sub` (usid) claims; the auth middleware throws
 *   AuthTokenInvalidError if either is missing.
 * - All overrides are optional; sensible SLAS-shaped defaults are filled in.
 * - To test the throwing path, build a token with `isb: ''` or `sub: ''`.
 */
export function buildMockAccessToken(overrides: MockAccessTokenOverrides = {}): string {
    const customerId = overrides.customerId ?? MOCK_ACCESS_TOKEN_DEFAULTS.customerId;
    const usid = overrides.usid ?? MOCK_ACCESS_TOKEN_DEFAULTS.usid;
    const chid = overrides.chid ?? MOCK_ACCESS_TOKEN_DEFAULTS.siteId;

    const isb =
        overrides.isb ??
        (overrides.rcid
            ? `uido:ecom::upn:user@example.com::uidn:Test User::gcid:${customerId}::rcid:${overrides.rcid}::chid:${chid}`
            : `uido:slas::upn:Guest::uidn:Guest User::gcid:${customerId}::chid:${chid}`);

    const sub = overrides.sub ?? `cc-slas::zzrf_001::scid:scid-test::usid:${usid}`;

    const payload = {
        exp: overrides.exp ?? Math.floor(Date.now() / 1000) + 1800,
        isb,
        sub,
        ...overrides.extra,
    };

    return `header.${btoa(JSON.stringify(payload))}.signature`;
}

interface MockTokenResponseOverrides {
    /** Override the JWT payload built into `access_token`. */
    accessToken?: MockAccessTokenOverrides;
    /** Override the top-level `usid` field on the token response (defaults to match the JWT). */
    usid?: string;
    /** Override the top-level `customer_id` field (defaults to match the JWT). */
    customer_id?: string;
}

/**
 * Build a SLAS TokenResponse fixture whose `access_token` is a valid JWT.
 *
 * Top-level `usid` and `customer_id` fields default to match the JWT claims, so the
 * middleware/`updateAuthStorageDataByTokenResponse` can be exercised without surprises.
 */
export function buildMockTokenResponse(
    overrides: MockTokenResponseOverrides = {}
): ShopperLogin.schemas['TokenResponse'] {
    const customerId = overrides.accessToken?.customerId ?? MOCK_ACCESS_TOKEN_DEFAULTS.customerId;
    const usid = overrides.accessToken?.usid ?? MOCK_ACCESS_TOKEN_DEFAULTS.usid;
    return {
        access_token: buildMockAccessToken(overrides.accessToken),
        id_token: 'id-token-123',
        refresh_token: 'refresh-token-456',
        expires_in: 1800,
        refresh_token_expires_in: 3600,
        token_type: 'Bearer',
        usid: overrides.usid ?? usid,
        customer_id: overrides.customer_id ?? customerId,
        enc_user_id: 'enc-user-id-123',
        idp_access_token: 'idp-access-token-123',
        idp_refresh_token: 'idp-refresh-token-789',
    };
}
