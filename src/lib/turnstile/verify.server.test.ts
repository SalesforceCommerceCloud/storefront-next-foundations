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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstileToken } from './verify.server';
import { recordSiteverifyOutcome } from './health.server';

vi.mock('./health.server', () => ({
    recordSiteverifyOutcome: vi.fn(),
}));

describe('verifyTurnstileToken', () => {
    const recordMock = vi.mocked(recordSiteverifyOutcome);

    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
        recordMock.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return success when Cloudflare returns success: true', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response(
                JSON.stringify({
                    success: true,
                    challenge_ts: '2026-04-20T12:00:00.000Z',
                    hostname: 'store.example.com',
                    'error-codes': [],
                    action: '',
                }),
                { status: 200 }
            )
        );

        const result = await verifyTurnstileToken({
            token: 'valid-token',
            secretKey: '1x0000000000000000000000000000000AA',
        });

        expect(result.success).toBe(true);
        expect(result.challengeTs).toBe('2026-04-20T12:00:00.000Z');
        expect(result.hostname).toBe('store.example.com');
        expect(result.errorCodes).toEqual([]);
    });

    it('should return failure when Cloudflare returns success: false', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response(
                JSON.stringify({
                    success: false,
                    'error-codes': ['invalid-input-response'],
                }),
                { status: 200 }
            )
        );

        const result = await verifyTurnstileToken({
            token: 'invalid-token',
            secretKey: '2x0000000000000000000000000000000AA',
        });

        expect(result.success).toBe(false);
        expect(result.errorCodes).toContain('invalid-input-response');
    });

    it('should send correct request body with remoteIp', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 })
        );

        await verifyTurnstileToken({
            token: 'test-token',
            secretKey: 'test-secret',
            remoteIp: '192.168.1.1',
        });

        expect(fetch).toHaveBeenCalledWith(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('remoteip=192.168.1.1'),
            })
        );
    });

    it('should return error when token is missing', async () => {
        const result = await verifyTurnstileToken({
            token: '',
            secretKey: 'test-secret',
        });

        expect(result.success).toBe(false);
        expect(result.errorCodes).toContain('missing-input-response');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should return error when secret key is missing', async () => {
        const result = await verifyTurnstileToken({
            token: 'test-token',
            secretKey: '',
        });

        expect(result.success).toBe(false);
        expect(result.errorCodes).toContain('missing-input-secret');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle HTTP errors', async () => {
        vi.mocked(fetch).mockResolvedValue(new Response('Server Error', { status: 500 }));

        const result = await verifyTurnstileToken({
            token: 'test-token',
            secretKey: 'test-secret',
        });

        expect(result.success).toBe(false);
        expect(result.errorCodes).toContain('http-error-500');
    });

    it('should handle network errors', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('Network failure'));

        const result = await verifyTurnstileToken({
            token: 'test-token',
            secretKey: 'test-secret',
        });

        expect(result.success).toBe(false);
        expect(result.errorCodes).toContain('internal-error');
    });

    it('should handle timeout (AbortError)', async () => {
        const abortError = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
        vi.mocked(fetch).mockRejectedValue(abortError);

        const result = await verifyTurnstileToken({
            token: 'test-token',
            secretKey: 'test-secret',
        });

        expect(result.success).toBe(false);
        expect(result.errorCodes).toContain('internal-error');
    });

    it('should handle token-already-spent error', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response(
                JSON.stringify({
                    success: false,
                    'error-codes': ['timeout-or-duplicate'],
                }),
                { status: 200 }
            )
        );

        const result = await verifyTurnstileToken({
            token: 'already-used-token',
            secretKey: '3x0000000000000000000000000000000AA',
        });

        expect(result.success).toBe(false);
        expect(result.errorCodes).toContain('timeout-or-duplicate');
    });

    describe('siteverify outcome recording (health metrics)', () => {
        it('records a non-failure for a successful siteverify response', async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 })
            );

            await verifyTurnstileToken({ token: 'valid', secretKey: 'secret' });

            expect(recordMock).toHaveBeenCalledWith(false, expect.any(Number));
        });

        it('records a non-failure for invalid-input-response (working service rejecting bad token)', async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), {
                    status: 200,
                })
            );

            await verifyTurnstileToken({ token: 'invalid', secretKey: 'secret' });

            expect(recordMock).toHaveBeenCalledWith(false, expect.any(Number));
        });

        it('records a non-failure for timeout-or-duplicate', async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify({ success: false, 'error-codes': ['timeout-or-duplicate'] }), {
                    status: 200,
                })
            );

            await verifyTurnstileToken({ token: 'used', secretKey: 'secret' });

            expect(recordMock).toHaveBeenCalledWith(false, expect.any(Number));
        });

        it('records a failure when siteverify returns internal-error', async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify({ success: false, 'error-codes': ['internal-error'] }), { status: 200 })
            );

            await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            expect(recordMock).toHaveBeenCalledWith(true, expect.any(Number));
        });

        it('records a failure for HTTP 5xx', async () => {
            vi.mocked(fetch).mockResolvedValue(new Response('Server Error', { status: 503 }));

            await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            expect(recordMock).toHaveBeenCalledWith(true, expect.any(Number));
        });

        it('records a non-failure for HTTP 4xx (our problem, not CF-side)', async () => {
            vi.mocked(fetch).mockResolvedValue(new Response('Bad Request', { status: 400 }));

            await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            expect(recordMock).toHaveBeenCalledWith(false, expect.any(Number));
        });

        it('records a failure for network errors', async () => {
            vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'));

            await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            expect(recordMock).toHaveBeenCalledWith(true, expect.any(Number));
        });

        it('records a failure for timeout (AbortError)', async () => {
            const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
            vi.mocked(fetch).mockRejectedValue(abortError);

            await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            expect(recordMock).toHaveBeenCalledWith(true, expect.any(Number));
        });

        it('does not record an outcome when token or secret is missing (no SCAPI call made)', async () => {
            await verifyTurnstileToken({ token: '', secretKey: 'secret' });
            await verifyTurnstileToken({ token: 'token', secretKey: '' });

            expect(recordMock).not.toHaveBeenCalled();
        });

        it('records duration as a non-negative number on every recorded path', async () => {
            // Successful path
            vi.mocked(fetch).mockResolvedValueOnce(
                new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 })
            );
            await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });
            expect(recordMock).toHaveBeenLastCalledWith(false, expect.any(Number));
            const successDuration = recordMock.mock.calls[0][1];
            expect(successDuration).toBeGreaterThanOrEqual(0);

            // 5xx path
            vi.mocked(fetch).mockResolvedValueOnce(new Response('boom', { status: 503 }));
            await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });
            const fivexxDuration = recordMock.mock.calls[1][1];
            expect(fivexxDuration).toBeGreaterThanOrEqual(0);

            // Network-failure path
            vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNRESET'));
            await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });
            const networkDuration = recordMock.mock.calls[2][1];
            expect(networkDuration).toBeGreaterThanOrEqual(0);

            // AbortError path
            const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
            vi.mocked(fetch).mockRejectedValueOnce(abortError);
            await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });
            const abortDuration = recordMock.mock.calls[3][1];
            expect(abortDuration).toBeGreaterThanOrEqual(0);
        });

        it('handles 2xx response missing error-codes key (defaults to empty array)', async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify({ success: true /* no error-codes key */ }), { status: 200 })
            );

            const result = await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            expect(result.success).toBe(true);
            expect(result.errorCodes).toEqual([]);
            // Falsy `error-codes` doesn't include 'internal-error', so this is a non-failure
            expect(recordMock).toHaveBeenLastCalledWith(false, expect.any(Number));
        });

        it('handles 2xx response with success=false and missing error-codes', async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify({ success: false /* no error-codes */ }), { status: 200 })
            );

            const result = await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            expect(result.success).toBe(false);
            expect(result.errorCodes).toEqual([]);
            expect(recordMock).toHaveBeenLastCalledWith(false, expect.any(Number));
        });

        it('records non-failure for HTTP 4xx (our request was bad, not CF-side)', async () => {
            vi.mocked(fetch).mockResolvedValue(new Response('Bad Request', { status: 400 }));
            await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });
            expect(recordMock).toHaveBeenLastCalledWith(false, expect.any(Number));

            vi.mocked(fetch).mockResolvedValue(new Response('Unauthorized', { status: 401 }));
            await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });
            expect(recordMock.mock.calls[1][0]).toBe(false);

            vi.mocked(fetch).mockResolvedValue(new Response('Forbidden', { status: 403 }));
            await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });
            expect(recordMock.mock.calls[2][0]).toBe(false);
        });

        it('records failure for every 5xx status (500-599)', async () => {
            for (const status of [500, 502, 503, 504]) {
                recordMock.mockClear();
                vi.mocked(fetch).mockResolvedValue(new Response('err', { status }));
                await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });
                expect(recordMock).toHaveBeenLastCalledWith(true, expect.any(Number));
            }
        });

        it('returns errorCodes containing the http-error-XXX code for non-2xx', async () => {
            vi.mocked(fetch).mockResolvedValue(new Response('teapot', { status: 418 }));
            const result = await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            expect(result.success).toBe(false);
            expect(result.errorCodes).toEqual(['http-error-418']);
        });

        it('aborts siteverify after the configured 5s timeout (covers timer callback)', async () => {
            vi.useFakeTimers();

            // Hang the fetch and respect the AbortSignal so the timeout callback actually
            // calls controller.abort() and the await throws AbortError.
            vi.mocked(fetch).mockImplementation((_url: RequestInfo | URL, init?: RequestInit) => {
                return new Promise<Response>((_resolve, reject) => {
                    init?.signal?.addEventListener('abort', () => {
                        const err = new Error('aborted');
                        err.name = 'AbortError';
                        reject(err);
                    });
                });
            });

            const promise = verifyTurnstileToken({ token: 'token', secretKey: 'secret' });
            await vi.advanceTimersByTimeAsync(5500);

            const result = await promise;
            expect(result.success).toBe(false);
            expect(result.errorCodes).toEqual(['internal-error']);
            // Recorded as a CF-side failure
            expect(recordMock).toHaveBeenLastCalledWith(true, expect.any(Number));

            vi.useRealTimers();
        });
    });

    describe('malformed and edge-case responses', () => {
        // The siteverify response body is parsed via response.json(). If the body is
        // malformed or unexpected, we need to handle it gracefully without crashing the
        // request handler.

        it('handles 2xx response with malformed JSON body (treats as fail-open)', async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response('not-valid-json{', {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

            const result = await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            // response.json() throws → falls into the outer catch, recorded as failure
            expect(result.success).toBe(false);
            expect(result.errorCodes).toEqual(['internal-error']);
            expect(recordMock).toHaveBeenLastCalledWith(true, expect.any(Number));
        });

        it('handles 2xx response with body that is empty', async () => {
            vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }));

            const result = await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            // Empty body → JSON parse throws → falls into outer catch
            expect(result.success).toBe(false);
            expect(result.errorCodes).toEqual(['internal-error']);
            expect(recordMock).toHaveBeenLastCalledWith(true, expect.any(Number));
        });

        it('handles success=false response with non-array error-codes (treats as no codes)', async () => {
            // Defensive: if CF ever shipped a malformed response with error-codes as a string
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify({ success: false, 'error-codes': 'not-an-array' }), {
                    status: 200,
                })
            );

            const result = await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            // The code does data['error-codes'].includes('internal-error') which is a
            // valid String.prototype.includes call - returns false
            expect(result.success).toBe(false);
            // Recorded as non-failure since 'not-an-array' doesn't include 'internal-error'
            expect(recordMock).toHaveBeenLastCalledWith(false, expect.any(Number));
        });

        it('forwards remoteIp into the siteverify body when provided', async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 })
            );

            await verifyTurnstileToken({
                token: 'token',
                secretKey: 'secret',
                remoteIp: '192.0.2.42',
            });

            const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
            const body = init.body as string;
            expect(body).toContain('remoteip=192.0.2.42');
            expect(body).toContain('secret=secret');
            expect(body).toContain('response=token');
        });

        it('does not include remoteIp in body when not provided', async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 })
            );

            await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
            const body = init.body as string;
            expect(body).not.toContain('remoteip');
        });

        it('returns the structured action and challengeTs fields when present', async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(
                    JSON.stringify({
                        success: true,
                        challenge_ts: '2026-05-08T12:34:56.789Z',
                        hostname: 'shop.example.com',
                        'error-codes': [],
                        action: 'login',
                    }),
                    { status: 200 }
                )
            );

            const result = await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            expect(result.success).toBe(true);
            expect(result.challengeTs).toBe('2026-05-08T12:34:56.789Z');
            expect(result.hostname).toBe('shop.example.com');
            expect(result.action).toBe('login');
        });

        it('returns missing-input-response when both token and secret are empty (token check first)', async () => {
            const result = await verifyTurnstileToken({ token: '', secretKey: '' });
            // The condition is `!token ? 'missing-input-response' : 'missing-input-secret'`,
            // so the token-missing case takes precedence when both are empty.
            expect(result.errorCodes).toEqual(['missing-input-response']);
            expect(result.success).toBe(false);
            expect(fetch).not.toHaveBeenCalled();
        });

        it('uses POST with application/x-www-form-urlencoded content type', async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 })
            );

            await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
            expect(init.method).toBe('POST');
            expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/x-www-form-urlencoded');
        });

        it('returns hostname undefined when not in response body', async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 })
            );

            const result = await verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            expect(result.hostname).toBeUndefined();
            expect(result.challengeTs).toBeUndefined();
            expect(result.action).toBeUndefined();
        });

        it('records duration as roughly the elapsed wall-clock time of the call', async () => {
            // Use a deferred fetch to control timing
            let resolveResponse: ((res: Response) => void) | null = null;
            vi.mocked(fetch).mockImplementation(
                () =>
                    new Promise<Response>((resolve) => {
                        resolveResponse = resolve;
                    })
            );

            vi.useFakeTimers();
            vi.setSystemTime(1_000_000);

            const promise = verifyTurnstileToken({ token: 'token', secretKey: 'secret' });

            // Simulate 250ms elapsed during the fetch
            vi.setSystemTime(1_000_250);
            (resolveResponse as unknown as (r: Response) => void)(
                new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 })
            );

            await promise;

            expect(recordMock).toHaveBeenLastCalledWith(false, 250);

            vi.useRealTimers();
        });
    });
});
