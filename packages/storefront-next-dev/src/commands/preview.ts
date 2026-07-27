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
import { preview } from '../lib/preview';
import { commonFlags } from '../flags';

/**
 * Preview server command - starts the preview server with production build.
 */
export default class Preview extends Command {
    static description = 'Start preview server with production build (auto-builds if needed)';

    static examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> -d ./my-project -p 4000',
    ];

    static flags = {
        ...commonFlags,
        port: Flags.integer({
            char: 'p',
            description: 'Port number (default: 3000)',
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Preview);

        await preview({
            projectDirectory: flags['project-directory'],
            port: flags.port,
        });
    }
}
