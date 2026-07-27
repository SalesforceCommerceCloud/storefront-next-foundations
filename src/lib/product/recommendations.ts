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
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';

/**
 * Get enabled recommendation types from config
 */
export function getEnabledRecommendationTypes(configParam?: AppConfig): string[] {
    // Explicit `: AppConfig` annotation: in the `??` chain, TypeScript otherwise instantiates
    // `getConfig`'s `T` against the wider `Record<string, unknown>` constraint, dropping the
    // augmented members and typing `config.global` as `unknown`. Naming the lhs type fixes it.
    const config: AppConfig = configParam ?? getConfig();
    const typesConfig = config.global.recommendations.types;
    return Object.entries(typesConfig)
        .filter(([, typeConfig]) => (typeConfig as { enabled: boolean }).enabled)
        .sort(([, a], [, b]) => (a as { priority: number }).priority - (b as { priority: number }).priority)
        .map(([typeId]) => typeId);
}
