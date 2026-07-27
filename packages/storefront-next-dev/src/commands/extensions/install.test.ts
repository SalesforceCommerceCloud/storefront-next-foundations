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
import Install from './install';
import { manageExtensions } from '../../extensibility/manage-extensions';

// Mock dependencies
vi.mock('../../extensibility/manage-extensions', () => ({
    manageExtensions: vi.fn(() => Promise.resolve()),
}));

describe('extensions install command', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call manageExtensions with install=true and extension as array', async () => {
        const cmd = new Install([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/test/project',
                extension: 'SFDC_EXT_STORE_LOCATOR',
                'source-git-url': 'https://github.com/test/repo.git',
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(manageExtensions).toHaveBeenCalledWith({
            projectDirectory: '/test/project',
            install: true,
            extensions: ['SFDC_EXT_STORE_LOCATOR'],
            sourceGitUrl: 'https://github.com/test/repo.git',
        });
    });

    it('should pass undefined extensions when extension not provided', async () => {
        const cmd = new Install([], {} as never);

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/test/project',
                extension: undefined,
                'source-git-url': 'https://github.com/test/repo.git',
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(manageExtensions).toHaveBeenCalledWith({
            projectDirectory: '/test/project',
            install: true,
            extensions: undefined,
            sourceGitUrl: 'https://github.com/test/repo.git',
        });
    });

    it('should use default source git URL when not provided', async () => {
        const cmd = new Install([], {} as never);

        const defaultGitUrl = 'https://github.com/SalesforceCommerceCloud/storefront-next-template.git';

        vi.spyOn(cmd as any, 'parse').mockResolvedValue({
            flags: {
                'project-directory': '/test/project',
                extension: 'SFDC_EXT_TEST',
                'source-git-url': defaultGitUrl,
            },
            args: {},
            argv: [],
            raw: [],
            metadata: {},
        });

        await cmd.run();

        expect(manageExtensions).toHaveBeenCalledWith({
            projectDirectory: '/test/project',
            install: true,
            extensions: ['SFDC_EXT_TEST'],
            sourceGitUrl: defaultGitUrl,
        });
    });
});
