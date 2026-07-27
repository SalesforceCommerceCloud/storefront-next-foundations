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

import { Command, Flags } from '@oclif/core';
import { manageExtensions } from '../../extensibility/manage-extensions';
import { commonFlags } from '../../flags';

// Default template git URL
const DEFAULT_TEMPLATE_GIT_URL =
    process.env.DEFAULT_TEMPLATE_GIT_URL || 'https://github.com/SalesforceCommerceCloud/storefront-next-template.git';

/**
 * Install extension command - installs an extension into a storefront project.
 */
export default class Install extends Command {
    static description = 'Install an extension into a storefront project';

    static examples = [
        '<%= config.bin %> <%= command.id %> -e SFDC_EXT_STORE_LOCATOR',
        '<%= config.bin %> <%= command.id %> -d ./my-project -e SFDC_EXT_BOPIS',
    ];

    static flags = {
        ...commonFlags,
        extension: Flags.string({
            char: 'e',
            description: 'Extension marker value (e.g. SFDC_EXT_STORE_LOCATOR)',
        }),
        'source-git-url': Flags.string({
            char: 's',
            description: 'Git URL of the source template project',
            default: DEFAULT_TEMPLATE_GIT_URL,
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Install);

        await manageExtensions({
            projectDirectory: flags['project-directory'],
            install: true,
            extensions: flags.extension ? [flags.extension] : undefined,
            sourceGitUrl: flags['source-git-url'],
        });
    }
}
