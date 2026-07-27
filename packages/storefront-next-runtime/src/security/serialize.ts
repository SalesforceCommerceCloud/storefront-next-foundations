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
import type { CspDirectives, HstsConfig } from './types.js';

/**
 * Serialize a `CspDirectives` map to a CSP header string.
 *
 * If `nonce` is provided, it is appended to `script-src` (creating it
 * if absent). Empty directive arrays are omitted.
 * `upgrade-insecure-requests` is serialized as a bare keyword.
 */
export function serializeCsp(directives: CspDirectives, options?: { nonce?: string }): string {
    const parts: string[] = [];
    let scriptSrcEmitted = false;

    for (const [name, value] of Object.entries(directives)) {
        if (name === 'upgrade-insecure-requests') {
            if (value === true) parts.push('upgrade-insecure-requests');
            continue;
        }
        const sources = value as string[] | undefined;
        if (!sources || sources.length === 0) continue;

        if (name === 'script-src' && options?.nonce) {
            parts.push(`script-src ${[...sources, `'nonce-${options.nonce}'`].join(' ')}`);
            scriptSrcEmitted = true;
        } else {
            parts.push(`${name} ${sources.join(' ')}`);
        }
    }

    if (options?.nonce && !scriptSrcEmitted) {
        parts.push(`script-src 'nonce-${options.nonce}'`);
    }

    return parts.join('; ');
}

/**
 * Serialize a Permissions-Policy map to a header string.
 *
 * Per the W3C structured-field grammar, the keywords `self` and `*` are
 * emitted unquoted; all other allowlist entries are emitted as quoted
 * strings (the schema rejects malformed origins before they reach here).
 * Empty allowlists serialize to `name=()` (deny).
 *
 * Reference: https://www.w3.org/TR/permissions-policy/#permissions-policy-http-header-field
 */
export function serializePermissionsPolicy(policy: Record<string, string[]>): string {
    return Object.entries(policy)
        .map(([feature, allowlist]) => {
            if (allowlist.length === 0) return `${feature}=()`;
            const tokens = allowlist.map((origin) => (origin === 'self' || origin === '*' ? origin : `"${origin}"`));
            return `${feature}=(${tokens.join(' ')})`;
        })
        .join(', ');
}

/**
 * Serialize an HSTS config to a header string.
 */
export function serializeHsts(hsts: Required<HstsConfig>): string {
    const parts = [`max-age=${hsts.maxAge}`];
    if (hsts.includeSubDomains) parts.push('includeSubDomains');
    if (hsts.preload) parts.push('preload');
    return parts.join('; ');
}
