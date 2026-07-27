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
import { buildSitePath } from '../utils/url-utils';

class SecurityHeadersPage {
    /**
     * Navigate to the homepage and capture the response headers.
     *
     * `page.goto` requires an absolute URL (CodeceptJS's `I.amOnPage` resolves
     * a relative path against the configured `BASE_URL`, but we don't go
     * through `amOnPage` here because we need the Response object to read
     * headers off it). Match the canonical resolution pattern from
     * `storefront.page.ts`: `new URL(buildSitePath('/'), BASE_URL).toString()`.
     *
     * `I.usePlaywrightTo` does not propagate return values; the headers are
     * captured via a closed-over variable.
     */
    async grabHomepageHeaders(): Promise<Record<string, string>> {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
        const url = new URL(buildSitePath('/'), baseUrl).toString();
        let headers: Record<string, string> = {};
        await I.usePlaywrightTo('grab homepage response headers', async ({ page }) => {
            const response = await page.goto(url);
            headers = response?.headers() ?? {};
        });
        return headers;
    }
}

export = new SecurityHeadersPage();
