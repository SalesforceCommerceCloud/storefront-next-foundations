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
 * Cross-module integration: verifyTurnstileToken must record into the live health module.
 *
 * The unit suites for these modules mock each other to isolate behavior. That isolation
 * makes them blind to wiring regressions: rename `recordSiteverifyOutcome` everywhere it's
 * imported and the mocked tests still pass. This file exercises both modules together with
 * NO mocking of internal APIs (only `fetch` is stubbed) so that the wiring is testable.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstileToken } from './verify.server';
import { isTurnstileDegraded, resetHealthCache, getSiteverifyMetricsSnapshot } from './health.server';

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    resetHealthCache();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    resetHealthCache();
});

describe('verifyTurnstileToken ↔ health.server wiring', () => {
    it('a successful siteverify call records a non-failure into the live health module', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 })
        );

        await verifyTurnstileToken({ token: 'tok', secretKey: 'secret' });

        const snap = getSiteverifyMetricsSnapshot();
        expect(snap.sampleCount).toBe(1);
        expect(snap.failureCount).toBe(0);
    });

    it('an internal-error siteverify response records as a failure', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response(JSON.stringify({ success: false, 'error-codes': ['internal-error'] }), { status: 200 })
        );

        await verifyTurnstileToken({ token: 'tok', secretKey: 'secret' });

        const snap = getSiteverifyMetricsSnapshot();
        expect(snap.sampleCount).toBe(1);
        expect(snap.failureCount).toBe(1);
    });

    it('a 5xx siteverify response records as a failure', async () => {
        vi.mocked(fetch).mockResolvedValue(new Response('boom', { status: 503 }));

        await verifyTurnstileToken({ token: 'tok', secretKey: 'secret' });

        const snap = getSiteverifyMetricsSnapshot();
        expect(snap.failureCount).toBe(1);
    });

    it('a 4xx siteverify response records as a non-failure (our problem, not CF)', async () => {
        vi.mocked(fetch).mockResolvedValue(new Response('bad', { status: 400 }));

        await verifyTurnstileToken({ token: 'tok', secretKey: 'secret' });

        const snap = getSiteverifyMetricsSnapshot();
        expect(snap.sampleCount).toBe(1);
        expect(snap.failureCount).toBe(0);
    });

    it('a network error records as a failure', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'));

        await verifyTurnstileToken({ token: 'tok', secretKey: 'secret' });

        const snap = getSiteverifyMetricsSnapshot();
        expect(snap.failureCount).toBe(1);
    });

    it('repeated CF-side failures eventually flip isTurnstileDegraded to true', async () => {
        // Pump enough failures to cross the rate AND min-failure thresholds. Note: we use
        // mockImplementation so each call gets a fresh Response (Response bodies can only
        // be consumed once — mockResolvedValue would return a locked stream).
        vi.mocked(fetch).mockImplementation(() =>
            Promise.resolve(
                new Response(JSON.stringify({ success: false, 'error-codes': ['internal-error'] }), { status: 200 })
            )
        );

        for (let i = 0; i < 6; i++) {
            await verifyTurnstileToken({ token: 'tok', secretKey: 'secret' });
        }

        // Tier 1 should now be authoritative AND in degraded state — without consulting CDN.
        const snap = getSiteverifyMetricsSnapshot();
        expect(snap.failureCount).toBe(6);
        expect(snap.failureRate).toBe(1);
        expect(await isTurnstileDegraded()).toBe(true);
    });

    it('a single bad token does NOT poison the metrics (invalid-input-response is not a failure)', async () => {
        // Bot detection working as intended. Many of these in a row should still leave
        // the platform looking healthy. Fresh Response per call (see note above).
        vi.mocked(fetch).mockImplementation(() =>
            Promise.resolve(
                new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), {
                    status: 200,
                })
            )
        );

        for (let i = 0; i < 20; i++) {
            await verifyTurnstileToken({ token: 'bad', secretKey: 'secret' });
        }

        const snap = getSiteverifyMetricsSnapshot();
        expect(snap.sampleCount).toBe(20);
        expect(snap.failureCount).toBe(0);
        expect(snap.failureRate).toBe(0);
    });

    it('records a real wall-clock duration that influences p95', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(1_000_000);

        let resolveFetch: ((res: Response) => void) | null = null;
        vi.mocked(fetch).mockImplementation(
            () =>
                new Promise<Response>((resolve) => {
                    resolveFetch = resolve;
                })
        );

        const promise = verifyTurnstileToken({ token: 'tok', secretKey: 'secret' });
        // Simulate a 4500ms response
        vi.setSystemTime(1_004_500);
        (resolveFetch as unknown as (r: Response) => void)(
            new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 })
        );
        await promise;

        const snap = getSiteverifyMetricsSnapshot();
        expect(snap.sampleCount).toBe(1);
        expect(snap.p95LatencyMs).toBe(4500);
    });
});
