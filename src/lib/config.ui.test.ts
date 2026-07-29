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
import { uiConfig } from './config.ui';

/**
 * The category route reads `uiConfig.pages.category.pagination.mode` and the
 * batch sizes directly, so this config must define them. A missing
 * `pagination` block leaves the value `undefined` at runtime and the category
 * page fails to render. These assertions guard the block's presence and shape.
 */
describe('foundations uiConfig.pages.category.pagination', () => {
    const pagination = uiConfig.pages.category.pagination;

    it('is defined so the category route does not crash on pagination.mode', () => {
        expect(pagination).toBeDefined();
    });

    it('has a valid mode', () => {
        expect(['load-more', 'traditional']).toContain(pagination.mode);
    });

    it('has numeric batch-size settings', () => {
        expect(typeof pagination.batchSize).toBe('number');
        expect(typeof pagination.mobileBatchSize).toBe('number');
        expect(typeof pagination.maxProducts).toBe('number');
        expect(pagination.batchSize).toBeGreaterThan(0);
        expect(pagination.mobileBatchSize).toBeGreaterThan(0);
        expect(pagination.maxProducts).toBeGreaterThan(0);
    });
});
