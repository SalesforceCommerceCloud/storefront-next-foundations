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
 * Stateless URL reachability probes.
 *
 * These are pure utilities — they take a URL and return whether something is
 * listening — so they live here rather than on the stateful ServerManager
 * service (which owns dev-server process lifecycle). Both the local server
 * health check and the remote pre-flight readiness check build on them.
 */
import { get as httpGet } from 'http';
import { get as httpsGet } from 'https';
import { log } from '../../../../utils/logger';

/** Milliseconds between each reachability attempt. */
export const POLL_INTERVAL_MS = 1000;

/**
 * Total time budget for the remote pre-flight readiness probe. A freshly
 * deployed MRT bundle can report ACTIVE before its edge serves traffic; this
 * window covers that propagation lag so tests don't start against a 5xx/closed
 * edge and fail as if the deployment itself were broken.
 */
export const REMOTE_READINESS_TIMEOUT_MS = 90_000; // 90 seconds

/** Per-attempt request timeout for the remote readiness probe. */
export const REMOTE_PROBE_TIMEOUT_MS = 5_000;

/**
 * Check whether a URL is reachable.
 * Any HTTP response (including redirects and error codes) means a server is
 * listening — only a connection error or timeout means it is not running.
 *
 * @param url - URL to probe.
 * @param timeoutMs - How long to wait for a response. Defaults to POLL_INTERVAL_MS.
 */
export function checkUrl(url: string, timeoutMs = POLL_INTERVAL_MS): Promise<boolean> {
    return new Promise((resolve) => {
        const get = url.startsWith('https:') ? httpsGet : httpGet;
        const request = get(url, (res) => {
            res.resume(); // drain body so the socket is released
            resolve(true);
        });

        request.on('error', () => resolve(false));
        request.setTimeout(timeoutMs, () => {
            request.destroy();
            resolve(false);
        });
    });
}

/**
 * Poll a URL until it is reachable or the overall budget is exhausted.
 *
 * Unlike {@link checkUrl} (a single probe), this retries on a fixed interval.
 * It exists for the remote pre-flight check: a freshly deployed MRT bundle can
 * report ACTIVE via the Admin API before its external edge actually starts
 * serving, so a single probe races the deployment and fails spuriously.
 * Polling absorbs that propagation lag.
 *
 * @param url - URL to probe.
 * @param timeoutMs - Total time budget across all attempts.
 * @param intervalMs - Delay between attempts.
 * @param probeTimeoutMs - Per-attempt request timeout.
 * @returns true as soon as a probe succeeds, false if the budget runs out.
 */
export async function waitUntilReachable(
    url: string,
    timeoutMs = REMOTE_READINESS_TIMEOUT_MS,
    intervalMs = POLL_INTERVAL_MS,
    probeTimeoutMs = REMOTE_PROBE_TIMEOUT_MS
): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;

    // Loop exits via the in-body checks: success returns true, and the deadline
    // guard below returns false once another full interval would overshoot the
    // budget. This guarantees at least one probe even when timeoutMs is 0.
    for (;;) {
        attempt++;
        // Cap each probe to whatever budget remains so a slow/hung edge (which
        // accepts the connection but stalls for the full probeTimeoutMs) cannot
        // run past the deadline. The first attempt always gets the full probe
        // timeout so a zero/expired budget still yields one real probe.
        const remaining = deadline - Date.now();
        const probeBudget = attempt === 1 ? probeTimeoutMs : Math.min(probeTimeoutMs, Math.max(0, remaining));
        if (await checkUrl(url, probeBudget)) {
            if (attempt > 1) {
                log.success(`Server at ${url} became reachable after ${attempt} attempts`);
            }
            return true;
        }

        // Re-read the clock AFTER the probe so its blocking time counts against
        // the budget; stop once there's no room for another interval + probe.
        if (Date.now() + intervalMs >= deadline) return false;
        log.info(`Server at ${url} not reachable yet (attempt ${attempt}); retrying in ${intervalMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
}
