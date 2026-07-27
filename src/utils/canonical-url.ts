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
 * Query parameters that affect page content and should be preserved in canonical URLs.
 * Any parameter NOT in this set is stripped. This allowlist approach is safer than a
 * denylist because unknown/new tracking params are excluded by default.
 */
const CONTENT_PARAMS = new Set([
    'q', // search query
    'offset', // pagination
    'sort', // sort order
    'refine', // category/search refinements
    'pid', // product variant ID
]);

/**
 * Build a canonical URL from the given origin and pathname.
 *
 * - Keeps only allowlisted query parameters that affect page content
 * - Strips everything else (tracking, analytics, unknown params)
 * - Sorts retained params for a deterministic URL
 * - Normalizes trailing slashes (removes them, except for root "/")
 * - Returns an absolute, properly-encoded URL
 */
export function buildCanonicalUrl(origin: string, pathname: string, search?: string): string {
    let url: URL;
    try {
        url = new URL(pathname, origin);
    } catch {
        return '';
    }

    // Remove trailing slash (except for root)
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
        url.pathname = url.pathname.slice(0, -1);
    }

    // Keep only content-affecting parameters, sorted for deterministic output
    if (search) {
        const params = new URLSearchParams(search);
        const cleanEntries: [string, string][] = [];

        for (const [key, value] of params) {
            if (CONTENT_PARAMS.has(key)) {
                cleanEntries.push([key, value]);
            }
        }

        cleanEntries.sort(([a], [b]) => a.localeCompare(b));

        url.search = new URLSearchParams(cleanEntries).toString();
    }

    return url.toString();
}
