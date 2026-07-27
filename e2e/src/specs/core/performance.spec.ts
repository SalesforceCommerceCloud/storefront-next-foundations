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

Feature('Checkout Performance Tests').tag('@core').tag('@performance').tag('@checkout');

import { expect } from 'chai';
import { capturePerformanceMetrics, assertWebVitals, waitForPageStable } from '../../utils/performance-utils';
import { buildSitePath } from '../../utils/url-utils';

/**
 * Performance thresholds for checkout page
 * These match the Lighthouse CI thresholds for consistency.
 * TTFB is relaxed for local dev (localhost) where cold start is slower.
 */
const isLocalRun =
    typeof process !== 'undefined' && (!process.env.BASE_URL || process.env.BASE_URL.includes('localhost'));

const CHECKOUT_PERFORMANCE_BUDGET = {
    lcp: 3000, // ms - Largest Contentful Paint
    fcp: 2000, // ms - First Contentful Paint
    cls: 0.1, // score - Cumulative Layout Shift
    ttfb: isLocalRun ? 1500 : 600, // ms - Time to First Byte (relaxed for local)
};

Scenario('Checkout page meets Web Vitals performance budgets', async ({ I }) => {
    I.amOnPage(buildSitePath('/checkout'));

    await I.usePlaywrightTo('capture performance metrics', async ({ page }) => {
        await waitForPageStable(page);
        const metrics = await capturePerformanceMetrics(page);

        // Log metrics for debugging
        console.log(
            'Checkout Performance Metrics:',
            JSON.stringify({
                LCP: `${metrics.vitals.lcp.toFixed(0)}ms`,
                FCP: `${metrics.vitals.fcp.toFixed(0)}ms`,
                CLS: metrics.vitals.cls.toFixed(3),
                TTFB: `${metrics.vitals.ttfb.toFixed(0)}ms`,
                ScriptSize: `${(metrics.scriptSize / 1024).toFixed(0)}KB`,
                LongTasks: metrics.longTasks.length,
            })
        );

        // Assert against budgets
        assertWebVitals(metrics.vitals, CHECKOUT_PERFORMANCE_BUDGET);

        // Checkout lazy-loads components, so initial script size should be reasonable
        // Current baseline: ~537KB (measured from build/client-bundlemeta.json)
        expect(metrics.scriptSize, 'Script size should be within budget').to.be.lessThan(550 * 1024); // 550KB

        // Assert TBT is reasonable (sum of long task durations)
        const tbt = metrics.longTasks.reduce((acc, task) => acc + Math.max(0, task.duration - 50), 0);
        expect(tbt, 'Total Blocking Time should be under 450ms').to.be.lessThan(450);
    });
}).tag('@web-vitals');

Scenario('Checkout code splitting loads correctly without blocking', async ({ I }) => {
    I.amOnPage(buildSitePath('/checkout'));

    await I.usePlaywrightTo('check code splitting', async ({ page }) => {
        await waitForPageStable(page);
        const metrics = await capturePerformanceMetrics(page);

        // Verify checkout chunk lazy loaded correctly (not blocking initial load)
        const blockingTasks = metrics.longTasks.filter((task) => task.duration > 200);
        expect(blockingTasks.length, 'Should have minimal long tasks blocking main thread (>200ms)').to.be.lessThan(2);

        // Log any blocking tasks for debugging
        if (blockingTasks.length > 0) {
            console.log('Blocking tasks detected:', JSON.stringify(blockingTasks));
        }
    });
}).tag('@code-splitting');

Scenario('Checkout page has minimal layout shifts', async ({ I }) => {
    I.amOnPage(buildSitePath('/checkout'));

    await I.usePlaywrightTo('check layout stability', async ({ page }) => {
        await waitForPageStable(page);
        const metrics = await capturePerformanceMetrics(page);

        // CLS should be very low (good user experience)
        expect(metrics.vitals.cls, 'Cumulative Layout Shift should be minimal').to.be.lessThan(0.1);

        console.log(`Checkout CLS: ${metrics.vitals.cls.toFixed(3)} (Good: <0.1)`);
    });
}).tag('@layout-stability');
