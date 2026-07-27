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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateStorefront from './create-storefront';
import { createStorefront } from '../create-storefront';

// Mock dependencies
vi.mock('../create-storefront', () => ({
    createStorefront: vi.fn(() => Promise.resolve()),
}));

describe('create-storefront command', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call createStorefront with localPackagesDir from flags', async () => {
        const cmd = new CreateStorefront([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                name: undefined,
                template: undefined,
                'local-packages-dir': '/path/to/packages',
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(createStorefront).toHaveBeenCalledWith({
            name: undefined,
            template: undefined,
            localPackagesDir: '/path/to/packages',
        });
    });
});
