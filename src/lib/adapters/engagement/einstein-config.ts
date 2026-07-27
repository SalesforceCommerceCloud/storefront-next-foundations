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

import type { EngagementAdapterConfig } from './types';

export type EinsteinConfig = EngagementAdapterConfig & {
    siteId: string;
    host: string;
    einsteinId: string;
    isProduction: boolean;
    realm: string;
};

function isNonBlankString(value: unknown): boolean {
    return typeof value === 'string' && value.trim() !== '';
}

/**
 * Validates the fields shared by every Einstein call site (analytics adapter and
 * recommendations server function) — `host`, `einsteinId`, `siteId`, `realm` all feed
 * into endpoint URL construction. Returns `{ valid, errors }`; callers decide whether
 * to throw (boot-time wiring, e.g. analytics adapter) or fall through (per-request,
 * e.g. recs).
 */
export function validateEinsteinConfig(config: Partial<EinsteinConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!isNonBlankString(config.host)) {
        errors.push(`Missing required field: host`);
    }
    if (!isNonBlankString(config.einsteinId)) {
        errors.push(`Missing required field: einsteinId`);
    }
    if (!isNonBlankString(config.siteId)) {
        errors.push(`Missing required field: siteId`);
    }
    if (!isNonBlankString(config.realm)) {
        errors.push(`Missing required field: realm`);
    }
    return { valid: errors.length === 0, errors };
}
