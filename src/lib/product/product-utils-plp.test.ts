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
import { getProductRating } from './product-utils-plp';

describe('product-utils-plp', () => {
    describe('getProductRating', () => {
        it('returns mock rating and reviewCount (product data not read)', () => {
            expect(getProductRating({})).toEqual({ rating: 4, reviewCount: 218 });
            expect(getProductRating({ representedProduct: { c_reviewRating: 4.5, c_reviewCount: 100 } })).toEqual({
                rating: 4,
                reviewCount: 218,
            });
        });
    });
});
