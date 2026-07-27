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

// Controllable fake for the http(s) `get` used by checkUrl. Each entry in
// `outcomes` is the per-attempt result: `true` = a response arrives, `false` =
// the request errors immediately (connection refused), `'stall'` = the request
// hangs and only resolves via checkUrl's own setTimeout (models a slow/hung
// edge that holds the connection open). `default` applies once the queue
// drains. `calls` counts probes. `probeTimeouts` records the timeout checkUrl
// passed each attempt, so tests can assert the per-probe budget cap. Mocking at
// the network layer exercises the real checkUrl + waitUntilReachable paths
// rather than a stubbed probe.
type Outcome = boolean | 'stall';
const probe = vi.hoisted(() => ({
    outcomes: [] as Outcome[],
    default: false as Outcome,
    calls: 0,
    probeTimeouts: [] as number[],
}));

function fakeGet(_url: string, cb: (res: { resume: () => void }) => void) {
    const next = probe.outcomes.shift();
    const result: Outcome = next === undefined ? probe.default : next;
    probe.calls++;
    const request = {
        on(event: string, handler: (err?: Error) => void) {
            if (event === 'error' && result === false) queueMicrotask(() => handler(new Error('ECONNREFUSED')));
            return request;
        },
        setTimeout(ms: number, handler: () => void) {
            probe.probeTimeouts.push(ms);
            // A stalled request never gets a response or error; checkUrl's own
            // timeout fires, destroys the socket, and resolves false.
            if (result === 'stall') setTimeout(handler, ms);
            return request;
        },
        destroy() {},
    };
    if (result === true) queueMicrotask(() => cb({ resume() {} }));
    return request;
}

vi.mock('http', () => ({ get: fakeGet }));
vi.mock('https', () => ({ get: fakeGet }));

// The logger writes to stdout with colors; silence it for clean test output.
vi.mock('../../../../utils/logger', () => ({
    log: {
        info: vi.fn(),
        step: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        hint: vi.fn(),
        raw: vi.fn(),
    },
}));

import { waitUntilReachable } from './url-reachability';

describe('waitUntilReachable', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        probe.outcomes = [];
        probe.default = false;
        probe.calls = 0;
        probe.probeTimeouts = [];
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('returns true on the first successful probe without waiting', async () => {
        probe.outcomes = [true];

        const result = await waitUntilReachable('https://x.test', 90_000, 1_000);

        expect(result).toBe(true);
        expect(probe.calls).toBe(1);
    });

    it('retries while the edge is not yet serving, then succeeds (deploy propagation lag)', async () => {
        probe.outcomes = [false, false, true];

        const promise = waitUntilReachable('https://x.test', 90_000, 1_000);
        // Drain the inter-attempt delays.
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe(true);
        expect(probe.calls).toBe(3);
    });

    it('returns false when the server never becomes reachable within the budget', async () => {
        probe.default = false;

        const promise = waitUntilReachable('https://x.test', 3_000, 1_000);
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe(false);
        // 3s budget / 1s interval ⇒ probes at ~0s, 1s, 2s before the next delay
        // would exceed the deadline.
        expect(probe.calls).toBe(3);
    });

    it('probes at least once even with a zero budget', async () => {
        probe.default = false;

        const result = await waitUntilReachable('https://x.test', 0, 1_000);

        expect(result).toBe(false);
        expect(probe.calls).toBe(1);
    });

    it('caps a slow/hung probe to the remaining budget so it never overshoots', async () => {
        // Every probe stalls and only resolves via checkUrl's own timeout.
        // Budget 7s, interval 1s, probe timeout 5s:
        //   attempt 1 @t=0  → full 5s probe (stalls to t=5s), 1s sleep → t=6s
        //   attempt 2 @t=6s → only 1s remains, so the probe is CAPPED to 1s
        //                     (not 5s), and the loop ends at the 7s deadline.
        // Without the cap, attempt 2 would block 5s and overshoot to ~11s.
        probe.default = 'stall';

        const promise = waitUntilReachable('https://x.test', 7_000, 1_000, 5_000);
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe(false);
        expect(probe.calls).toBe(2);
        // No probe ever exceeds the configured per-probe timeout...
        for (const t of probe.probeTimeouts) expect(t).toBeLessThanOrEqual(5_000);
        // ...and the final probe is capped to the ~1s of budget that remained,
        // proving probe duration counts against the deadline.
        expect(probe.probeTimeouts[probe.probeTimeouts.length - 1]).toBeLessThanOrEqual(1_000);
    });
});
