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
import { PRODUCT_SEARCH_QUERY_PARAMS, getQueryParam, getAllQueryParams } from './query-params';

describe('query-params', () => {
    it('should have type-safe query parameter constants', () => {
        expect(PRODUCT_SEARCH_QUERY_PARAMS.SORT).toBe('sort');
        expect(PRODUCT_SEARCH_QUERY_PARAMS.REFINE).toBe('refine');
        expect(PRODUCT_SEARCH_QUERY_PARAMS.Q).toBe('q');
    });

    it('should get query parameter values safely', () => {
        const searchParams = new URLSearchParams('sort=price&refine=color:red&refine=size:large');

        expect(getQueryParam(searchParams, PRODUCT_SEARCH_QUERY_PARAMS.SORT)).toBe('price');
        expect(getQueryParam(searchParams, PRODUCT_SEARCH_QUERY_PARAMS.Q)).toBe('');
    });

    it('should get all query parameter values for array parameters', () => {
        const searchParams = new URLSearchParams('sort=price&refine=color:red&refine=size:large');

        expect(getAllQueryParams(searchParams, PRODUCT_SEARCH_QUERY_PARAMS.REFINE)).toEqual([
            'color:red',
            'size:large',
        ]);
    });
});
