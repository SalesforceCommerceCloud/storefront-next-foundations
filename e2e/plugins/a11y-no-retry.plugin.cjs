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

const event = require('codeceptjs/lib/event');

/**
 * CodeceptJS plugin that suppresses scenario retries for A11yBaselineError.
 *
 * Axe scans are deterministic — retrying a real a11y violation always reproduces it.
 * Infrastructure failures (timeouts, navigation errors) should still be retried.
 * This plugin cancels the retry when the failure is a confirmed baseline regression.
 */
module.exports = function () {
    // currentRetry() always returns 0 when event.test.failed fires — CodeceptJS
    // resets it before each retry. Track attempt counts per test title manually.
    const attemptCounts = new Map();

    event.dispatcher.on(event.test.failed, (test, err) => {
        if (!test.fullTitle().includes('@a11y')) return;

        if (err && err.name === 'A11yBaselineError') {
            test.retries(test.currentRetry());
            return;
        }

        const attempt = (attemptCounts.get(test.title) || 0) + 1;
        attemptCounts.set(test.title, attempt);
        const total = test._retries + 1;
        const reason = err && err.message ? err.message.split('\n')[0] : 'unknown error';
        console.log(`[A11Y] Attempt ${attempt}/${total} failed for "${test.title}" — ${reason}`);
    });
};
