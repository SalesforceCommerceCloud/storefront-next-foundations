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

import { Flags } from '@oclif/core';
import { MrtCommand } from '@salesforce/b2c-tooling-sdk/cli';
import fs from 'fs-extra';
import { createBundle } from '../bundle';
import {
    buildMrtConfig,
    CARTRIDGES_BASE_DIR,
    SFNEXT_BASE_CARTRIDGE_NAME,
    SFNEXT_BASE_CARTRIDGE_OUTPUT_DIR,
    GENERATE_AND_DEPLOY_CARTRIDGE_ON_MRT_PUSH,
} from '../config';
import { getDefaultBuildDir, getDefaultMessage } from '../utils';
import { generateMetadata } from '../cartridge-services/generate-cartridge';
import { uploadCartridges, type CartridgeMapping } from '@salesforce/b2c-tooling-sdk/operations/code';
import { uploadBundle, waitForEnv } from '@salesforce/b2c-tooling-sdk/operations/mrt';
import { createMrtClient, DEFAULT_MRT_ORIGIN } from '@salesforce/b2c-tooling-sdk/clients';
import path from 'path';

/**
 * MRT Push command - builds and pushes bundle to Managed Runtime.
 *
 * Inherits MRT flags from MrtCommand:
 * - --api-key: MRT API key (env: MRT_API_KEY, fallback: SFCC_MRT_API_KEY)
 * - --project/-p: MRT project slug (env: MRT_PROJECT, fallback: SFCC_MRT_PROJECT)
 * - --environment/-e: MRT target environment (env: MRT_TARGET, fallback: SFCC_MRT_ENVIRONMENT)
 * - --cloud-origin: MRT cloud origin URL (env: MRT_CLOUD_ORIGIN, fallback: SFCC_MRT_CLOUD_ORIGIN)
 * - --credentials-file: Path to MRT credentials file (env: MRT_CREDENTIALS_FILE)
 * - --config: Path to dw.json config file (env: SFCC_CONFIG)
 * - --instance/-i: Named instance from config (env: SFCC_INSTANCE)
 */
export default class Push extends MrtCommand<typeof Push> {
    static description = 'Build and push bundle to Managed Runtime';

