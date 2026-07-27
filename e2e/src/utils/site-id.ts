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
 * Resolution order for the test runner's effective SCAPI siteId:
 *   1. explicit `override` argument (truthy)
 *   2. `process.env.SITE_ID`
 *   3. fallback `'RefArchGlobal'` — matches the demo zzrf-001 SLAS app
 *
 * Centralized so the fallback string can't drift across files. (Pre-fix, one
 * call-site fell back to `'RefArch'`, breaking cookie-name lookups in any
 * environment where SITE_ID happened to be unset.)
 */
export function getSiteId(override?: string): string {
    return override || process.env.SITE_ID || 'RefArchGlobal';
}
