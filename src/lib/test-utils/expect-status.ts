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
import { expect } from 'vitest';

/**
 * Assert the HTTP status of a `data()`-wrapped action/loader response.
 *
 * React Router's `data(payload)` (no init) defaults to 200, so we treat a
 * missing `init.status` as 200. Use this helper in place of the inline
 * `expect(response.init?.status ?? 200).toBe(N)` pattern — keeps assertions
 * uniform and makes the "default 200" intent explicit at the call site.
 *
 * @param response - Result of an action/loader returning `data(payload, init?)`.
 * @param expected - Expected HTTP status (200 matches both explicit 200 and the
 *   default when no init was provided).
 */
export function expectStatus(response: { init?: ResponseInit | null }, expected: number): void {
    expect(response.init?.status ?? 200).toBe(expected);
}
