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
import { describe, expect, it } from 'vitest';
import { createPatternMatcher } from './index';

describe('createPatternMatcher', () => {
    describe('exact matching', () => {
        it('should match an exact path', () => {
            const matcher = createPatternMatcher(['/healthcheck']);

            expect(matcher('/healthcheck')).toBe(true);
        });

        it('should not match a different path', () => {
            const matcher = createPatternMatcher(['/healthcheck']);

            expect(matcher('/health')).toBe(false);
            expect(matcher('/healthcheck/deep')).toBe(false);
        });

        it('should match root path /', () => {
            const matcher = createPatternMatcher(['/']);

            expect(matcher('/')).toBe(true);
            expect(matcher('/anything')).toBe(false);
        });
    });

    describe('wildcard matching (/**)', () => {
        it('should match the prefix itself', () => {
            const matcher = createPatternMatcher(['/resource/**']);

            expect(matcher('/resource')).toBe(true);
        });

        it('should match paths under the prefix', () => {
            const matcher = createPatternMatcher(['/resource/**']);

            expect(matcher('/resource/stores')).toBe(true);
            expect(matcher('/resource/products/123')).toBe(true);
        });

        it('should not match paths that only share a common prefix string', () => {
            const matcher = createPatternMatcher(['/action/**']);

            // "/action-item" starts with "/action" but not "/action/"
            expect(matcher('/action-item')).toBe(false);
        });

        it('should not match unrelated paths', () => {
            const matcher = createPatternMatcher(['/resource/**']);

            expect(matcher('/api/health')).toBe(false);
            expect(matcher('/')).toBe(false);
        });
    });

    describe('multiple patterns', () => {
        it('should match any of the provided patterns', () => {
            const matcher = createPatternMatcher(['/resource/**', '/action/**']);

            expect(matcher('/resource/stores')).toBe(true);
            expect(matcher('/action/cart')).toBe(true);
            expect(matcher('/page/home')).toBe(false);
        });

        it('should support mixed exact and wildcard patterns', () => {
            const matcher = createPatternMatcher(['/healthcheck', '/api/**']);

            expect(matcher('/healthcheck')).toBe(true);
            expect(matcher('/api/v1/users')).toBe(true);
            expect(matcher('/other')).toBe(false);
        });
    });

    describe('empty patterns', () => {
        it('should not match anything when patterns array is empty', () => {
            const matcher = createPatternMatcher([]);

            expect(matcher('/')).toBe(false);
            expect(matcher('/anything')).toBe(false);
        });
    });
});
