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
import { defaultInterpolation } from './defaults';

describe('defaultInterpolation', () => {
    it('has escapeValue false', () => {
        expect(defaultInterpolation.escapeValue).toBe(false);
    });

    it('formats numbers with toLocaleString', () => {
        const format = defaultInterpolation.format;
        if (!format) throw new Error('format not defined');
        const result = format(1234, 'number', 'en');
        expect(typeof result).toBe('string');
        expect(result).toContain('1');
    });

    it('returns non-number values unchanged', () => {
        const format = defaultInterpolation.format;
        if (!format) throw new Error('format not defined');
        expect(format('hello', 'number', 'en')).toBe('hello');
        expect(format('world', 'string', 'en')).toBe('world');
    });

    it('returns numbers unchanged when format is not "number"', () => {
        const format = defaultInterpolation.format;
        if (!format) throw new Error('format not defined');
        expect(format(42, 'string', 'en')).toBe(42);
    });
});
