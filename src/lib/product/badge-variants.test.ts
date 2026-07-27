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
import { getBadgeVariant, BADGE_VARIANTS } from './badge-variants';

describe('Badge Variants', () => {
    describe('getBadgeVariant', () => {
        it('should return correct variant for green color', () => {
            expect(getBadgeVariant('green')).toBe('success');
        });

        it('should return correct variant for orange color', () => {
            expect(getBadgeVariant('orange')).toBe('warning');
        });

        it('should return correct variant for yellow color', () => {
            expect(getBadgeVariant('yellow')).toBe('warning');
        });

        it('should return correct variant for purple color', () => {
            expect(getBadgeVariant('purple')).toBe('secondary');
        });

        it('should return correct variant for red color', () => {
            expect(getBadgeVariant('red')).toBe('destructive');
        });

        it('should return correct variant for blue color', () => {
            expect(getBadgeVariant('blue')).toBe('info');
        });

        it('should return correct variant for pink color', () => {
            expect(getBadgeVariant('pink')).toBe('default');
        });
    });

    describe('BADGE_VARIANTS', () => {
        it('should have all color mappings defined', () => {
            expect(BADGE_VARIANTS.green).toBe('success');
            expect(BADGE_VARIANTS.orange).toBe('warning');
            expect(BADGE_VARIANTS.yellow).toBe('warning');
            expect(BADGE_VARIANTS.purple).toBe('secondary');
            expect(BADGE_VARIANTS.red).toBe('destructive');
            expect(BADGE_VARIANTS.blue).toBe('info');
            expect(BADGE_VARIANTS.pink).toBe('default');
        });
    });
});
