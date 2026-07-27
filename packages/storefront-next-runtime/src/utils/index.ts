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
 * Creates a matcher function from an array of path patterns.
 * Supports `/**` suffix wildcards (e.g. '/resource/**', '/action/**').
 * Exact paths without wildcards are matched literally.
 */
export function createPatternMatcher(patterns: string[]): (path: string) => boolean {
    const exactMatches = new Set<string>();
    const prefixPatterns: string[] = [];

    for (const pattern of patterns) {
        if (pattern.endsWith('/**')) {
            prefixPatterns.push(pattern.slice(0, -3));
        } else {
            exactMatches.add(pattern);
        }
    }

    return (path: string) => {
        if (exactMatches.has(path)) return true;
        return prefixPatterns.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    };
}
