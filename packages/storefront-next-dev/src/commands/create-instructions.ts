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
import path from 'path';
import { fileURLToPath } from 'url';
import { generateInstructions } from '../extensibility/create-instructions';

// Get the directory of this command file for resolving template paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create instructions command - generates LLM instructions for installing/uninstalling extensions.
 */
export default class CreateInstructions extends Command {
    static description =
        'Generate LLM instructions using prompt templating for installing and uninstalling Storefront Next feature extensions';

    static examples = [
        '<%= config.bin %> <%= command.id %> -d ./my-project -c ./extension.json -e SFDC_EXT_FEATURE',
        '<%= config.bin %> <%= command.id %> -d . -c config.json -e SFDC_EXT_STORE_LOCATOR -o ./docs',
    ];

    static flags = {
        'project-directory': Flags.string({
            char: 'd',
            description: 'Project directory',
            required: true,
        }),
        'extension-config': Flags.string({
            char: 'c',
            description: 'Extension config JSON file location',
            required: true,
        }),
        extension: Flags.string({
            char: 'e',
            description: 'Extension marker value (e.g. SFDC_EXT_featureA)',
            required: true,
        }),
        'template-repo': Flags.string({
            char: 'p',
            description:
                'Storefront template repo URL (default: https://github.com/SalesforceCommerceCloud/storefront-next-template.git)',
        }),
        branch: Flags.string({
            char: 'b',
            description: 'Storefront template repo branch (default: main)',
        }),
        files: Flags.string({
            char: 'f',
            description: 'Specific files to include (relative to project directory), comma-separated',
        }),
        'output-dir': Flags.string({
            char: 'o',
            description: 'Output directory (default: ./instructions)',
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(CreateInstructions);

        const baseDir = process.cwd();
        // These flags are required, so they're guaranteed to be defined
        const projectDirectory = path.resolve(baseDir, flags['project-directory']);
        const extensionConfig = path.resolve(baseDir, flags['extension-config']);
        const extension = flags.extension;
        const files = flags.files ? flags.files.split(',').map((f) => f.trim()) : undefined;

        const templatesDir = path.resolve(__dirname, '../extensibility/templates');

        generateInstructions(
            projectDirectory,
            extension,
            flags['output-dir'] ?? './instructions',
            flags['template-repo'],
            flags.branch,
            files,
            extensionConfig,
            templatesDir
        );

        this.log('Instructions generated successfully!');
    }
}
