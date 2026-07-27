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

export interface FlatEntry {
    key: string;
    value: unknown;
}

/**
 * Recursively flattens a nested object into dot-notation key-value pairs.
 * Arrays and primitives are treated as leaf values (not further traversed).
 *
 * @param obj - The object to flatten
 * @param prefix - Dot-notation prefix for nested keys
 */
export function flattenObject(obj: Record<string, unknown>, prefix = ''): FlatEntry[] {
    const entries: FlatEntry[] = [];
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            entries.push(...flattenObject(v as Record<string, unknown>, key));
        } else {
            entries.push({ key, value: v });
        }
    }
    return entries;
}
