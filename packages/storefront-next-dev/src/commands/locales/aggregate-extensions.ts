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
import { aggregateExtensionLocales } from '../../i18n/aggregate-extension-locales.js';
import { commonFlags } from '../../flags.js';

export default class AggregateExtensions extends Command {
    static description = 'Aggregate extension translation files into per-locale barrel files';

    static examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> -d ./my-project',
        '<%= config.bin %> <%= command.id %> --silent',
    ];

    static flags = {
        ...commonFlags,
        silent: Flags.boolean({
            description: 'Suppress output',
            default: false,
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(AggregateExtensions);

        await aggregateExtensionLocales({
            projectDirectory: flags['project-directory'],
            silent: flags.silent,
        });
    }
}
