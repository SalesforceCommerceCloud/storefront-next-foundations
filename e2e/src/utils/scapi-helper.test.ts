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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getScapiConfig, isRateLimitError, withSlasRetry } from './scapi-helper';

const SCAPI_KEYS = [
    'PUBLIC__app__commerce__api__clientId',
    'PUBLIC__app__commerce__api__organizationId',
    'PUBLIC__app__commerce__api__shortCode',
    'COMMERCE_API_SLAS_SECRET',
    'SITE_ID',
] as const;

describe('getScapiConfig', () => {
    let saved: Record<string, string | undefined> = {};

    beforeEach(() => {
        for (const key of SCAPI_KEYS) saved[key] = process.env[key];
    });

    afterEach(() => {
        for (const key of SCAPI_KEYS) {
            if (saved[key] === undefined) delete process.env[key];
            else process.env[key] = saved[key];
        }
        saved = {};
    });

    it('returns null when SITE_ID is missing (test-runner concern, never read from app .env)', () => {
        process.env.PUBLIC__app__commerce__api__clientId = 'cid';
        process.env.PUBLIC__app__commerce__api__organizationId = 'oid';
        process.env.PUBLIC__app__commerce__api__shortCode = 'short';
        delete process.env.SITE_ID;

        expect(getScapiConfig()).toBeNull();
    });

    it('reads SCAPI vars from process.env when present (CI path)', () => {
        process.env.PUBLIC__app__commerce__api__clientId = 'env-cid';
        process.env.PUBLIC__app__commerce__api__organizationId = 'env-oid';
        process.env.PUBLIC__app__commerce__api__shortCode = 'env-short';
        process.env.COMMERCE_API_SLAS_SECRET = 'env-secret';
        process.env.SITE_ID = 'RefArchGlobal';

        expect(getScapiConfig()).toEqual({
            clientId: 'env-cid',
            organizationId: 'env-oid',
            shortCode: 'env-short',
            siteId: 'RefArchGlobal',
            slasSecret: 'env-secret',
        });
    });

    it('omits slasSecret when not set (still returns valid config)', () => {
        process.env.PUBLIC__app__commerce__api__clientId = 'cid';
        process.env.PUBLIC__app__commerce__api__organizationId = 'oid';
        process.env.PUBLIC__app__commerce__api__shortCode = 'short';
        process.env.SITE_ID = 'Site';
        delete process.env.COMMERCE_API_SLAS_SECRET;

        const config = getScapiConfig();
        expect(config).not.toBeNull();
        expect(config?.slasSecret).toBeUndefined();
    });
});

