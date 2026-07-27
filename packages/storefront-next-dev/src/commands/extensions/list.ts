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

import { Command } from '@oclif/core';
import { listExtensions } from '../../extensibility/manage-extensions';
import { commonFlags } from '../../flags';

/**
 * List extensions command - lists all installed extensions in a storefront project.
 */
export default class List extends Command {
    static description = 'List all installed extensions in a storefront project';

    static examples = ['<%= config.bin %> <%= command.id %>', '<%= config.bin %> <%= command.id %> -d ./my-project'];

    static flags = {
        ...commonFlags,
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(List);

        listExtensions({
            projectDirectory: flags['project-directory'],
        });
    }
}
