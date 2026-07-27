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

const { I } = inject();

interface BeaconPayload {
    checkoutType?: string;
    [key: string]: unknown;
}

interface CapturedBeacon {
    url: string;
    payload: BeaconPayload;
}

interface BeaconWindow extends Window {
    __beaconPromises: Promise<void>[];
    __capturedBeacons: CapturedBeacon[];
    __allBeaconUrls: string[];
}

/**
 * Beacon Capture Flow
 *
 * Intercepts navigator.sendBeacon calls in the browser to capture Einstein analytics
 * payloads for assertion in E2E tests. Must be set up before navigating to the page
 * that fires the beacons.
 */
class BeaconCaptureFlow {
    /**
     * Install beacon interception script via Playwright addInitScript.
     * Must be called before any navigation that triggers the beacons.
     *
     * @param urlFilter - Substring to match in beacon URLs (e.g. 'beginCheckout', 'checkoutStep')
     */
    async setupInterception(urlFilter: string): Promise<void> {
        await (I.usePlaywrightTo('Setup route interception for Einstein beacons', async ({ page }) => {
            await page.addInitScript((filter: string) => {
                const w = window as unknown as {
                    __beaconPromises: Promise<void>[];
                    __capturedBeacons: { url: string; payload: Record<string, unknown> }[];
                    __allBeaconUrls: string[];
                };
                const originalSendBeacon = navigator.sendBeacon.bind(navigator);
                w.__beaconPromises = [];
                w.__capturedBeacons = [];
                w.__allBeaconUrls = [];

                navigator.sendBeacon = (url: string | URL, data?: BodyInit | null): boolean => {
                    const urlString = typeof url === 'string' ? url : url.toString();
                    w.__allBeaconUrls.push(urlString);

                    if (urlString.includes('activities') && urlString.includes(filter)) {
                        if (data instanceof Blob) {
                            const beaconPromise = new Promise<void>((resolve) => {
                                const reader = new FileReader();
                                reader.addEventListener('loadend', () => {
                                    try {
                                        const payload = JSON.parse(reader.result as string);
                                        w.__capturedBeacons.push({ url: urlString, payload });
                                    } catch {
                                        // ignore malformed beacon payload
                                    } finally {
                                        resolve();
                                    }
                                });
                                reader.readAsText(data);
                            });
                            w.__beaconPromises.push(beaconPromise);
                        }
                    }

                    return originalSendBeacon(url, data);
                };
            }, urlFilter);
        }) as unknown as Promise<void>);
    }

    /**
     * Wait for captured beacons and retrieve them.
     * Call after the page actions that trigger beacons.
     *
     * @param timeoutMs - Max time to wait for at least one beacon promise
     * @returns Array of captured beacons matching the filter
     */
    async retrieveBeacons(timeoutMs: number = 30000): Promise<CapturedBeacon[]> {
        const capturedBeacons: CapturedBeacon[] = [];

        await (I.usePlaywrightTo('Wait for and retrieve captured beacons', async ({ page }) => {
            type BW = BeaconWindow;
            try {
                await page.waitForFunction(
                    () => {
                        const w = window as unknown as BW;
                        return (w.__beaconPromises || []).length > 0;
                    },
                    undefined,
                    { timeout: timeoutMs }
                );

                await page.evaluate(async () => {
                    const w = window as unknown as BW;
                    await Promise.all(w.__beaconPromises || []);
                });
            } catch (error) {
                const debugInfo = await page.evaluate(() => {
                    const w = window as unknown as BW;
                    return {
                        beaconPromises: w.__beaconPromises?.length || 0,
                        capturedBeacons: w.__capturedBeacons?.length || 0,
                        allBeaconUrls: w.__allBeaconUrls || [],
                    };
                });
                throw new Error(
                    `Beacon capture timeout. Debug: ${JSON.stringify(debugInfo)}`,
                    error instanceof Error ? { cause: error } : undefined
                );
            }

            const beacons = await page.evaluate(() => {
                const w = window as unknown as BW;
                return w.__capturedBeacons || [];
            });
            capturedBeacons.push(...beacons);
        }) as unknown as Promise<void>);

        return capturedBeacons;
    }
}

export = new BeaconCaptureFlow();
