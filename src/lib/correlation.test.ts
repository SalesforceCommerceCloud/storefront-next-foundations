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
import { describe, it, expect } from 'vitest';
import { generateCorrelationId, correlationContext } from './correlation';

describe('lib/correlation.ts', () => {
    describe('generateCorrelationId', () => {
        it('should generate a valid UUID v4 string', () => {
            const id = generateCorrelationId();

            // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
            // where y is one of 8, 9, a, or b
            const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(id).toMatch(uuidV4Regex);
        });

        it('should generate unique IDs on each call', () => {
            const ids = new Set<string>();
            const iterations = 100;

            for (let i = 0; i < iterations; i++) {
                ids.add(generateCorrelationId());
            }

            expect(ids.size).toBe(iterations);
        });

        it('should return a string', () => {
            const id = generateCorrelationId();
            expect(typeof id).toBe('string');
        });

        it('should return a non-empty string', () => {
            const id = generateCorrelationId();
            expect(id.length).toBeGreaterThan(0);
        });
    });

    describe('correlationContext', () => {
        it('should be defined', () => {
            expect(correlationContext).toBeDefined();
        });

        it('should have a default value of empty string', () => {
            // The context is created with createContext<string>('')
            // react-router's createContext stores the default value differently
            expect(correlationContext).toHaveProperty('defaultValue', '');
        });
    });
});
