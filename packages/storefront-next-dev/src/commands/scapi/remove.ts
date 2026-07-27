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

import { Args, Command } from '@oclif/core';
import { existsSync, unlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { commonFlags } from '../../flags';
import { readAllSchemaMetadata } from '../../scapi/schema-utils';
import { generateCustomClientsFile } from '../../scapi/generate-custom-clients';

/**
 * Remove a registered custom SCAPI client.
 */
export default class Remove extends Command {
    static description = 'Remove a registered custom SCAPI client';

    static examples = [
        '<%= config.bin %> <%= command.id %> loyalty',
        '<%= config.bin %> <%= command.id %> myCustomApi -d ./my-project',
    ];

    static args = {
        name: Args.string({
            description: 'Client key name to remove (e.g., "loyalty" or "storeInventory")',
            required: true,
        }),
    };

    static flags = {
        ...commonFlags,
    };

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Remove);
        const projectDir = flags['project-directory'];
        const clientKey = args.name;

        const scapiDir = join(projectDir, 'src', 'scapi');
        const schemasDir = join(scapiDir, 'schemas');
        const generatedDir = join(scapiDir, 'generated');

        const entries = readAllSchemaMetadata(schemasDir);
        const entry = entries.find((e) => e.clientKey === clientKey);

        if (!entry) {
            this.error(
                `No registered client found with key "${clientKey}". Run \`sfnext scapi list\` to see registered clients.`
            );
        }

        const { schemaName } = entry;

        for (const ext of ['.yaml', '.yml', '.json']) {
            const schemaPath = join(schemasDir, `${schemaName}${ext}`);
            if (existsSync(schemaPath)) {
                unlinkSync(schemaPath);
                this.log(`Removed ${relative(projectDir, schemaPath)}`);
            }
        }

        const metaPath = join(schemasDir, `${schemaName}.meta.json`);
        if (existsSync(metaPath)) {
            unlinkSync(metaPath);
        }

        const typesPath = join(generatedDir, `${schemaName}.ts`);
        const opsPath = join(generatedDir, `${schemaName}.operations.ts`);
        const namespacePath = join(generatedDir, `${schemaName}.namespace.ts`);
        for (const filePath of [typesPath, opsPath, namespacePath]) {
            if (existsSync(filePath)) {
                unlinkSync(filePath);
                this.log(`Removed ${relative(projectDir, filePath)}`);
            }
        }

        generateCustomClientsFile(scapiDir);
        this.log(`Updated ${relative(projectDir, join(scapiDir, 'custom-clients.ts'))}`);
        this.log(`Updated ${relative(projectDir, join(scapiDir, 'index.ts'))}`);

        this.log(`\nRemoved client "${clientKey}".`);
    }
}
