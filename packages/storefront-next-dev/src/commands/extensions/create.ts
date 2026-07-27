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
import { createExtension } from '../../extensibility/manage-extensions';

/**
 * Create extension command - creates a new extension scaffold in a storefront project.
 */
export default class Create extends Command {
    static description = 'Create a new extension scaffold in a storefront project';

    static examples = [
        '<%= config.bin %> <%= command.id %> -n "My Extension"',
        '<%= config.bin %> <%= command.id %> -p ./my-project -n "Store Locator" -d "Adds store locator functionality"',
    ];

    static flags = {
        'project-directory': Flags.string({
            char: 'p',
            description: 'Target project directory',
            default: process.cwd(),
        }),
        name: Flags.string({
            char: 'n',
            description: 'Name of the extension to create (e.g., "My Extension")',
        }),
        description: Flags.string({
            char: 'd',
            description: 'Description of the extension',
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Create);

        // createExtension prompts for name/description if not provided
        await createExtension({
            projectDirectory: flags['project-directory'],
            name: flags.name ?? '',
            description: flags.description ?? '',
        });
    }
}
