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
import { join } from 'node:path';
import { commonFlags } from '../../flags';
import { isBuiltInClientKey, readAllSchemaMetadata, type SchemaMetadata } from '../../scapi/schema-utils';

type Entry = SchemaMetadata & { schemaName: string };

function entryKind(entry: Entry): 'override' | 'custom' {
    return entry.kind ?? (isBuiltInClientKey(entry.clientKey) ? 'override' : 'custom');
}

/**
 * List registered SCAPI client overrides and custom APIs.
 */
export default class List extends Command {
    static description = 'List registered SCAPI client overrides and custom APIs';

    static examples = ['<%= config.bin %> <%= command.id %>', '<%= config.bin %> <%= command.id %> -d ./my-project'];

    static flags = {
        ...commonFlags,
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(List);
        const projectDir = flags['project-directory'];
        const schemasDir = join(projectDir, 'src', 'scapi', 'schemas');

        const entries = readAllSchemaMetadata(schemasDir);

        if (entries.length === 0) {
            this.log('No SCAPI client overrides or custom APIs registered.');
            this.log('Use `sfnext scapi add` to add one.');
            return;
        }

        const overrides = entries.filter((e) => entryKind(e) === 'override');
        const customs = entries.filter((e) => entryKind(e) === 'custom');

        this.log(`\nRegistered SCAPI clients (${entries.length}):`);

        if (overrides.length > 0) {
            this.log(`\nOverrides (${overrides.length}):\n`);
            for (const e of overrides) this.printEntry(e);
        }

        if (customs.length > 0) {
            this.log(`\nCustom APIs (${customs.length}):\n`);
            for (const e of customs) this.printEntry(e);
        }
    }

    private printEntry({ clientKey, basePath, supportsLocale, schemaName }: Entry): void {
        this.log(`  ${clientKey}`);
        this.log(`    Schema:  schemas/${schemaName}.yaml`);
        this.log(`    Base:    ${basePath}`);
        this.log(`    Locale:  ${supportsLocale ? 'yes' : 'no'}`);
        this.log('');
    }
}
