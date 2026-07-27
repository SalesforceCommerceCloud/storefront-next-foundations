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

// All absolute-path static asset imports (images, fonts) resolve here in tests.
// Vitest lacks Vite's asset transform pipeline, so the regex alias in vitest.config.ts
// redirects any import matching /.*\.(svg|png|jpg|webp|woff2|...)$/ to this module.
// Add or remove images freely — no per-file vi.mock() entries needed.
export default '__ASSET_MOCK__';
