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
 *
 * @vitest-environment jsdom
 */
import 'reflect-metadata';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { fallback, ProductCarouselWithSuspenseMetadata } from './index';
import ProductCarouselSkeleton from './skeleton';
import { getAttributeDefinitions } from '@/lib/decorators/attribute-definition';

// Mock the skeleton component
vi.mock('./skeleton', () => ({
    default: vi.fn(() => 'ProductCarouselSkeleton'),
}));

describe('ProductCarousel Index', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fallback export', () => {
        test('exports the skeleton component as fallback', () => {
            expect(fallback).toBe(ProductCarouselSkeleton);
            expect(fallback).toBeDefined();
            expect(typeof fallback).toBe('function');
        });
    });

    describe('metadata defaults', () => {
        test('exposes title and limit defaults for Page Designer without exposing productId', () => {
            const metadata = getAttributeDefinitions(ProductCarouselWithSuspenseMetadata.prototype);

            expect(metadata.fields.productId).toBeUndefined();
            expect(metadata.fields.title?.defaultValue).toBe('');
            expect(metadata.fields.limit?.defaultValue).toBe(12);
        });
    });
});
