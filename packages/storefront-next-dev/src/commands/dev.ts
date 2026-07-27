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
import { dev } from '../lib/dev';
import { commonFlags } from '../flags';

/**
 * Dev server command - starts the Vite development server with SSR.
 */
export default class Dev extends Command {
    static description = 'Start Vite development server with SSR';

    static examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> -d ./my-project -p 3000',
    ];

    static flags = {
        ...commonFlags,
        port: Flags.integer({
            char: 'p',
            description: 'Port number (default: 5173)',
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Dev);

        await dev({
            projectDirectory: flags['project-directory'],
            port: flags.port,
        });
    }
}
