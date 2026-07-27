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

import { describe, test, expect } from 'vitest';
import { generateAddressId } from './address-id-utils';

describe('generateAddressId', () => {
    test('generates address ID with addr_ prefix', () => {
        const result = generateAddressId();

        expect(result).toMatch(/^addr_/);
    });

    test('generates unique IDs on each call', () => {
        const result1 = generateAddressId();
        const result2 = generateAddressId();

        expect(result1).not.toBe(result2);
        expect(result1).toMatch(/^addr_/);
        expect(result2).toMatch(/^addr_/);
    });

    test('returns string type', () => {
        const result = generateAddressId();

        expect(typeof result).toBe('string');
    });

    test('generates ID with consistent format', () => {
        const result = generateAddressId();

        // Should match addr_ followed by nanoid (alphanumeric with - and _)
        expect(result).toMatch(/^addr_[A-Za-z0-9_-]+$/);
    });

    test('generates IDs of expected length', () => {
        const result = generateAddressId();

        // nanoid default length is 21 characters, plus 'addr_' prefix (5 chars) = 26 total
        expect(result.length).toBe(26);
    });

    test('generates multiple unique IDs', () => {
        const ids = new Set();
        const count = 100;

        for (let i = 0; i < count; i++) {
            ids.add(generateAddressId());
        }

        // All IDs should be unique
        expect(ids.size).toBe(count);
    });

    test('generates URL-safe characters only', () => {
        const result = generateAddressId();

        // nanoid uses A-Za-z0-9_- which are all URL-safe
        expect(result).toMatch(/^[A-Za-z0-9_-]+$/);
    });
});
