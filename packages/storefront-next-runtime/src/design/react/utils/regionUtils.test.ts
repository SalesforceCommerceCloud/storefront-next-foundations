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
import { isComponentTypeAllowedInRegion } from './regionUtils';
import { describe, it, expect } from 'vitest';

describe('regionUtils', () => {
    describe('isComponentTypeAllowedInRegion', () => {
        it.each([
            // Undefined/empty componentType cases
            [undefined, [], [], false, 'undefined componentType'],
            ['', [], [], false, 'empty string componentType'],
            [undefined, ['Button'], [], false, 'undefined componentType with inclusions'],

            // Exclusions cases
            ['Image', [], ['Image', 'Video'], false, 'componentType in exclusions list'],
            [
                'Button',
                ['Button', 'Text'],
                ['Button', 'Image'],
                false,
                'componentType in exclusions even if in inclusions',
            ],
            ['Button', [], ['Image', 'Video'], true, 'componentType not in exclusions and no inclusions'],

            // Inclusions cases
            ['Button', ['Button', 'Text'], [], true, 'componentType in inclusions list'],
            ['Image', ['Button', 'Text'], [], false, 'componentType not in inclusions list'],
            [
                'Button',
                ['Button', 'Text'],
                ['Image', 'Video'],
                true,
                'componentType in inclusions and not in exclusions',
            ],

            // Empty restrictions cases
            ['AnyComponent', [], [], true, 'both inclusions and exclusions are empty'],
            ['Button', [], [], true, 'no restrictions - Button'],
            ['Text', [], [], true, 'no restrictions - Text'],
            ['Image', [], [], true, 'no restrictions - Image'],
            ['Video', [], [], true, 'no restrictions - Video'],
            ['CustomComponent', [], [], true, 'no restrictions - CustomComponent'],
        ])('should return %s for %s (%s)', (componentType, inclusions, exclusions, expected, _description) => {
            const result = isComponentTypeAllowedInRegion(componentType, inclusions, exclusions);
            expect(result).toBe(expected);
        });
    });
});