describe('isRateLimitError', () => {
    // Mirrors isAuthError's anchoring: match only our error-formatter prefixes
    // (`Status: <code>` / `failed (<code>)`) for 409/429, never a bare 409/429
    // echoed in a body id.

    it('matches the SLAS "Status: 409" formatter shape', () => {
        expect(
            isRateLimitError(
                new Error(
                    'SLAS authenticateCustomer failed — no Location header. Status: 409. Body: ' +
                        '{"message":"Tenant has already performed login in last 1 second"}'
                )
            )
        ).toBe(true);
    });

    it('matches the SLAS "failed (409):" formatter shape', () => {
        expect(isRateLimitError(new Error('SLAS token exchange failed (409): conflict'))).toBe(true);
    });

    it('matches "Status: 409" with extra whitespace and trailing punctuation', () => {
        expect(isRateLimitError(new Error('Failure. Status:  409. Retry?'))).toBe(true);
    });

    it('matches the SLAS "Status: 429" formatter shape (Too Many Requests)', () => {
        expect(
            isRateLimitError(
                new Error('SLAS guest login (PKCE authorize) failed — no Location header. Status: 429. Body: {}')
            )
        ).toBe(true);
    });

    it('matches the SLAS "failed (429):" formatter shape', () => {
        expect(
            isRateLimitError(new Error('SLAS guest login (client_credentials) failed (429): Too Many Requests'))
        ).toBe(true);
    });

    it('does NOT match a 5xx whose body echoes "429" in a request id', () => {
        expect(isRateLimitError(new Error('SLAS token exchange failed (502): {"request_id":"req_429abc"}'))).toBe(
            false
        );
    });

    it('does NOT match a 401/403 (auth error, handled separately)', () => {
        expect(isRateLimitError(new Error('SLAS authenticateCustomer failed — Status: 401'))).toBe(false);
        expect(isRateLimitError(new Error('failed (403): forbidden'))).toBe(false);
    });

    it('does NOT match a 5xx whose body echoes "409" in a request id', () => {
        expect(isRateLimitError(new Error('SLAS token exchange failed (502): {"request_id":"req_409abc"}'))).toBe(
            false
        );
    });

    it('does NOT match arbitrary text containing "409"', () => {
        expect(isRateLimitError(new Error('Read 409 bytes from stream'))).toBe(false);
    });

    it('returns false for non-Error values', () => {
        expect(isRateLimitError('a plain string with no markers')).toBe(false);
        expect(isRateLimitError(undefined)).toBe(false);
        expect(isRateLimitError(null)).toBe(false);
    });

    it('matches when the message is reached via String(error) fallback', () => {
        expect(isRateLimitError({ toString: () => 'failed (409): nope' })).toBe(true);
        expect(isRateLimitError({ toString: () => 'failed (502): req_409abc' })).toBe(false);
    });
});

describe('withSlasRetry', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const rateLimit = () => new Error('SLAS authenticateCustomer failed — no Location header. Status: 409. Body: {}');

    it('returns the result immediately when the first attempt succeeds (no delay)', async () => {
        const fn = vi.fn().mockResolvedValue('ok');

        const result = await withSlasRetry(fn);

        expect(result).toBe('ok');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on a 409 and succeeds on a later attempt', async () => {
        const fn = vi.fn().mockRejectedValueOnce(rateLimit()).mockResolvedValueOnce('ok');

        const promise = withSlasRetry(fn, { attempts: 3, baseDelayMs: 1200 });
        // Drain the backoff delay between attempt 1 and 2.
        await vi.advanceTimersByTimeAsync(1200);

        await expect(promise).resolves.toBe('ok');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('backs off with increasing delay per attempt (>= the 1s SLAS gate)', async () => {
        const fn = vi
            .fn()
            .mockRejectedValueOnce(rateLimit())
            .mockRejectedValueOnce(rateLimit())
            .mockResolvedValueOnce('ok');

        const promise = withSlasRetry(fn, { attempts: 3, baseDelayMs: 1200 });

        // First backoff: baseDelayMs * 1. Not enough time yet for the 2nd backoff.
        await vi.advanceTimersByTimeAsync(1200);
        expect(fn).toHaveBeenCalledTimes(2);

        // Second backoff: baseDelayMs * 2.
        await vi.advanceTimersByTimeAsync(2400);
        await expect(promise).resolves.toBe('ok');
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it('gives up after `attempts` and rethrows the last 409', async () => {
        const fn = vi.fn().mockRejectedValue(rateLimit());

        const promise = withSlasRetry(fn, { attempts: 3, baseDelayMs: 1200 });
        const assertion = expect(promise).rejects.toThrow(/409/);
        await vi.advanceTimersByTimeAsync(1200 + 2400);

        await assertion;
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it('does NOT retry a non-409 error — rethrows immediately', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('SLAS token exchange failed (502): bad gateway'));

        await expect(withSlasRetry(fn, { attempts: 3, baseDelayMs: 1200 })).rejects.toThrow(/502/);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry a 401 auth error', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('SLAS authenticateCustomer failed — Status: 401'));

        await expect(withSlasRetry(fn)).rejects.toThrow(/401/);
        expect(fn).toHaveBeenCalledTimes(1);
    });
});
