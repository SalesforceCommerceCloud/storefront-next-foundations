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
import Preview from './preview';
import { preview } from '../lib/preview';

// Mock dependencies
vi.mock('../lib/preview', () => ({
    preview: vi.fn(() => Promise.resolve()),
}));

describe('preview command', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call preview with project directory and port from flags', async () => {
        const cmd = new Preview([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/test/project',
                port: 4000,
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(preview).toHaveBeenCalledWith({
            projectDirectory: '/test/project',
            port: 4000,
        });
    });

    it('should pass undefined for optional flags when not provided', async () => {
        const cmd = new Preview([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': undefined,
                port: undefined,
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(preview).toHaveBeenCalledWith({
            projectDirectory: undefined,
            port: undefined,
        });
    });

    it('should call preview with custom port', async () => {
        const cmd = new Preview([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/custom/dir',
                port: 5000,
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(preview).toHaveBeenCalledWith({
            projectDirectory: '/custom/dir',
            port: 5000,
        });
    });
});
