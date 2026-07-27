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
 * The single rule core for CSP contributor origins. Both the boot-time
 * validator (`originError` in `registry.ts`, which rejects non-canonical
 * input and emits messages) and the template-side normalizer
 * (`normalizeCspOrigin`, which strips path/query/fragment) derive from this —
 * so the origin-safety rules live in exactly one place.
 */

/** A safety issue that makes a value unusable as a CSP source origin. */
export type CspOriginIssue = 'not-string' | 'wildcard' | 'separator' | 'unparseable' | 'not-https' | 'credentials';

export interface CspOriginInspection {
    /** First safety issue, or null when the value is a safe https URL. */
    issue: CspOriginIssue | null;
    /** Canonical scheme+host[:port] origin; null when `issue` is non-null. */
    origin: string | null;
}

/**
 * Inspect a candidate CSP origin against the safety rules: must be a string,
 * contain no `*` (wildcard), no whitespace or CSP separators (`;` `,` — which
 * could split/inject directives), be a parseable `https:` URL, and carry no
 * userinfo credentials. Returns the canonical origin when safe.
 *
 * Note: a safe-but-non-canonical value (e.g. one with a path) has `issue: null`
 * and a normalized `origin` — callers decide whether to normalize (use `origin`)
 * or reject (compare the raw input to `origin`).
 */
export function inspectCspOrigin(value: string): CspOriginInspection {
    if (typeof value !== 'string') return { issue: 'not-string', origin: null };
    if (value.includes('*')) return { issue: 'wildcard', origin: null };
    if (/[\s;,]/.test(value)) return { issue: 'separator', origin: null };
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return { issue: 'unparseable', origin: null };
    }
    if (url.protocol !== 'https:') return { issue: 'not-https', origin: null };
    if (url.username !== '' || url.password !== '') return { issue: 'credentials', origin: null };
    return { issue: null, origin: url.origin };
}

/**
 * Normalize a config URL to an exact CSP source origin, or null if unsafe.
 * Strips any path/query/fragment — returns `scheme://host[:port]` only.
 * This is the canonical helper template-side contributors should use to turn
 * a configured URL into a CSP directive value.
 */
export function normalizeCspOrigin(value: string): string | null {
    return inspectCspOrigin(value).origin;
}
