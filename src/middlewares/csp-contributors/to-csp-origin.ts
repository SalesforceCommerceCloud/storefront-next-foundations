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
 * Normalize a config URL to an exact CSP source origin, or null if unsafe.
 * Returns `scheme://host[:port]` only (path/query/fragment stripped); rejects
 * wildcard / non-https / credentialed / whitespace-bearing values.
 *
 * This is a thin alias for the SDK's `normalizeCspOrigin` — the single source
 * of truth for CSP-origin safety rules, shared with the boot-time validator
 * (`validateContributors`) so a contributor's normalized output always
 * satisfies the SDK's boot re-validation. Re-exported under the local name so
 * template contributors have a short, discoverable import.
 */
export { normalizeCspOrigin as toCspOrigin } from '@salesforce/storefront-next-runtime/security';
