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

import { createHash } from 'node:crypto';

/**
 * Redacts an email for log output: keeps the domain in plaintext (useful for forensics —
 * "is this a single sender or many?") and replaces the local-part with a short stable
 * hash. Same input always maps to same output, so operators can correlate log lines for
 * the same shopper without storing the raw address.
 *
 * Example: "shopper@example.com" → "a1b2c3d4@example.com"
 *
 * Returns undefined when the input is falsy or malformed. Use on user-supplied emails on
 * any log path that may fire at scale (fail-open during outages, bot rejection).
 */
export function redactEmailForLog(email: string | undefined | null): string | undefined {
    if (!email) return undefined;
    const at = email.lastIndexOf('@');
    // Malformed (no @, or @ at start/end) — drop the whole value rather than emit a
    // partial that could leak the local-part.
    if (at <= 0 || at === email.length - 1) return undefined;
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    const hash = createHash('sha256').update(local.toLowerCase()).digest('hex').slice(0, 8);
    return `${hash}@${domain}`;
}
