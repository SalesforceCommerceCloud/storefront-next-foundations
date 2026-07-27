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

import { Args, Flags } from '@oclif/core';
import { OAuthCommand } from '@salesforce/b2c-tooling-sdk/cli';
import { createScapiSchemasClient, toOrganizationId } from '@salesforce/b2c-tooling-sdk/clients';
import { mkdirSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join, relative, resolve, extname, basename } from 'node:path';
import YAML from 'yaml';
import { generateFromSchema } from '../../scapi/generate-types';
import {
    BUILT_IN_CLIENT_DEFAULTS,
    deriveBasePath,
    deriveClientKey,
    isBuiltInClientKey,
    writeSchemaMetadata,
} from '../../scapi/schema-utils';
import { generateCustomClientsFile } from '../../scapi/generate-custom-clients';

/**
 * Add a SCAPI client — either an override of a built-in SDK client (e.g., shopperProducts
 * with a richer schema that types `c_*` custom attributes) or a new custom API.
 *
 * Override vs custom is detected automatically from the derived `clientKey`: if it matches
 * a built-in client name (shopperProducts, shopperBaskets*, etc.), the entry overrides the
 * SDK client; otherwise it's added as a new custom API. Both flows generate the same files
 * and use the same registry — only the messaging and downstream type substitution differ.
 *
 * Supports two modes:
 * 1. **Local schema**: Provide `--schema` to generate from a local OpenAPI schema file.
 * 2. **Pull from API**: Provide positional args `<apiFamily> <apiName> <apiVersion>` to
 *    fetch the schema from the SCAPI Schemas API (requires OAuth credentials).
 *
 * @example
 * ```bash
 * # Override the built-in shopperProducts client with a schema that includes c_* attributes
 * sfnext scapi add --schema ./shopper-products-v1.yaml --name shopperProducts
 *
 * # Add a new custom API from a local schema file
 * sfnext scapi add --schema ./my-schemas/loyalty-api.yaml --name loyalty --base-path /custom/loyalty/v1
 *
 * # Pull from the SCAPI Schemas API
 * sfnext scapi add custom loyalty v1
 * ```
 *
 * @env SFCC_SHORTCODE - SCAPI short code (for API pull mode)
 * @env SFCC_TENANT_ID - Tenant ID (for API pull mode)
 * @env SFCC_OAUTH_CLIENT_ID - OAuth client ID (for API pull mode)
 * @env SFCC_OAUTH_CLIENT_SECRET - OAuth client secret (for API pull mode)
 */
export default class Add extends OAuthCommand<typeof Add> {
    static description = 'Add a SCAPI client override or a custom API, from a local schema or the SCAPI Schemas API';

    static examples = [
        '<%= config.bin %> <%= command.id %> --schema ./shopper-products-v1.yaml --name shopperProducts',
        '<%= config.bin %> <%= command.id %> --schema ./custom-api.yaml --name myCustomApi --base-path /custom/my-api/v1',
        '<%= config.bin %> <%= command.id %> custom loyalty v1',
        '<%= config.bin %> <%= command.id %> custom loyalty v1 --expand-custom-properties',
    ];

    static args = {
        apiFamily: Args.string({
            description: 'API family (e.g., custom) — for pulling from the SCAPI Schemas API',
            required: false,
        }),
        apiName: Args.string({
            description: 'API name (e.g., loyalty, store-inventory)',
            required: false,
        }),
        apiVersion: Args.string({
            description: 'API version (e.g., v1)',
            required: false,
        }),
    };

