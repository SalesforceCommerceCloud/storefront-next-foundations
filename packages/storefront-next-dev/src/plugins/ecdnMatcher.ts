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

import { logger } from '../logger';

/**
 * Cloudflare eCDN Routing Rule Matcher
 *
 * Parses Cloudflare-style routing expressions and tests pathnames against them.
 * This utility is environment-agnostic and works in both Node.js and browser contexts.
 *
 * @example
 * ```typescript
 * const rules = '(http.request.uri.path matches "^/$" or http.request.uri.path matches "^/search.*")';
 * shouldRouteToNext('/', rules);          // true - route to Storefront Next
 * shouldRouteToNext('/search', rules);    // true - route to Storefront Next
 * shouldRouteToNext('/checkout', rules);  // false - proxy to SFRA/legacy
 * ```
 *
 * Environment variables used:
 * - HYBRID_PROXY_ENABLED (optional) - Boolean flag to enable/disable hybrid proxy
 * - HYBRID_ROUTING_RULES (optional) - Cloudflare routing expression string
 * - SFCC_ORIGIN (optional) - Base URL for SFCC sandbox redirects
 */

// Regex cache to avoid recompiling patterns on every request
const regexCache = new Map<string, RegExp>();

/**
 * Extracts regex patterns from a Cloudflare routing expression.
 *
 * Parses Cloudflare "matches" expressions like:
 *   (http.request.uri.path matches "^/$" or http.request.uri.path matches "^/category.*")
 *
 * And extracts the regex patterns: ["^/$", "^/category.*"]
 *
 * @param expression - Cloudflare expression string
 * @returns Array of regex pattern strings
 *
 * @example
 * ```typescript
 * extractPatterns('(http.request.uri.path matches "^/$")');
 * // Returns: ["^/$"]
 *
 * extractPatterns('(http.request.uri.path matches "^/$" or http.request.uri.path matches "^/search.*")');
 * // Returns: ["^/$", "^/search.*"]
 * ```
 */
export function extractPatterns(expression: string): string[] {
    if (!expression || typeof expression !== 'string') {
        return [];
    }

    // Match: http.request.uri.path matches "PATTERN" or http.request.uri.path matches 'PATTERN'
    // Handles both single and double quotes
    const regex = /http\.request\.uri\.path\s+matches\s+["']([^"']+)["']/gi;
    const patterns: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(expression)) !== null) {
        patterns.push(match[1]);
    }

    return patterns;
}

/**
 * Tests if a pathname matches any of the provided regex patterns (logical OR).
 * Uses caching to optimize repeated pattern compilations.
 *
 * @param pathname - URL pathname to test (e.g., "/search", "/category/shoes")
 * @param patterns - Array of regex pattern strings
 * @returns true if pathname matches any pattern, false otherwise
 *
 * @example
 * ```typescript
 * testPatterns('/category/shoes', ['^/category.*', '^/search.*']);
 * // Returns: true (matches first pattern)
 *
 * testPatterns('/checkout', ['^/category.*', '^/search.*']);
 * // Returns: false (matches no patterns)
 * ```
 */
export function testPatterns(pathname: string, patterns: string[]): boolean {
    if (!pathname || !patterns || patterns.length === 0) {
        return false;
    }

    // Test pathname against each pattern (logical OR - any match returns true)
    for (const pattern of patterns) {
        try {
            // Check cache first
            let regex = regexCache.get(pattern);
            if (!regex) {
                regex = new RegExp(pattern);
                regexCache.set(pattern, regex);
            }

            if (regex.test(pathname)) {
                return true;
            }
        } catch (error) {
            // Invalid regex pattern - log warning and skip
            logger.warn(`Invalid regex pattern: ${pattern} ${String(error)}`);
            continue;
        }
    }

    return false;
}

/**
 * Main function: Determines if a pathname should route to Storefront Next
 * or be proxied/redirected to SFRA/legacy backend.
 *
 * @param pathname - URL pathname (e.g., "/search", "/checkout")
 * @param routingRules - Cloudflare routing expression string (optional)
 * @returns true if should route to Storefront Next, false if should proxy to SFRA
 *
 * @example
 * ```typescript
 * const rules = '(http.request.uri.path matches "^/$" or http.request.uri.path matches "^/category.*")';
 *
 * shouldRouteToNext('/', rules);              // true - route to Next
 * shouldRouteToNext('/category/mens', rules); // true - route to Next
 * shouldRouteToNext('/checkout', rules);      // false - proxy to SFRA
 * shouldRouteToNext('/any-path', undefined);  // true - no rules = default to Next
 * ```
 */
export function shouldRouteToNext(pathname: string, routingRules?: string): boolean {
    if (!routingRules) {
        // No rules configured - default to routing to Next (fail-safe)
        return true;
    }

    const patterns = extractPatterns(routingRules);

    if (patterns.length === 0) {
        // Malformed expression or no patterns found - default to Next (fail-safe)
        logger.warn('No valid patterns found in routing rules');
        return true;
    }

    return testPatterns(pathname, patterns);
}

/**
 * Clears the regex cache. Useful for testing or when routing rules change.
 *
 * @example
 * ```typescript
 * clearCache();
 * // All cached regex patterns are removed
 * ```
 */
export function clearCache(): void {
    regexCache.clear();
}
