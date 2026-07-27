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
import 'reflect-metadata';

import { getAttributeDefinitions } from '@/lib/decorators/attribute-definition';
import { HeroCarouselMetadata } from './index';

describe('HeroCarouselMetadata - PD default alignment', () => {
    test('autoPlay has defaultValue: true matching React component default', () => {
        const metadata = getAttributeDefinitions(HeroCarouselMetadata.prototype);
        expect(metadata.fields.autoPlay).toBeDefined();
        expect(metadata.fields.autoPlay?.defaultValue).toBe(true);
    });

    test('autoPlayInterval has defaultValue: 5000 matching React component default', () => {
        const metadata = getAttributeDefinitions(HeroCarouselMetadata.prototype);
        expect(metadata.fields.autoPlayInterval).toBeDefined();
        expect(metadata.fields.autoPlayInterval?.defaultValue).toBe(5000);
    });

    test('showDots has defaultValue: true matching React component default', () => {
        const metadata = getAttributeDefinitions(HeroCarouselMetadata.prototype);
        expect(metadata.fields.showDots).toBeDefined();
        expect(metadata.fields.showDots?.defaultValue).toBe(true);
    });

    test('showNavigation has defaultValue: true matching React component default', () => {
        const metadata = getAttributeDefinitions(HeroCarouselMetadata.prototype);
        expect(metadata.fields.showNavigation).toBeDefined();
        expect(metadata.fields.showNavigation?.defaultValue).toBe(true);
    });
});
