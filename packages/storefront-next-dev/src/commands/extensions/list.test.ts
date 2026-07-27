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
import List from './list';
import { listExtensions } from '../../extensibility/manage-extensions';

// Mock dependencies
vi.mock('../../extensibility/manage-extensions', () => ({
    listExtensions: vi.fn(),
}));

describe('extensions list command', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call listExtensions with correct project directory', async () => {
        const cmd = new List([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: { 'project-directory': '/test/project' },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(listExtensions).toHaveBeenCalledWith({
            projectDirectory: '/test/project',
        });
    });

    it('should use default project directory when not specified', async () => {
        const cmd = new List([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: { 'project-directory': process.cwd() },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(listExtensions).toHaveBeenCalledWith({
            projectDirectory: process.cwd(),
        });
    });
});
