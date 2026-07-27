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
import { prepareForLocalDev } from '../utils/local-dev-setup';
import { commonFlags } from '../flags';

/**
 * Prepare local command - prepares a storefront project for local development with file-linked packages.
 */
export default class PrepareLocal extends Command {
    static description =
        'Prepare a storefront project for local development with file-linked packages. Converts workspace:* dependencies to file: references and patches vite.config.ts.';

    static examples = [
        '<%= config.bin %> <%= command.id %> -d ./my-storefront',
        '<%= config.bin %> <%= command.id %> -d . -s /path/to/monorepo/packages',
    ];

    static flags = {
        ...commonFlags,
        'source-packages-dir': Flags.string({
            char: 's',
            description: 'Source monorepo packages directory (for default path suggestions)',
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(PrepareLocal);

        await prepareForLocalDev({
            projectDirectory: flags['project-directory'],
            sourcePackagesDir: flags['source-packages-dir'],
        });
    }
}
