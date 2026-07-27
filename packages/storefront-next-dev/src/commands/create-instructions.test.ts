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
import path from 'path';
import CreateInstructions from './create-instructions';
import { generateInstructions } from '../extensibility/create-instructions';

// Mock dependencies
vi.mock('../extensibility/create-instructions', () => ({
    generateInstructions: vi.fn(),
}));

describe('create-instructions command', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call generateInstructions with all required flags', async () => {
        const cmd = new CreateInstructions([], {} as never);

        const baseDir = process.cwd();

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': './my-project',
                'extension-config': './extension.json',
                extension: 'SFDC_EXT_FEATURE',
                'template-repo': undefined,
                branch: undefined,
                files: undefined,
                'output-dir': undefined,
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });
        vi.spyOn(cmd, 'log').mockImplementation(() => {});

        await cmd.run();

        expect(generateInstructions).toHaveBeenCalledWith(
            path.resolve(baseDir, './my-project'),
            'SFDC_EXT_FEATURE',
            './instructions',
            undefined,
            undefined,
            undefined,
            path.resolve(baseDir, './extension.json'),
            expect.stringContaining('templates')
        );
    });

    it('should split and trim --files values when provided', async () => {
        const cmd = new CreateInstructions([], {} as never);
        const baseDir = process.cwd();

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': './my-project',
                'extension-config': './extension.json',
                extension: 'SFDC_EXT_FEATURE',
                'template-repo': 'https://example.com/template.git',
                branch: 'feature-branch',
                files: 'src/a.ts, src/b.ts ',
                'output-dir': './docs',
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });
        vi.spyOn(cmd, 'log').mockImplementation(() => {});

        await cmd.run();

        expect(generateInstructions).toHaveBeenCalledWith(
            path.resolve(baseDir, './my-project'),
            'SFDC_EXT_FEATURE',
            './docs',
            'https://example.com/template.git',
            'feature-branch',
            ['src/a.ts', 'src/b.ts'],
            path.resolve(baseDir, './extension.json'),
            expect.stringContaining('templates')
        );
    });
});
