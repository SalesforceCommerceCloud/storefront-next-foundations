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
import {
    isTurnstileDegraded,
    resetHealthCache,
    recordSiteverifyOutcome,
    getSiteverifyMetricsSnapshot,
} from './health.server';

function mockCdnProbe(cdnStatus: number | 'error') {
    vi.mocked(fetch).mockImplementation((url: RequestInfo | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('challenges.cloudflare.com')) {
            if (cdnStatus === 'error') return Promise.reject(new Error('Network failure'));
            return Promise.resolve(new Response('', { status: cdnStatus }));
        }
        return Promise.resolve(new Response('', { status: 404 }));
    });
}

// File-level isolation. The health module holds module-scope state (ring buffer, hysteresis
// verdict, CDN cache). resetHealthCache() runs before AND after every test — defense in
// depth so a forgotten `vi.useRealTimers()` or a thrown assertion can't leak state into
// the next test. Real timers are restored unconditionally for the same reason.
beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    resetHealthCache();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    resetHealthCache();
    delete process.env.TURNSTILE_CDN_PROBE_URL;
});

describe('isTurnstileDegraded', () => {
    describe('CDN probe', () => {
        it('returns false when CDN responds 200 and status page is operational', async () => {
            mockCdnProbe(200);

            const result = await isTurnstileDegraded();

            expect(result).toBe(false);
        });

        it('returns true when CDN responds 500 (server error)', async () => {
            mockCdnProbe(500);

            const result = await isTurnstileDegraded();

            expect(result).toBe(true);
        });

        it('returns true when CDN responds 503 (service unavailable)', async () => {
            mockCdnProbe(503);

            const result = await isTurnstileDegraded();

            expect(result).toBe(true);
        });

        it('returns true when CDN request times out (AbortError)', async () => {
            mockCdnProbe('error');

            const result = await isTurnstileDegraded();

            expect(result).toBe(true);
        });

        it('aborts the CDN HEAD request after the configured timeout', async () => {
            // Hang the fetch and respect the AbortSignal so the timeout path actually
            // fires the abort callback. This covers the inline `setTimeout(() => controller.abort())`.
            vi.useFakeTimers();
            vi.mocked(fetch).mockImplementation((_url: RequestInfo | URL, init?: RequestInit) => {
                return new Promise<Response>((_resolve, reject) => {
                    init?.signal?.addEventListener('abort', () => {
                        const err = new Error('aborted');
                        err.name = 'AbortError';
                        reject(err);
                    });
                });
            });

            const promise = isTurnstileDegraded();
            // Advance past the 3s CDN probe timeout to fire the abort callback
            await vi.advanceTimersByTimeAsync(3500);

            expect(await promise).toBe(true);

            vi.useRealTimers();
        });

        it('returns false when CDN responds 404 (not a server-side issue)', async () => {
            mockCdnProbe(404);

            const result = await isTurnstileDegraded();

            expect(result).toBe(false);
        });

        it('uses TURNSTILE_CDN_PROBE_URL env var when set', async () => {
            process.env.TURNSTILE_CDN_PROBE_URL = 'https://custom-cdn.example.com/turnstile.js';

            vi.mocked(fetch).mockImplementation((url: RequestInfo | URL) => {
                const urlStr = typeof url === 'string' ? url : url.toString();
                if (urlStr === 'https://custom-cdn.example.com/turnstile.js') {
                    return Promise.resolve(new Response('', { status: 200 }));
                }
                return Promise.resolve(new Response('', { status: 404 }));
            });

            await isTurnstileDegraded();

            expect(fetch).toHaveBeenCalledWith(
                'https://custom-cdn.example.com/turnstile.js',
                expect.objectContaining({ method: 'HEAD' })
            );
        });
    });

    describe('CDN-tier verdict (when tier 1 has no samples)', () => {
        // With no siteverify samples, tier 1 returns null and the CDN probe is the
        // sole signal that decides the verdict.

        it('returns true when CDN responds 5xx', async () => {
            mockCdnProbe(500);
            expect(await isTurnstileDegraded()).toBe(true);
        });

        it('returns true when CDN fetch errors out', async () => {
            mockCdnProbe('error');
            expect(await isTurnstileDegraded()).toBe(true);
        });

        it('returns false when CDN responds healthy', async () => {
            mockCdnProbe(200);
            expect(await isTurnstileDegraded()).toBe(false);
        });
    });

    describe('caching', () => {
        it('caches CDN result and does not re-fetch within TTL', async () => {
            mockCdnProbe(200);

            await isTurnstileDegraded();
            await isTurnstileDegraded();
            await isTurnstileDegraded();

            const cdnCalls = vi
                .mocked(fetch)
                .mock.calls.filter((call) => String(call[0]).includes('challenges.cloudflare.com'));
            expect(cdnCalls).toHaveLength(1);
        });

        it('CDN cache uses stale-while-revalidate after TTL', async () => {
            mockCdnProbe(200);

            const first = await isTurnstileDegraded();
            expect(first).toBe(false);

            vi.useFakeTimers();
            vi.advanceTimersByTime(61_000);

            mockCdnProbe(500);

            const stale = await isTurnstileDegraded();
            expect(stale).toBe(false);

            await vi.advanceTimersByTimeAsync(100);

            const fresh = await isTurnstileDegraded();
            expect(fresh).toBe(true);

            vi.useRealTimers();
        });

        it('resetHealthCache clears the CDN cache', async () => {
            mockCdnProbe(200);
            await isTurnstileDegraded();

            mockCdnProbe(500);
            resetHealthCache();

            const result = await isTurnstileDegraded();
            expect(result).toBe(true);
        });

        it('CDN refresh dedupes concurrent in-flight refreshes (early-return guard)', async () => {
            // Prime cache
            mockCdnProbe(200);
            await isTurnstileDegraded();

            vi.useFakeTimers();
            vi.advanceTimersByTime(61_000); // expire CDN cache

            // Use a deferred fetch so the refresh stays in-flight while we issue a second call.
            let resolveCdnHead: ((res: Response) => void) | null = null;
            vi.mocked(fetch).mockImplementation(() => {
                return new Promise<Response>((resolve) => {
                    resolveCdnHead = resolve;
                });
            });

            // First call: returns stale, triggers a background refresh (in-flight).
            const firstResult = await isTurnstileDegraded();
            expect(firstResult).toBe(false);

            // Count CDN HEAD calls so far
            const cdnCallsBefore = vi
                .mocked(fetch)
                .mock.calls.filter((c) => String(c[0]).includes('challenges.cloudflare.com')).length;

            // Second call while refresh is still in-flight: should NOT kick off another fetch
            // (early-return guard). Returns stale value.
            const secondResult = await isTurnstileDegraded();
            expect(secondResult).toBe(false);

            const cdnCallsAfter = vi
                .mocked(fetch)
                .mock.calls.filter((c) => String(c[0]).includes('challenges.cloudflare.com')).length;
            // No new CDN fetch was issued by the second call
            expect(cdnCallsAfter).toBe(cdnCallsBefore);

            // Resolve the in-flight refresh and clean up
            if (resolveCdnHead) (resolveCdnHead as (r: Response) => void)(new Response('', { status: 200 }));

            vi.useRealTimers();
        });
    });

    describe('siteverify metrics (primary tier)', () => {
        it('returns false when fewer than min samples have been recorded (falls through to lower tiers)', async () => {
            // 4 failures - below the 5-sample minimum, so not authoritative
            mockCdnProbe(200);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(true);

            const result = await isTurnstileDegraded();

            // CDN healthy and status page operational, so the verdict is healthy
            expect(result).toBe(false);
        });

        it('returns true when failure rate exceeds threshold over enough samples (overrides healthy CDN)', async () => {
            // CDN looks healthy - but siteverify samples say otherwise
            mockCdnProbe(200);
            // 5 failures, 5 successes = 50% failure rate, at the threshold
            for (let i = 0; i < 5; i++) recordSiteverifyOutcome(true);
            for (let i = 0; i < 5; i++) recordSiteverifyOutcome(false);

            const result = await isTurnstileDegraded();

            expect(result).toBe(true);
        });

        it('returns false when enough samples show low failure rate (overrides degraded CDN)', async () => {
            // CDN is broken in the mock, but siteverify is mostly succeeding
            mockCdnProbe(500);
            // 1 failure, 9 successes = 10% failure rate, well below threshold
            recordSiteverifyOutcome(true);
            for (let i = 0; i < 9; i++) recordSiteverifyOutcome(false);

            const result = await isTurnstileDegraded();

            // Tier 1 is authoritative when it has enough samples; CDN tier is bypassed
            expect(result).toBe(false);
        });

        it('drops samples older than the 60-second window', async () => {
            vi.useFakeTimers({ now: Date.now() });
            mockCdnProbe(200);

            // Record 10 failures
            for (let i = 0; i < 10; i++) recordSiteverifyOutcome(true);

            // Advance past the window
            vi.advanceTimersByTime(61_000);

            // Old samples should be pruned; verdict should fall through to lower tiers
            const result = await isTurnstileDegraded();
            expect(result).toBe(false);

            vi.useRealTimers();
        });

        it('returns true when only failures are recorded (above min samples)', async () => {
            mockCdnProbe(200);
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true);

            const result = await isTurnstileDegraded();

            expect(result).toBe(true);
        });

        it('does not skip CDN/status checks when no siteverify samples exist', async () => {
            // No samples; degraded CDN should still drive the verdict
            mockCdnProbe(500);

            const result = await isTurnstileDegraded();

            expect(result).toBe(true);
        });
    });

    describe('siteverify min-failure-count guard', () => {
        // Without this guard, a single failure on the 5th sample (1/5 = 20%, but if it
        // were 1/2 = 50%) could trip the verdict at the boundary. The guard requires
        // an absolute floor of failures regardless of rate.

        it('does not declare degraded when only 2 of 5 samples failed (failures < 3)', async () => {
            mockCdnProbe(200);
            // 2 failures, 3 successes = 40% rate (below enter threshold) AND failures < 3
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 100);

            const result = await isTurnstileDegraded();
            expect(result).toBe(false);
        });

        it('does not declare degraded with 2 of 4 samples failed even at 50% rate', async () => {
            // Simulates the pathological "5th sample fails → spike" - here we synthesize
            // a 50%-but-only-2-failures shape. Even though the rate hits the enter
            // threshold, the absolute count is below the floor so no flip occurs.
            // (4 samples is below the min-samples threshold anyway, so this returns null
            //  and falls through to lower tiers.)
            mockCdnProbe(200);
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 100);

            const result = await isTurnstileDegraded();
            expect(result).toBe(false);
        });

        it('declares degraded when 3 of 5 samples failed and rate exceeds threshold', async () => {
            mockCdnProbe(200);
            // 3 failures, 2 successes = 60% rate, 3 failures - both checks pass
            for (let i = 0; i < 3; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 2; i++) recordSiteverifyOutcome(false, 100);

            const result = await isTurnstileDegraded();
            expect(result).toBe(true);
            expect(getSiteverifyMetricsSnapshot()).toEqual({
                sampleCount: 5,
                failureCount: 3,
                failureRate: 0.6,
                p95LatencyMs: 100,
                currentVerdict: true,
            });
        });

        it('does not declare degraded with exactly 3 failures if rate does not breach', async () => {
            // 3 failures, 7 successes = 30% rate (below enter), even though absolute count is met
            mockCdnProbe(200);
            for (let i = 0; i < 3; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 7; i++) recordSiteverifyOutcome(false, 100);

            const result = await isTurnstileDegraded();
            expect(result).toBe(false);
            expect(getSiteverifyMetricsSnapshot()).toEqual({
                sampleCount: 10,
                failureCount: 3,
                failureRate: 0.3,
                p95LatencyMs: 100,
                currentVerdict: false,
            });
        });
    });

    describe('siteverify hysteresis', () => {
        // Once degraded, the verdict stays until the rate drops below the EXIT threshold
        // (30%). This prevents flap when the rate hovers near the ENTER threshold (50%).

        it('stays degraded when rate drifts to 40% (between EXIT and ENTER)', async () => {
            mockCdnProbe(200);
            // Enter degraded state at 60%
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(true);

            // Improve to 8/20 = 40% (above EXIT 30%, below ENTER 50%)
            for (let i = 0; i < 2; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 8; i++) recordSiteverifyOutcome(false, 100);

            // Should still be degraded (hysteresis); pin all snapshot fields.
            expect(await isTurnstileDegraded()).toBe(true);
            expect(getSiteverifyMetricsSnapshot()).toEqual({
                sampleCount: 20,
                failureCount: 8,
                failureRate: 0.4,
                p95LatencyMs: 100,
                currentVerdict: true,
            });
        });

        it('exits degraded only when rate drops below 30% (EXIT threshold)', async () => {
            mockCdnProbe(200);
            // Enter degraded state
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(true);

            // Record many successes to drive the rate below 30%
            for (let i = 0; i < 50; i++) recordSiteverifyOutcome(false, 100);
            // Window now caps at 200 samples or window-aged; here all 60 samples fit:
            // 6 failures / 60 samples = 10%
            expect(await isTurnstileDegraded()).toBe(false);
            expect(getSiteverifyMetricsSnapshot()).toEqual({
                sampleCount: 60,
                failureCount: 6,
                failureRate: 6 / 60,
                p95LatencyMs: 100,
                currentVerdict: false,
            });
        });

        it('does NOT enter degraded at 49% rate (just below ENTER threshold)', async () => {
            mockCdnProbe(200);
            // 49 failures + 51 successes = 49% (below 50% enter)
            for (let i = 0; i < 49; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 51; i++) recordSiteverifyOutcome(false, 100);

            expect(await isTurnstileDegraded()).toBe(false);
            expect(getSiteverifyMetricsSnapshot()).toEqual({
                sampleCount: 100,
                failureCount: 49,
                failureRate: 0.49,
                p95LatencyMs: 100,
                currentVerdict: false,
            });
        });

        it('enters degraded at exactly 50% rate (>= ENTER threshold)', async () => {
            mockCdnProbe(200);
            for (let i = 0; i < 5; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 5; i++) recordSiteverifyOutcome(false, 100);

            expect(await isTurnstileDegraded()).toBe(true);
            expect(getSiteverifyMetricsSnapshot()).toEqual({
                sampleCount: 10,
                failureCount: 5,
                failureRate: 0.5,
                p95LatencyMs: 100,
                currentVerdict: true,
            });
        });

        it('handles flap-prone sequence near 50% without oscillating', async () => {
            mockCdnProbe(200);
            // Build a sequence that hovers right around the 50% line:
            // 6/10 → 5/11 → 6/11 → 5/12 ...
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(true); // 60%, enter

            // One success: 6/11 = 54% (still degraded)
            recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(true);

            // Another success: 6/12 = 50% (still degraded by hysteresis - rate not below EXIT)
            recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(true);

            // Continue: 6/15 = 40% (still degraded; > EXIT threshold)
            for (let i = 0; i < 3; i++) recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(true);

            // Many more successes: 6/30 = 20% (drops below EXIT, recovers)
            for (let i = 0; i < 15; i++) recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(false);
        });

        it('returns degraded (not null) when in degraded state and samples drop below min', async () => {
            vi.useFakeTimers({ now: Date.now() });
            mockCdnProbe(500); // CDN would say degraded too

            // Enter degraded state
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(true);

            // Advance past window so samples expire
            vi.advanceTimersByTime(61_000);

            // Window is now empty. Hysteresis says: stay degraded (don't drop to null and
            // fall through to lower tiers) - this prevents flap when traffic ebbs.
            const snapshot = getSiteverifyMetricsSnapshot();
            expect(snapshot.sampleCount).toBe(0);
            expect(snapshot.currentVerdict).toBe(true);

            // isTurnstileDegraded should return true because we're still in degraded state
            expect(await isTurnstileDegraded()).toBe(true);

            vi.useRealTimers();
        });
    });

    describe('siteverify latency dimension', () => {
        it('declares degraded when p95 latency exceeds 3s, even with all successes', async () => {
            mockCdnProbe(200);
            // 10 successful samples but high latencies. p95 = the value at index 9 (0-based).
            // Latencies: nine at 100ms, one at 5000ms → sorted: [100,100,...,100,5000].
            // p95 nearest-rank: ceil(0.95 * 10) - 1 = 9 → 5000ms
            for (let i = 0; i < 9; i++) recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 5000);

            expect(await isTurnstileDegraded()).toBe(true);

            // Pin the full snapshot - if any field drifts, this test catches it.
            expect(getSiteverifyMetricsSnapshot()).toEqual({
                sampleCount: 10,
                failureCount: 0,
                failureRate: 0,
                p95LatencyMs: 5000,
                currentVerdict: true,
            });
        });

        it('does not declare degraded when p95 is below 3s and rate is healthy', async () => {
            mockCdnProbe(200);
            for (let i = 0; i < 10; i++) recordSiteverifyOutcome(false, 200);

            expect(await isTurnstileDegraded()).toBe(false);

            expect(getSiteverifyMetricsSnapshot()).toEqual({
                sampleCount: 10,
                failureCount: 0,
                failureRate: 0,
                p95LatencyMs: 200,
                currentVerdict: false,
            });
        });

        it('snapshot reports the computed p95 latency', () => {
            for (let i = 0; i < 9; i++) recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 5000);

            const snapshot = getSiteverifyMetricsSnapshot();
            expect(snapshot.p95LatencyMs).toBe(5000);
            expect(snapshot.sampleCount).toBe(10);
        });

        it('does not declare degraded with sub-threshold p95 even when median is high', async () => {
            mockCdnProbe(200);
            // 10 successful samples at 2000ms each → p95 = 2000ms (below 3000ms threshold)
            for (let i = 0; i < 10; i++) recordSiteverifyOutcome(false, 2000);

            expect(await isTurnstileDegraded()).toBe(false);
            expect(getSiteverifyMetricsSnapshot().p95LatencyMs).toBe(2000);
        });

        it('latency-triggered degradation requires the EXIT path to drop AND rate-recovery', async () => {
            mockCdnProbe(200);
            // Enter degraded via latency only (all successes, but p95 = 5s)
            for (let i = 0; i < 9; i++) recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 5000);
            expect(await isTurnstileDegraded()).toBe(true);

            // Recover with low-latency successes - should exit because rate < 30% AND p95 < 3s
            for (let i = 0; i < 100; i++) recordSiteverifyOutcome(false, 50);
            expect(await isTurnstileDegraded()).toBe(false);
        });
    });

    describe('siteverify ring buffer', () => {
        it('caps memory at 200 samples and evicts oldest first', () => {
            // Record 250 samples - the oldest 50 should be evicted
            for (let i = 0; i < 250; i++) recordSiteverifyOutcome(false, 100);

            const snapshot = getSiteverifyMetricsSnapshot();
            expect(snapshot.sampleCount).toBe(200);
        });

        it('handles ring buffer wraparound correctly (records overwritten)', () => {
            // Fill with failures, then overflow with successes - after wraparound the
            // window should mostly contain successes
            for (let i = 0; i < 200; i++) recordSiteverifyOutcome(true, 100); // all failures
            for (let i = 0; i < 200; i++) recordSiteverifyOutcome(false, 100); // overwrites all of the above

            const snapshot = getSiteverifyMetricsSnapshot();
            expect(snapshot.sampleCount).toBe(200);
            expect(snapshot.failureCount).toBe(0);
            expect(snapshot.failureRate).toBe(0);
        });

        it('returns chronologically correct samples after wraparound', () => {
            // Tests that the iteration order is preserved through wraparound
            for (let i = 0; i < 200; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 50; i++) recordSiteverifyOutcome(false, 100);

            const snapshot = getSiteverifyMetricsSnapshot();
            expect(snapshot.sampleCount).toBe(200);
            expect(snapshot.failureCount).toBe(150); // 200 fails - 50 evicted = 150
        });

        it('time-based pruning removes samples in chronological order', () => {
            vi.useFakeTimers({ now: 1_000_000 });

            recordSiteverifyOutcome(true, 100); // t=1_000_000
            vi.advanceTimersByTime(30_000);
            recordSiteverifyOutcome(true, 100); // t=1_030_000
            vi.advanceTimersByTime(35_000);
            // Now t=1_065_000. The first sample is 65s old (>60s) - should be pruned on next read.

            const snapshot = getSiteverifyMetricsSnapshot();
            expect(snapshot.sampleCount).toBe(1); // only the second sample remains

            vi.useRealTimers();
        });

        it('handles exact 60-second window boundary deterministically', () => {
            vi.useFakeTimers({ now: 1_000_000 });

            recordSiteverifyOutcome(true, 100); // t=1_000_000

            // Advance exactly 60s (cutoff = now - 60s = 1_000_000; sample.timestamp = 1_000_000;
            // condition is `timestamp < cutoff`, so equal-timestamp is NOT pruned)
            vi.advanceTimersByTime(60_000);
            expect(getSiteverifyMetricsSnapshot().sampleCount).toBe(1);

            // 1ms more → sample is now 60.001s old, strictly less than cutoff, pruned
            vi.advanceTimersByTime(1);
            expect(getSiteverifyMetricsSnapshot().sampleCount).toBe(0);

            vi.useRealTimers();
        });
    });

    describe('siteverify metrics snapshot', () => {
        it('returns zero values when ring is empty', () => {
            const snapshot = getSiteverifyMetricsSnapshot();
            expect(snapshot).toEqual({
                sampleCount: 0,
                failureCount: 0,
                failureRate: 0,
                p95LatencyMs: 0,
                currentVerdict: false,
            });
        });

        it('reports correct rate and counts mid-window', () => {
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 100);

            const snapshot = getSiteverifyMetricsSnapshot();
            expect(snapshot.sampleCount).toBe(4);
            expect(snapshot.failureCount).toBe(2);
            expect(snapshot.failureRate).toBe(0.5);
        });

        it('reports the current hysteresis verdict', async () => {
            mockCdnProbe(200);

            expect(getSiteverifyMetricsSnapshot().currentVerdict).toBe(false);

            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);
            await isTurnstileDegraded(); // triggers verdict update

            expect(getSiteverifyMetricsSnapshot().currentVerdict).toBe(true);
        });
    });

    describe('siteverify metrics snapshot — values across mutations', () => {
        // Snapshot is the hot path during outages (called on every fail-open log).
        // Tests pin VALUE correctness across record / prune / reset, not object identity —
        // identity is an implementation detail that may change if we move the cache
        // (e.g. to a Durable Object).

        it('returns equal values on consecutive calls without state changes', () => {
            recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 100);

            const a = getSiteverifyMetricsSnapshot();
            const b = getSiteverifyMetricsSnapshot();

            expect(a).toEqual(b);
        });

        it('reflects new sample after recordSiteverifyOutcome', () => {
            recordSiteverifyOutcome(false, 100);
            const before = getSiteverifyMetricsSnapshot();
            expect(before.sampleCount).toBe(1);

            recordSiteverifyOutcome(true, 100);
            const after = getSiteverifyMetricsSnapshot();

            expect(after.sampleCount).toBe(2);
            expect(after.failureCount).toBe(1);
        });

        it('reflects pruned state after window expiry', () => {
            vi.useFakeTimers({ now: 1_000_000 });

            recordSiteverifyOutcome(true, 100);
            expect(getSiteverifyMetricsSnapshot().sampleCount).toBe(1);

            // Advance past window
            vi.advanceTimersByTime(61_000);

            expect(getSiteverifyMetricsSnapshot().sampleCount).toBe(0);

            vi.useRealTimers();
        });

        it('values are stable when prune finds nothing to evict', () => {
            vi.useFakeTimers({ now: 1_000_000 });

            recordSiteverifyOutcome(false, 100);
            const a = getSiteverifyMetricsSnapshot();
            // Advance only 30s - sample is still fresh
            vi.advanceTimersByTime(30_000);
            const b = getSiteverifyMetricsSnapshot();

            expect(b).toEqual(a);

            vi.useRealTimers();
        });

        it('post-record snapshot reflects the new sample count', async () => {
            mockCdnProbe(200);

            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 200);
            await isTurnstileDegraded();

            recordSiteverifyOutcome(false, 200);

            const fresh = getSiteverifyMetricsSnapshot();
            expect(fresh.sampleCount).toBe(11);
            expect(fresh.failureCount).toBe(6);
            expect(fresh.failureRate).toBeCloseTo(6 / 11);
        });

        it('isTurnstileDegraded leaves snapshot values consistent', async () => {
            mockCdnProbe(200);

            for (let i = 0; i < 5; i++) recordSiteverifyOutcome(false, 100);

            const a = getSiteverifyMetricsSnapshot();
            expect(a.sampleCount).toBe(5);

            await isTurnstileDegraded();
            const b = getSiteverifyMetricsSnapshot();

            expect(b.sampleCount).toBe(5);
            expect(b.currentVerdict).toBe(false);
        });

        it('reflects hysteresis state in currentVerdict', async () => {
            mockCdnProbe(200);

            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);
            await isTurnstileDegraded();

            expect(getSiteverifyMetricsSnapshot().currentVerdict).toBe(true);
        });

        it('resetHealthCache zeroes all values', () => {
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(false, 100);
            expect(getSiteverifyMetricsSnapshot().sampleCount).toBe(2);

            resetHealthCache();

            expect(getSiteverifyMetricsSnapshot()).toEqual({
                sampleCount: 0,
                failureCount: 0,
                failureRate: 0,
                p95LatencyMs: 0,
                currentVerdict: false,
            });
        });
    });

    describe('siteverify state machine - exhaustive transitions', () => {
        // The state machine has only two states (healthy, degraded). These tests exercise
        // every documented transition path between them, including combined-signal
        // entries and exits, repeated cycles, and the boundary conditions.

        it('transition: healthy → degraded via rate-only', async () => {
            mockCdnProbe(200);
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);

            expect(await isTurnstileDegraded()).toBe(true);
            expect(getSiteverifyMetricsSnapshot().currentVerdict).toBe(true);
        });

        it('transition: healthy → degraded via latency-only (all successes)', async () => {
            mockCdnProbe(200);
            for (let i = 0; i < 9; i++) recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 5000); // p95 = 5000ms

            expect(await isTurnstileDegraded()).toBe(true);
            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.failureCount).toBe(0);
            expect(snap.p95LatencyMs).toBe(5000);
        });

        it('transition: healthy → degraded via both rate AND latency together', async () => {
            mockCdnProbe(200);
            for (let i = 0; i < 5; i++) recordSiteverifyOutcome(true, 4000); // failures + slow
            for (let i = 0; i < 5; i++) recordSiteverifyOutcome(false, 4000);

            expect(await isTurnstileDegraded()).toBe(true);
            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.failureRate).toBe(0.5);
            expect(snap.p95LatencyMs).toBe(4000);
        });

        it('no transition: rate breaches but min-failure-count not met → stays healthy', async () => {
            mockCdnProbe(200);
            // 2 failures of 4 = 50%, but only 4 samples (below MIN_SAMPLES=5) → tier 1 returns null
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 100);

            expect(await isTurnstileDegraded()).toBe(false);
            expect(getSiteverifyMetricsSnapshot().currentVerdict).toBe(false);
        });

        it('no transition: just below both thresholds → stays healthy', async () => {
            mockCdnProbe(200);
            // 49% rate (below ENTER 50%), p95 = 2999ms (below threshold 3000ms)
            for (let i = 0; i < 49; i++) recordSiteverifyOutcome(true, 2999);
            for (let i = 0; i < 51; i++) recordSiteverifyOutcome(false, 2999);

            expect(await isTurnstileDegraded()).toBe(false);
        });

        it('transition: degraded → healthy via rate AND latency BOTH recovering', async () => {
            mockCdnProbe(200);
            // Enter degraded
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(true);

            // Recover both dimensions: low failure rate AND low latency
            for (let i = 0; i < 50; i++) recordSiteverifyOutcome(false, 100);

            expect(await isTurnstileDegraded()).toBe(false);
            expect(getSiteverifyMetricsSnapshot().currentVerdict).toBe(false);
        });

        it('no exit: rate recovered but latency still high → stays degraded', async () => {
            mockCdnProbe(200);
            // Enter via rate
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(true);

            // Now record many successes BUT with high latency
            for (let i = 0; i < 50; i++) recordSiteverifyOutcome(false, 4000);

            // Rate is now low (6/60 = 10%, below EXIT 30%) but p95 is 4000ms
            expect(await isTurnstileDegraded()).toBe(true);
            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.failureRate).toBeLessThan(0.3);
            expect(snap.p95LatencyMs).toBeGreaterThanOrEqual(3000);
        });

        it('no exit: latency recovered but rate still high → stays degraded', async () => {
            mockCdnProbe(200);
            // Enter via latency-only
            for (let i = 0; i < 9; i++) recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 5000);
            expect(await isTurnstileDegraded()).toBe(true);

            // Drive rate UP while latency stays low. After enough records, rate is high
            // and p95 is low - should still be degraded because rate didn't drop below EXIT.
            for (let i = 0; i < 50; i++) recordSiteverifyOutcome(true, 100);

            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.p95LatencyMs).toBeLessThan(3000);
            expect(snap.failureRate).toBeGreaterThanOrEqual(0.3); // above EXIT
            expect(await isTurnstileDegraded()).toBe(true);
        });

        it('full cycle: healthy → degraded → healthy → degraded → healthy', async () => {
            mockCdnProbe(200);

            // 1. Healthy initially
            expect(await isTurnstileDegraded()).toBe(false);

            // 2. Enter degraded
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(true);

            // 3. Recover
            for (let i = 0; i < 50; i++) recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(false);

            // 4. Re-enter via fresh wave of failures
            // Window now has 6 failures + 54 successes.
            // To re-enter: need >= 50% rate and >= 3 failures over >= 5 samples.
            // Current rate is 10%; need to swing it. Easiest: pump enough failures to
            // dominate the window even at capacity (200).
            for (let i = 0; i < 200; i++) recordSiteverifyOutcome(true, 100);
            // Ring is now 200 failures. Rate = 100%.
            expect(await isTurnstileDegraded()).toBe(true);

            // 5. Recover again
            for (let i = 0; i < 200; i++) recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(false);
        });

        it('verdict is sticky across many calls without state changes', async () => {
            mockCdnProbe(200);
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);
            await isTurnstileDegraded();

            // 100 consecutive reads with no new samples should all return the same verdict
            for (let i = 0; i < 100; i++) {
                expect(await isTurnstileDegraded()).toBe(true);
            }
        });

        it('survives many ring wraps without state corruption', async () => {
            mockCdnProbe(200);

            // Wrap the ring 5 times with all-success at low latency
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 200; j++) recordSiteverifyOutcome(false, 100);
            }

            // Verdict should be healthy
            expect(await isTurnstileDegraded()).toBe(false);
            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.sampleCount).toBe(200);
            expect(snap.failureCount).toBe(0);
            expect(snap.failureRate).toBe(0);

            // Now flip to all-failure and wrap again
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 200; j++) recordSiteverifyOutcome(true, 100);
            }

            expect(await isTurnstileDegraded()).toBe(true);
            const snap2 = getSiteverifyMetricsSnapshot();
            expect(snap2.sampleCount).toBe(200);
            expect(snap2.failureCount).toBe(200);
            expect(snap2.failureRate).toBe(1);
        });

        it('p95 nearest-rank with 1 sample equals that sample', () => {
            recordSiteverifyOutcome(false, 7777);
            expect(getSiteverifyMetricsSnapshot().p95LatencyMs).toBe(7777);
        });

        it('p95 nearest-rank with 2 samples equals the larger', () => {
            recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 200);
            expect(getSiteverifyMetricsSnapshot().p95LatencyMs).toBe(200);
        });

        it('p95 nearest-rank with 20 samples picks index 18 (ceil(0.95*20)-1)', () => {
            // Sorted ascending: 100..1900 step 100
            for (let i = 1; i <= 20; i++) recordSiteverifyOutcome(false, i * 100);
            // ceil(0.95 * 20) - 1 = 19 - 1 = 18 → 1900
            expect(getSiteverifyMetricsSnapshot().p95LatencyMs).toBe(1900);
        });

        it('failureRate is exactly 0 when sampleCount is 0', () => {
            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.sampleCount).toBe(0);
            expect(snap.failureRate).toBe(0);
            expect(snap.p95LatencyMs).toBe(0);
        });

        it('records and prunes correctly across exactly the window boundary', () => {
            vi.useFakeTimers({ now: 1_000_000 });

            // Sample at t=1_000_000
            recordSiteverifyOutcome(true, 100);

            // At t=1_059_999 (59.999s later), sample is fresh
            vi.advanceTimersByTime(59_999);
            expect(getSiteverifyMetricsSnapshot().sampleCount).toBe(1);

            // At t=1_060_000 (exactly 60s), still fresh (cutoff is `<`, not `<=`)
            vi.advanceTimersByTime(1);
            expect(getSiteverifyMetricsSnapshot().sampleCount).toBe(1);

            // At t=1_060_001 (60.001s), pruned
            vi.advanceTimersByTime(1);
            expect(getSiteverifyMetricsSnapshot().sampleCount).toBe(0);

            vi.useRealTimers();
        });

        it('handles a mix of failures and latencies that produces complex p95', () => {
            // 10 samples: 5 failures with low latency, 5 successes with high latency.
            // Sorted by latency: 5 × 50ms, then 5 × 4000ms.
            // p95 nearest-rank: ceil(0.95 * 10) - 1 = 9 → 4000ms (degraded by latency)
            for (let i = 0; i < 5; i++) recordSiteverifyOutcome(true, 50);
            for (let i = 0; i < 5; i++) recordSiteverifyOutcome(false, 4000);

            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.failureRate).toBe(0.5);
            expect(snap.p95LatencyMs).toBe(4000);
        });
    });

    describe('boundary thresholds (exact-equality cases)', () => {
        // The thresholds use `>=` to enter and `<` to exit. These tests pin the comparison
        // operators by exercising each boundary value.

        it('latency at exactly 3000ms (>= ENTER) flips to degraded', async () => {
            mockCdnProbe(200);
            for (let i = 0; i < 10; i++) recordSiteverifyOutcome(false, 3000);

            expect(await isTurnstileDegraded()).toBe(true);
        });

        it('latency at 2999ms (just under ENTER) stays healthy', async () => {
            mockCdnProbe(200);
            for (let i = 0; i < 10; i++) recordSiteverifyOutcome(false, 2999);

            expect(await isTurnstileDegraded()).toBe(false);
        });

        it('rate at exactly 30% (= EXIT) keeps the verdict degraded', async () => {
            mockCdnProbe(200);
            // Enter degraded
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(true);

            // Drift to 6 failures / 20 samples = 30% (rate at EXIT, exit is `<` 0.3)
            for (let i = 0; i < 10; i++) recordSiteverifyOutcome(false, 100);
            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.failureRate).toBe(0.3);

            expect(await isTurnstileDegraded()).toBe(true);
        });

        it('rate just below 30% (e.g., 6/21) exits degraded', async () => {
            mockCdnProbe(200);
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(true);

            // 6 / 21 ≈ 28.6% (below EXIT threshold)
            for (let i = 0; i < 11; i++) recordSiteverifyOutcome(false, 100);

            expect(await isTurnstileDegraded()).toBe(false);
        });

        it('latency at exactly 3000ms while degraded keeps the verdict degraded (exit = <)', async () => {
            mockCdnProbe(200);
            // Enter via latency
            for (let i = 0; i < 9; i++) recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 5000);
            expect(await isTurnstileDegraded()).toBe(true);

            // Driving p95 down to exactly 3000ms via overwhelmingly more 3000ms samples.
            // 200 samples at 3000ms (replacing the 10 originals); p95 nearest-rank → 3000ms.
            for (let i = 0; i < 200; i++) recordSiteverifyOutcome(false, 3000);
            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.p95LatencyMs).toBe(3000);

            // p95 == threshold should not exit (exit requires p95 < threshold)
            expect(await isTurnstileDegraded()).toBe(true);
        });

        it('min-failure guard: latency-only entry does NOT require min failures', async () => {
            // The min-failure guard ONLY applies to the rate-driven entry path. Latency
            // can independently trigger entry with zero failures - this test pins that.
            mockCdnProbe(200);
            for (let i = 0; i < 9; i++) recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 5000);

            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.failureCount).toBe(0); // zero failures
            expect(snap.failureRate).toBe(0);
            expect(snap.p95LatencyMs).toBe(5000);

            expect(await isTurnstileDegraded()).toBe(true);
        });

        it('min-failure guard exact boundary: 2 failures / 4 samples (50% but failures < 3)', async () => {
            mockCdnProbe(200);
            // 4 samples is also below MIN_SAMPLES=5, so this returns null
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 100);

            // Falls through to CDN tier (healthy)
            expect(await isTurnstileDegraded()).toBe(false);
        });

        it('min-failure guard exact boundary: 2 failures / 5 samples (40% AND failures < 3)', async () => {
            mockCdnProbe(200);
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 100);
            recordSiteverifyOutcome(false, 100);

            // 5 samples meets min, but rate is 40% (below ENTER) and failures < 3
            expect(await isTurnstileDegraded()).toBe(false);
        });
    });

    describe('CDN tier semantics under unusual sequences', () => {
        it('isTurnstileDegraded short-circuits to true without consulting CDN when tier 1 already degraded', async () => {
            mockCdnProbe(200);
            // Push tier 1 into degraded state
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);
            expect(await isTurnstileDegraded()).toBe(true);

            const cdnCallsBefore = vi
                .mocked(fetch)
                .mock.calls.filter((c) => String(c[0]).includes('challenges.cloudflare.com')).length;

            // Many more reads while tier 1 stays degraded
            for (let i = 0; i < 5; i++) await isTurnstileDegraded();

            const cdnCallsAfter = vi
                .mocked(fetch)
                .mock.calls.filter((c) => String(c[0]).includes('challenges.cloudflare.com')).length;
            // CDN was not consulted again (tier 1 short-circuited)
            expect(cdnCallsAfter).toBe(cdnCallsBefore);
        });

        it('isTurnstileDegraded short-circuits to false when tier 1 says healthy', async () => {
            // Probe is degraded, but tier 1 is authoritative when there are enough samples.
            mockCdnProbe(500);
            for (let i = 0; i < 10; i++) recordSiteverifyOutcome(false, 100);

            expect(await isTurnstileDegraded()).toBe(false);

            const cdnCalls = vi
                .mocked(fetch)
                .mock.calls.filter((c) => String(c[0]).includes('challenges.cloudflare.com'));
            expect(cdnCalls).toHaveLength(0); // CDN never consulted
        });

        it('CDN cache returns stale-degraded value while triggering background refresh', async () => {
            // Prime cache with a degraded value
            mockCdnProbe(500);
            expect(await isTurnstileDegraded()).toBe(true);

            // Advance past TTL; CDN now reports healthy
            vi.useFakeTimers();
            vi.advanceTimersByTime(61_000);
            mockCdnProbe(200);

            // The first call after TTL returns the STALE value (still true) and
            // triggers a background refresh.
            const stale = await isTurnstileDegraded();
            expect(stale).toBe(true);

            // After the background refresh completes, the cache is updated.
            await vi.advanceTimersByTimeAsync(50);
            const fresh = await isTurnstileDegraded();
            expect(fresh).toBe(false);

            vi.useRealTimers();
        });

        it('CDN cache initial population (cold-start path) writes the cache', async () => {
            mockCdnProbe(500);

            const r1 = await isTurnstileDegraded();
            expect(r1).toBe(true);

            // Subsequent call within TTL hits the cache, no new fetch
            const cdnCallsAfterFirst = vi.mocked(fetch).mock.calls.length;
            const r2 = await isTurnstileDegraded();
            expect(r2).toBe(true);
            expect(vi.mocked(fetch).mock.calls.length).toBe(cdnCallsAfterFirst);
        });

        it('dedupes concurrent cold-start probes onto a single HEAD request', async () => {
            // First-call dedup: with no cache populated, three concurrent calls must NOT
            // each fire a HEAD probe (thundering herd at instance boot). The first call
            // initiates the probe; the others await the same in-flight promise.
            let probeCount = 0;
            let resolveProbe: ((res: Response) => void) | null = null;
            vi.mocked(fetch).mockImplementation(() => {
                probeCount++;
                return new Promise<Response>((resolve) => {
                    resolveProbe = resolve;
                });
            });

            const all = Promise.all([isTurnstileDegraded(), isTurnstileDegraded(), isTurnstileDegraded()]);

            // Wait a microtask so all three calls reach the await point
            await Promise.resolve();
            expect(probeCount).toBe(1);

            (resolveProbe as unknown as (r: Response) => void)(new Response('', { status: 200 }));

            const [r1, r2, r3] = await all;
            expect(r1).toBe(false);
            expect(r2).toBe(false);
            expect(r3).toBe(false);
            // Only one HEAD was fired across all three concurrent callers
            expect(probeCount).toBe(1);
        });
    });

    describe('temporal edge cases', () => {
        // Time can do unusual things in production: NTP adjustments, clock skew between
        // hosts (less relevant per-instance), and sub-millisecond same-tick events.

        it('multiple records at the same timestamp all land in the window', () => {
            vi.useFakeTimers({ now: 1_000_000 });
            for (let i = 0; i < 7; i++) recordSiteverifyOutcome(true, 100);

            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.sampleCount).toBe(7);
            expect(snap.failureCount).toBe(7);

            vi.useRealTimers();
        });

        it('records spanning two ticks both prune correctly when the older tick expires', () => {
            vi.useFakeTimers({ now: 1_000_000 });
            // Two batches at different timestamps
            for (let i = 0; i < 3; i++) recordSiteverifyOutcome(true, 100);
            vi.advanceTimersByTime(40_000);
            for (let i = 0; i < 3; i++) recordSiteverifyOutcome(false, 100);

            // Now t = 1_040_000. Advance another 25s → t = 1_065_000.
            // First batch (t=1_000_000) is 65s old → pruned.
            // Second batch (t=1_040_000) is 25s old → kept.
            vi.advanceTimersByTime(25_000);
            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.sampleCount).toBe(3);
            expect(snap.failureCount).toBe(0);

            vi.useRealTimers();
        });

        it('records are pruned even when no new sample arrives between calls', () => {
            vi.useFakeTimers({ now: 1_000_000 });
            for (let i = 0; i < 5; i++) recordSiteverifyOutcome(true, 100);
            expect(getSiteverifyMetricsSnapshot().sampleCount).toBe(5);

            // Many seconds pass with no new records
            vi.advanceTimersByTime(70_000);

            // Snapshot read alone should evict expired samples
            expect(getSiteverifyMetricsSnapshot().sampleCount).toBe(0);

            vi.useRealTimers();
        });
    });

    describe('ring buffer integrity invariants', () => {
        it('ring buffer never reports more than capacity samples even after sustained high-rate inserts', () => {
            // Pump 5,000 samples - far above capacity of 200
            for (let i = 0; i < 5_000; i++) recordSiteverifyOutcome(i % 2 === 0, 100);

            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.sampleCount).toBeLessThanOrEqual(200);
            expect(snap.sampleCount).toBe(200);
        });

        it('ring buffer head wraps cleanly under exact-capacity-multiple inserts', () => {
            // Exactly 4 full passes of the ring (800 inserts at capacity 200)
            for (let i = 0; i < 800; i++) recordSiteverifyOutcome(false, 100);
            expect(getSiteverifyMetricsSnapshot().sampleCount).toBe(200);

            // One more insert: head should advance
            recordSiteverifyOutcome(true, 100);
            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.sampleCount).toBe(200);
            expect(snap.failureCount).toBe(1); // exactly one failure now in the window
        });

        it('age-pruning empties the ring without leaking stale samples', () => {
            vi.useFakeTimers({ now: 1_000_000 });

            // Fill the ring at the same timestamp
            for (let i = 0; i < 200; i++) recordSiteverifyOutcome(true, 100);
            expect(getSiteverifyMetricsSnapshot().sampleCount).toBe(200);

            // All samples expire at once
            vi.advanceTimersByTime(61_000);
            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.sampleCount).toBe(0);
            expect(snap.failureCount).toBe(0);

            // After full eviction, fresh inserts work normally
            recordSiteverifyOutcome(false, 100);
            expect(getSiteverifyMetricsSnapshot().sampleCount).toBe(1);

            vi.useRealTimers();
        });
    });

    describe('verdict transitions across recordSiteverifyOutcome calls', () => {
        // Hysteresis state lives in module scope. These tests verify that any read path
        // (snapshot getter or isTurnstileDegraded) drives the verdict bit, and that the
        // bit transitions in the expected direction as samples accumulate.

        it('snapshot getter computes the verdict as a side effect', () => {
            // Record enough samples to trigger degraded - but don't call isTurnstileDegraded
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);

            // Snapshot path alone runs getSiteverifyHealth and updates currentVerdict.
            const snap = getSiteverifyMetricsSnapshot();
            expect(snap.currentVerdict).toBe(true);
        });

        it('isTurnstileDegraded computes the verdict identically to the snapshot path', async () => {
            for (let i = 0; i < 6; i++) recordSiteverifyOutcome(true, 100);
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);

            const verdict = await isTurnstileDegraded();
            expect(verdict).toBe(true);
            expect(getSiteverifyMetricsSnapshot().currentVerdict).toBe(true);
        });

        it('verdict reflects accumulated state regardless of which read path drove it', () => {
            // Below thresholds → verdict stays false even after many reads
            for (let i = 0; i < 4; i++) recordSiteverifyOutcome(false, 100);
            const before = getSiteverifyMetricsSnapshot();
            expect(before.currentVerdict).toBe(false);
            expect(before.sampleCount).toBe(4);

            // Add the breaking sample
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(true, 100);
            recordSiteverifyOutcome(true, 100);
            const after = getSiteverifyMetricsSnapshot();
            // 3 failures of 7 samples = 42% (below ENTER 50%); failure count >= 3 but rate < 0.5
            // So verdict stays false. This pins the behavior.
            expect(after.currentVerdict).toBe(false);
        });
    });
});
