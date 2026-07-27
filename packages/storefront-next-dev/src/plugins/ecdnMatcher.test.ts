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
import { describe, it, expect, beforeEach } from 'vitest';
import { extractPatterns, testPatterns, shouldRouteToNext, clearCache } from './ecdnMatcher';

// Sample rule - matches home, product, auth pages, category, search, account, resource, and data requests
// Note: In local dev, .data paths are also excluded by Vite bypass for safety
const SAMPLE_RULE = `(http.request.uri.path matches "^/$" or http.request.uri.path matches "^/reset-password.*" or http.request.uri.path matches "^/signup.*" or http.request.uri.path matches "^/logout.*" or http.request.uri.path matches "^/login.*" or http.request.uri.path matches "^/product.*" or http.request.uri.path matches "^/category.*" or http.request.uri.path matches "^/search.*" or http.request.uri.path matches "^/account.*" or http.request.uri.path matches "^/social-callback.*" or http.request.uri.path matches "^/resource/.*" or http.request.uri.path matches "^/action/.*" or http.request.uri.path matches ".*\\.data.*")`;

describe('ecdnMatcher', () => {
    beforeEach(() => {
        clearCache();
    });

    describe('extractPatterns', () => {
        it('should extract patterns from sample rule', () => {
            const patterns = extractPatterns(SAMPLE_RULE);
            expect(patterns).toHaveLength(13); // Updated from 12 to 13 with /product and /resource
            expect(patterns).toContain('^/$');
            expect(patterns).toContain('^/reset-password.*');
            expect(patterns).toContain('^/product.*');
            expect(patterns).toContain('^/category.*');
            expect(patterns).toContain('^/search.*');
            expect(patterns).toContain('^/account.*');
            expect(patterns).toContain('^/resource/.*');
            expect(patterns).toContain('.*\\.data.*');
        });

        it('should handle single quotes', () => {
            const rule = `(http.request.uri.path matches '^/test.*')`;
            const patterns = extractPatterns(rule);
            expect(patterns).toEqual(['^/test.*']);
        });

        it('should handle mixed quotes', () => {
            const rule = `(http.request.uri.path matches "^/$" or http.request.uri.path matches '^/test.*')`;
            const patterns = extractPatterns(rule);
            expect(patterns).toHaveLength(2);
            expect(patterns).toContain('^/$');
            expect(patterns).toContain('^/test.*');
        });

        it('should return empty array for empty string', () => {
            expect(extractPatterns('')).toEqual([]);
        });

        it('should return empty array for undefined', () => {
            expect(extractPatterns(undefined as any)).toEqual([]);
        });

        it('should return empty array for malformed expression', () => {
            expect(extractPatterns('random text without matches')).toEqual([]);
        });
    });

    describe('testPatterns', () => {
        it('should match exact path', () => {
            const patterns = ['^/$'];
            expect(testPatterns('/', patterns)).toBe(true);
            expect(testPatterns('/home', patterns)).toBe(false);
        });

        it('should match wildcard patterns', () => {
            const patterns = ['^/category.*', '^/search.*'];
            expect(testPatterns('/category/shoes', patterns)).toBe(true);
            expect(testPatterns('/search?q=test', patterns)).toBe(true);
            expect(testPatterns('/checkout', patterns)).toBe(false);
        });

        it('should match with logical OR (any pattern)', () => {
            const patterns = ['^/login.*', '^/signup.*'];
            expect(testPatterns('/login', patterns)).toBe(true);
            expect(testPatterns('/signup', patterns)).toBe(true);
            expect(testPatterns('/checkout', patterns)).toBe(false);
        });

        it('should handle complex patterns', () => {
            const patterns = ['.*\\.data.*'];
            expect(testPatterns('/product/123.data', patterns)).toBe(true);
            expect(testPatterns('/category.data', patterns)).toBe(true);
            expect(testPatterns('/product/123', patterns)).toBe(false);
        });

        it('should handle patterns with slashes', () => {
            const patterns = ['^/resource/auth/.*'];
            expect(testPatterns('/resource/auth/login', patterns)).toBe(true);
            expect(testPatterns('/resource/other', patterns)).toBe(false);
        });

        it('should return false for empty patterns', () => {
            expect(testPatterns('/test', [])).toBe(false);
        });

        it('should return false for empty pathname', () => {
            const patterns = ['^/test.*'];
            expect(testPatterns('', patterns)).toBe(false);
        });

        it('should handle invalid regex patterns gracefully', () => {
            const patterns = ['[invalid(regex'];
            // Should log warning and return false
            expect(testPatterns('/test', patterns)).toBe(false);
        });

        it('should cache regex patterns for performance', () => {
            const patterns = ['^/test.*'];
            // First call compiles regex
            testPatterns('/test', patterns);
            // Second call should use cached regex
            testPatterns('/test123', patterns);
            // Both should work correctly
            expect(testPatterns('/test456', patterns)).toBe(true);
            expect(testPatterns('/other', patterns)).toBe(false);
        });
    });

    describe('shouldRouteToNext', () => {
        it('should route paths matching sample rule to Next', () => {
            expect(shouldRouteToNext('/', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/reset-password', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/signup', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/login', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/product/cool-shirt', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/product/123', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/category/mens', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/search', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/search?q=shoes', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/account/orders', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/social-callback', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/resource/auth/token', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/resource/config', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/action/submit', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/product/123.data', SAMPLE_RULE)).toBe(true);
        });

        it('should route /mobify/proxy/api paths to Next when included in rules', () => {
            const ruleWithMobify = '(http.request.uri.path matches "^/mobify/proxy/api.*")';
            expect(shouldRouteToNext('/mobify/proxy/api/test', ruleWithMobify)).toBe(true);
            expect(shouldRouteToNext('/mobify/proxy/api/experience/shopper-experience/v1/pages', ruleWithMobify)).toBe(
                true
            );
            expect(shouldRouteToNext('/other-path', ruleWithMobify)).toBe(false);
        });

        it('should NOT route non-matching paths to Next (proxy to SFRA)', () => {
            expect(shouldRouteToNext('/checkout', SAMPLE_RULE)).toBe(false);
            expect(shouldRouteToNext('/cart', SAMPLE_RULE)).toBe(false);
            expect(shouldRouteToNext('/custom-page', SAMPLE_RULE)).toBe(false);
            expect(shouldRouteToNext('/order-history', SAMPLE_RULE)).toBe(false);
        });

        it('should default to Next when no rules provided', () => {
            expect(shouldRouteToNext('/any-path', undefined)).toBe(true);
            expect(shouldRouteToNext('/any-path', '')).toBe(true);
        });

        it('should default to Next when rules are malformed', () => {
            expect(shouldRouteToNext('/test', 'malformed expression')).toBe(true);
        });

        it('should handle query strings in pathname', () => {
            expect(shouldRouteToNext('/search?q=test&page=2', SAMPLE_RULE)).toBe(true);
            expect(shouldRouteToNext('/checkout?step=payment', SAMPLE_RULE)).toBe(false);
        });
    });

    describe('clearCache', () => {
        it('should clear the regex cache', () => {
            const patterns = ['^/test.*'];
            // Populate cache
            testPatterns('/test', patterns);
            // Clear cache
            clearCache();
            // Pattern should still work (will be recompiled)
            expect(testPatterns('/test', patterns)).toBe(true);
        });
    });
});