    static flags = {
        ...OAuthCommand.baseFlags,
        schema: Flags.string({
            description: 'Path to a local OpenAPI schema file (YAML or JSON)',
            exclusive: ['expand-custom-properties'],
        }),
        name: Flags.string({
            description:
                'Client key name (e.g., "loyalty", "storeInventory"). Defaults to camelCase of apiName when pulling.',
        }),
        'base-path': Flags.string({
            description: 'SCAPI base path prefix (auto-derived from schema if not provided)',
        }),
        'supports-locale': Flags.boolean({
            description: 'Whether this API supports the locale query parameter',
            allowNo: true,
        }),
        'expand-custom-properties': Flags.boolean({
            description: 'Include custom properties (c_*) in the schema (API pull only)',
            default: true,
            allowNo: true,
        }),
    };

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Add);
        const projectDir = flags['project-directory'] ?? process.cwd();
        const isPull = !flags.schema;

        if (isPull) {
            if (!args.apiFamily || !args.apiName || !args.apiVersion) {
                this.error(
                    'Provide either --schema for a local file, or <apiFamily> <apiName> <apiVersion> to pull from the API.'
                );
            }
        }

        let schemaPath: string;
        let schemaName: string;
        let clientKey: string;

        if (isPull) {
            const { apiFamily, apiName, apiVersion } = args as {
                apiFamily: string;
                apiName: string;
                apiVersion: string;
            };
            clientKey = flags.name ?? deriveClientKey(apiName, apiVersion);

            const { shortCode, tenantId } = this.resolvedConfig.values;
            if (!shortCode) {
                this.error(
                    'SCAPI short code required. Provide --short-code, set SFCC_SHORTCODE, or configure short-code in dw.json.'
                );
            }
            if (!tenantId) {
                this.error(
                    'tenant-id is required. Provide via --tenant-id flag, SFCC_TENANT_ID env var, or tenant-id in dw.json.'
                );
            }

            const organizationId = toOrganizationId(tenantId);
            const oauthStrategy = this.getOAuthStrategy();
            const client = createScapiSchemasClient({ shortCode, tenantId }, oauthStrategy);

            this.log(`Fetching schema: ${apiFamily}/${apiName}/${apiVersion}...`);

            const { data, error, response } = await client.GET(
                '/organizations/{organizationId}/schemas/{apiFamily}/{apiName}/{apiVersion}',
                {
                    params: {
                        path: { organizationId, apiFamily, apiName, apiVersion },
                        query: flags['expand-custom-properties'] ? { expand: 'custom_properties' } : {},
                    },
                }
            );

            if (error || !data) {
                this.error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
            }

            const scapiDir = join(projectDir, 'src', 'scapi');
            const schemasDir = join(scapiDir, 'schemas');
            mkdirSync(schemasDir, { recursive: true });

            schemaName = `${apiName}-${apiVersion}`;
            schemaPath = join(schemasDir, `${schemaName}.yaml`);
            writeFileSync(schemaPath, YAML.stringify(data as Record<string, unknown>), 'utf-8');
            this.log(`Saved schema to ${relative(projectDir, schemaPath)}`);
        } else {
            const schemaFlag = flags.schema;
            if (!schemaFlag) {
                throw new TypeError('Expected --schema when running in local schema mode.');
            }

            const schemaInput = resolve(projectDir, schemaFlag);
            if (!existsSync(schemaInput)) {
                this.error(`Schema file not found: ${schemaInput}`);
            }

            if (!flags.name) {
                this.error('--name is required when using --schema (e.g., --name loyalty)');
            }
            clientKey = flags.name;

            const ext = extname(schemaInput);
            schemaName = basename(schemaInput, ext);

            const scapiDir = join(projectDir, 'src', 'scapi');
            const schemasDir = join(scapiDir, 'schemas');
            mkdirSync(schemasDir, { recursive: true });

            schemaPath = join(schemasDir, `${schemaName}${ext}`);
            copyFileSync(schemaInput, schemaPath);
            this.log(`Copied schema to ${relative(projectDir, schemaPath)}`);
        }

        const scapiDir = join(projectDir, 'src', 'scapi');
        const generatedDir = join(scapiDir, 'generated');
        mkdirSync(generatedDir, { recursive: true });

        let basePath = flags['base-path'];
        if (!basePath) {
            basePath = deriveBasePath(schemaPath);
            if (!basePath) {
                if (isPull) {
                    const { apiFamily, apiName, apiVersion } = args as {
                        apiFamily: string;
                        apiName: string;
                        apiVersion: string;
                    };
                    basePath = `/${apiFamily}/${apiName}/${apiVersion}`;
                    this.log(`Constructed base path from API coordinates: ${basePath}`);
                } else {
                    this.error('Could not derive base path from schema. Please provide --base-path explicitly.');
                }
            } else {
                this.log(`Derived base path from schema: ${basePath}`);
            }
        }

        const kind = isBuiltInClientKey(clientKey) ? 'override' : 'custom';

        // For overrides, default locale-awareness from the runtime SDK's per-client
        // config so overriding e.g. shopperProducts doesn't silently lose locale
        // support. The user can still pass --supports-locale / --no-supports-locale.
        // Built-in SCAPI schemas embed /organizations/{organizationId} in their path
        // patterns, so overrides skip the runtime's org-prefix injection (the segment
        // comes from the ops map at request time). Custom APIs typically need the
        // injection because their schema paths don't include the org segment.
        const builtInDefaults = isBuiltInClientKey(clientKey) ? BUILT_IN_CLIENT_DEFAULTS[clientKey] : undefined;
        const supportsLocale = flags['supports-locale'] ?? builtInDefaults?.supportsLocale ?? false;
        const orgPrefix = builtInDefaults ? false : true;

        if (kind === 'override') {
            this.log(`Registering override for built-in client: ${clientKey}`);
            this.log(`  Inheriting SDK defaults: supportsLocale=${supportsLocale}, orgPrefix=${orgPrefix}`);
        } else {
            this.log(`Registering custom client: ${clientKey}`);
        }

        const schemasDir = join(scapiDir, 'schemas');
        writeSchemaMetadata(schemasDir, schemaName, {
            clientKey,
            basePath,
            supportsLocale,
            orgPrefix,
            kind,
        });

        this.log('Generating TypeScript types...');
        const { typesFile, operationsFile } = await generateFromSchema(schemaPath, generatedDir, schemaName);
        this.log(`Generated types: ${relative(projectDir, typesFile)}`);
        this.log(`Generated operations: ${relative(projectDir, operationsFile)}`);

        generateCustomClientsFile(scapiDir);
        this.log(`Updated ${relative(projectDir, join(scapiDir, 'custom-clients.ts'))}`);
        this.log(`Updated ${relative(projectDir, join(scapiDir, 'index.ts'))}`);

        if (kind === 'override') {
            this.log(`\nDone! Override for "${clientKey}" is ready.`);
            this.log(
                'Files importing SCAPI types from "@/scapi" will now see your schema. Any file ' +
                    'still importing from "@salesforce/storefront-next-runtime/scapi" will continue ' +
                    'to use the SDK schema; update the import to "@/scapi" to pick up the override.'
            );
        } else {
            this.log(`\nDone! Custom client "${clientKey}" is ready.`);
        }
    }
}
