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
 * Names of the generated barrel directories under `src/extensions/`. Each aggregator writes
 * into one (`locales/`, `config/`) and both must skip both during discovery, so neither
 * treats the other's output — or its own — as an extension. Shared here so the skip lists in
 * the locale and config aggregators can't drift apart.
 */
export const GENERATED_EXTENSION_DIRS = {
    locales: 'locales',
    config: 'config',
} as const;
