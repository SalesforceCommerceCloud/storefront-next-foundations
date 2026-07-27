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
import { DELIVERY_OPTIONS, type DeliveryOption } from './constants';

describe('store-locator constants', () => {
    describe('DELIVERY_OPTIONS', () => {
        it('has correct delivery option values', () => {
            expect(DELIVERY_OPTIONS.DELIVERY).toBe('delivery');
            expect(DELIVERY_OPTIONS.PICKUP).toBe('pickup');
        });

        it('has constant values', () => {
            // Test that the values are defined as constants
            expect(DELIVERY_OPTIONS.DELIVERY).toBeDefined();
            expect(DELIVERY_OPTIONS.PICKUP).toBeDefined();

            // Test that the object structure is correct
            expect(Object.keys(DELIVERY_OPTIONS)).toHaveLength(2);
            expect(Object.keys(DELIVERY_OPTIONS)).toContain('DELIVERY');
            expect(Object.keys(DELIVERY_OPTIONS)).toContain('PICKUP');
        });
    });

    describe('DeliveryOption type', () => {
        it('accepts valid delivery option values', () => {
            const delivery: DeliveryOption = DELIVERY_OPTIONS.DELIVERY;
            const pickup: DeliveryOption = DELIVERY_OPTIONS.PICKUP;

            expect(delivery).toBe('delivery');
            expect(pickup).toBe('pickup');
        });

        it('is properly typed as union of delivery options', () => {
            const options: DeliveryOption[] = [DELIVERY_OPTIONS.DELIVERY, DELIVERY_OPTIONS.PICKUP];

            expect(options).toContain('delivery');
            expect(options).toContain('pickup');
            expect(options).toHaveLength(2);
        });
    });
});
