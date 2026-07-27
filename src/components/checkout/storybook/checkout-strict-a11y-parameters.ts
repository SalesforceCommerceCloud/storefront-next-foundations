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
 * Spread into `meta.parameters` for checkout and checkout-adjacent Storybook
 * stories (e.g. My Cart, Contact) so axe violations fail the Storybook test runner (same
 * as global `STORYBOOK_A11Y_TEST_MODE=error`, but scoped to opted-in files).
 * Default Storybook preview uses `a11y.test: 'todo'`; only stories that spread
 * this object fail the test runner on axe violations.
 */
export const checkoutStrictA11yParameters = {
    a11y: {
        test: 'error' as const,
    },
} as const;