    static examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> --project-directory ./my-project',
        '<%= config.bin %> <%= command.id %> --project my-project --environment staging',
        '<%= config.bin %> <%= command.id %> --wait',
    ];

    static flags = {
        ...MrtCommand.baseFlags,
        'build-directory': Flags.string({
            char: 'b',
            description: 'Build directory to push (default: auto-detected)',
        }),
        message: Flags.string({
            char: 'm',
            description: 'Bundle message (default: git branch:commit)',
        }),
        wait: Flags.boolean({
            char: 'w',
            description: 'Wait for deployment to complete',
            default: false,
        }),
        'project-slug': Flags.string({
            char: 's',
            description: 'DEPRECATED: Use --project instead',
            hidden: true,
        }),
        target: Flags.string({
            char: 't',
            description: 'DEPRECATED: Use --environment instead',
            hidden: true,
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Push);
        const projectDirectory = flags['project-directory'] || process.cwd();

        // Deprecated alias handling
        if (flags['project-slug']) {
            this.warn('Flag --project-slug is deprecated. Use --project instead.');
        }
        if (flags.target) {
            this.warn('Flag --target is deprecated. Use --environment instead.');
        }

        // Precedence: CLI flag > MRT_* env > SFCC_MRT_* env (fallback) > dw.json
        // flags.environment includes all oclif-resolved sources; resolvedConfig adds dw.json
        const target = flags.environment || flags.target || this.resolvedConfig.values.mrtEnvironment;

        // Input validation
        if (flags.wait && !target) {
            this.error(
                'You must provide a target environment when using --wait (via --environment flag, MRT_TARGET env var, or dw.json)'
            );
        }

        // Validate project directory exists
        if (!fs.existsSync(projectDirectory)) {
            this.error(`Project directory "${projectDirectory}" does not exist!`);
        }

        // Precedence: CLI flag > MRT_* env > SFCC_MRT_* env (fallback) > dw.json
        const projectSlug = flags.project || flags['project-slug'] || this.resolvedConfig.values.mrtProject;
        if (!projectSlug || projectSlug.trim() === '') {
            this.error(
                'Project slug is required. Provide --project, set MRT_PROJECT env var, or configure mrtProject in dw.json'
            );
        }

        // Set default build directory and validate it exists
        const buildDirectory = flags['build-directory'] ?? getDefaultBuildDir(projectDirectory);
        if (!fs.existsSync(buildDirectory)) {
            this.error(`Build directory "${buildDirectory}" does not exist!`);
        }

        // Optionally generate and deploy cartridge metadata before MRT push
        if (GENERATE_AND_DEPLOY_CARTRIDGE_ON_MRT_PUSH) {
            await this.generateAndDeployCartridge(projectDirectory);
        }

        // Set deployment target environment variable
        if (target) {
            process.env.DEPLOY_TARGET = target;
        }

        // Require MRT credentials (API key from --api-key, env var, or credentials file)
        this.requireMrtCredentials();

        // Build SSR configuration for MRT bundle
        const config = await buildMrtConfig(buildDirectory, projectDirectory);

        // Set default message
        const message = flags.message ?? getDefaultMessage(projectDirectory);

        this.log(`Creating bundle for project: ${projectSlug}`);
        if (target) {
            this.log(`Target environment: ${target}`);
        }

        // Create bundle
        const bundle = await createBundle({
            message,
            ssr_parameters: config.ssrParameters,
            ssr_only: config.ssrOnly,
            ssr_shared: config.ssrShared,
            buildDirectory,
            projectDirectory,
            projectSlug,
        });

        // Create MRT client and upload bundle
        const origin = this.resolvedConfig.values.mrtOrigin || DEFAULT_MRT_ORIGIN;
        const client = createMrtClient({ origin }, this.getMrtAuth());

        this.log(`Uploading bundle to ${origin}`);
        const result = await uploadBundle(client, projectSlug, bundle, target);
        this.log(`Bundle ${result.bundleId} uploaded`);

        // Surface any non-blocking warnings the MRT backend returned for this deploy
        // (e.g. the x86 environment deprecation notice). `this.warn` prints to stderr in
        // yellow and does not throw, so the push still succeeds.
        // The `warnings` field is being added to the SDK's `PushResult` in
        // b2c-developer-tooling#509; cast until that SDK version is published and bumped here.
        const warnings = (result as { warnings?: string[] }).warnings ?? [];
        for (const w of warnings) {
            this.warn(w);
        }

        if (flags.wait && target) {
            this.log(`Waiting for deployment to ${target}...`);
            let lastState = '';
            await waitForEnv(
                {
                    projectSlug,
                    slug: target,
                    origin,
                    onPoll: (info) => {
                        if (info.state !== lastState) {
                            lastState = info.state;
                            this.log(`  ${target}: ${info.state} (${info.elapsedSeconds}s)`);
                        }
                    },
                },
                this.getMrtAuth()
            );
            this.log(`Deployment complete — bundle ${result.bundleId} is live on ${target}`);
        }
    }

    /**
     * Generate and deploy cartridge metadata to B2C instance.
     * This is a pre-MRT-push step that ensures Page Designer metadata is current.
     */
    private async generateAndDeployCartridge(projectDirectory: string): Promise<void> {
        const metadataDir = path.join(projectDirectory, CARTRIDGES_BASE_DIR, SFNEXT_BASE_CARTRIDGE_OUTPUT_DIR);

        try {
            this.log('Generating cartridge metadata before MRT push...');

            // Ensure the metadata directory exists
            if (!fs.existsSync(metadataDir)) {
                fs.mkdirSync(metadataDir, { recursive: true });
            }

            await generateMetadata(projectDirectory, metadataDir);
            this.log('Cartridge metadata generated successfully!');

            this.log('Deploying cartridge to Commerce Cloud...');

            if (!this.resolvedConfig.hasB2CInstanceConfig()) {
                this.warn('B2C instance not configured, skipping cartridge deployment');
                return;
            }

            if (!this.resolvedConfig.values.codeVersion) {
                this.warn('Code version not configured, skipping cartridge deployment');
                return;
            }

            const instance = this.resolvedConfig.createB2CInstance();
            const cartridgeSrc = path.join(projectDirectory, CARTRIDGES_BASE_DIR, SFNEXT_BASE_CARTRIDGE_NAME);
            const cartridges: CartridgeMapping[] = [
                {
                    name: SFNEXT_BASE_CARTRIDGE_NAME,
                    src: cartridgeSrc,
                    dest: SFNEXT_BASE_CARTRIDGE_NAME,
                },
            ];

            await uploadCartridges(instance, cartridges);
            this.log('Cartridge deployed successfully!');
        } catch (cartridgeError) {
            // Don't fail the push if cartridge generation/deployment fails
            this.warn(`Failed to generate or deploy cartridge: ${(cartridgeError as Error).message}`);
        }
    }
}
