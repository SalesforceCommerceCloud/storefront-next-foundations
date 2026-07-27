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
import PrepareLocal from './prepare-local';
import { prepareForLocalDev } from '../utils/local-dev-setup';

// Mock dependencies
vi.mock('../utils/local-dev-setup', () => ({
    prepareForLocalDev: vi.fn(() => Promise.resolve()),
}));

describe('prepare-local command', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call prepareForLocalDev with project and source directories from flags', async () => {
        const cmd = new PrepareLocal([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/test/project',
                'source-packages-dir': '/path/to/packages',
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(prepareForLocalDev).toHaveBeenCalledWith({
            projectDirectory: '/test/project',
            sourcePackagesDir: '/path/to/packages',
        });
    });

    it('should use default project directory when not specified', async () => {
        const cmd = new PrepareLocal([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': process.cwd(),
                'source-packages-dir': undefined,
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(prepareForLocalDev).toHaveBeenCalledWith({
            projectDirectory: process.cwd(),
            sourcePackagesDir: undefined,
        });
    });

    it('should pass undefined source packages dir when not provided', async () => {
        const cmd = new PrepareLocal([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/my/project',
                'source-packages-dir': undefined,
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(prepareForLocalDev).toHaveBeenCalledWith({
            projectDirectory: '/my/project',
            sourcePackagesDir: undefined,
        });
    });
});
