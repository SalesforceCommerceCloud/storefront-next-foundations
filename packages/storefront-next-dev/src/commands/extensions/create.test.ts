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
import Create from './create';
import { createExtension } from '../../extensibility/manage-extensions';

// Mock dependencies
vi.mock('../../extensibility/manage-extensions', () => ({
    createExtension: vi.fn(() => Promise.resolve()),
}));

describe('extensions create command', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call createExtension with name and description from flags', async () => {
        const cmd = new Create([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/test/project',
                name: 'My Extension',
                description: 'A test extension',
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(createExtension).toHaveBeenCalledWith({
            projectDirectory: '/test/project',
            name: 'My Extension',
            description: 'A test extension',
        });
    });

    it('should pass empty strings when name and description not provided', async () => {
        const cmd = new Create([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/test/project',
                name: undefined,
                description: undefined,
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(createExtension).toHaveBeenCalledWith({
            projectDirectory: '/test/project',
            name: '',
            description: '',
        });
    });

    it('should use default project directory when not specified', async () => {
        const cmd = new Create([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': process.cwd(),
                name: 'Test',
                description: 'Test desc',
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(createExtension).toHaveBeenCalledWith({
            projectDirectory: process.cwd(),
            name: 'Test',
            description: 'Test desc',
        });
    });
});
