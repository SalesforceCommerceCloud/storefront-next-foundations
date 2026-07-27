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
 * Custom E2E Test Types
 *
 * NOTE: These are NOT SCAPI or backend types.
 * These are custom types used exclusively by E2E tests, page objects, and flows
 * for capturing and validating UI-level data during test execution.
 */

/**
 * Product Information Interface
 * Captures product details for validation across flows and specs
 */
export interface ProductInfo {
    title: string;
    quantity: string;
}
