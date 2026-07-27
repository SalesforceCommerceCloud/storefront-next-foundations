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
import { Command } from 'commander';
import {
    DEFAULT_MODE,
    CLI_NAME,
    CLI_DESCRIPTION,
    CLI_VERSION,
    CLI_USAGE,
    MODE_OPTION_DESCRIPTION,
    BASE_URL_OPTION_DESCRIPTION,
    SITE_ID_OPTION_DESCRIPTION,
    PLAYWRIGHT_HELP_OPTION_DESCRIPTION,
    ADDITIONAL_HELP_TEXT,
    PLAYWRIGHT_HELP_HEADER,
} from '../constants';
import { ServerManager, type ServerConfig } from '../services/server-manager';
import { waitUntilReachable } from './url-reachability';
import { CodeceptRunner, spawnForeground } from '../services/codecept-runner';
import { ConfigProvider, type CliOptions } from '../services/config-provider';
import { ProcessLifecycle } from '../services/process-orchestrator';
import { ArgumentParser } from '../services/arguments-parser';
import { log } from '../../../../utils/logger';

/**
 * Create and configure the CLI program.
 */
export function createProgram(): Command {
    const program = new Command();

    program
        .name(CLI_NAME)
        .description(CLI_DESCRIPTION)
        .usage(CLI_USAGE)
        .version(CLI_VERSION)
        .option('--mode <mode>', MODE_OPTION_DESCRIPTION, DEFAULT_MODE)
        .option('--base-url <url>', BASE_URL_OPTION_DESCRIPTION)
        .option('--site-id <id>', SITE_ID_OPTION_DESCRIPTION)
        .option('--ai', 'Enable AI features (self-healing, page object generation)')
        .option('--no-ai', 'Disable AI features (default)')
        .option('--verbose', 'Enable verbose output')
        .option('--def', 'Generate TypeScript definitions and exit')
        .option('--skip-def', 'Skip automatic TypeScript definition generation')
        .option('--playwright-help', PLAYWRIGHT_HELP_OPTION_DESCRIPTION)
        .addHelpText('after', ADDITIONAL_HELP_TEXT)
        .allowUnknownOption() // Allow CodeceptJS/Playwright options to pass through
        .allowExcessArguments() // Allow CodeceptJS/Playwright arguments to pass through
        .passThroughOptions(); // Pass through unknown options to child process

    return program;
}

/**
 * Handle --def flag to generate TypeScript definitions.
 */
export async function handleDefFlag(): Promise<void> {
    log.step('Generating TypeScript definitions...');
    try {
        const runner = new CodeceptRunner();
        await runner.generateDefinitions();
        log.success('TypeScript definitions generated successfully');
        log.hint('TypeScript definitions are auto-generated before each test run');
    } catch (error) {
        log.error(
            `Failed to generate TypeScript definitions: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exit(1);
    }
}

/**
 * Handle --playwright-help flag.
 */
export function handlePlaywrightHelp(): void {
    log.raw(PLAYWRIGHT_HELP_HEADER);
    const playwrightProcess = spawnForeground('playwright', ['test', '--help']);
    playwrightProcess.on('exit', (code) => {
        process.exit(code || 0);
    });
}

/**
 * Main test flow orchestration.
 */
export async function runTestFlow(options: CliOptions): Promise<void> {
    // Initialize process lifecycle management (handlers registered in constructor)
    const lifecycle = new ProcessLifecycle();

    // Initialize configuration (includes validation)
    const configProvider = new ConfigProvider(options);
    const config = configProvider.initialize();

    // Display configuration information
    displayConfigInfo(configProvider, options);

    // Pre-flight reachability check for remote mode. Poll rather than probe
    // once: a freshly deployed MRT bundle can report ACTIVE via the Admin API
    // before its external edge starts serving, so a single probe races the
    // deployment and the run fails spuriously (then process.exit(1)) even
    // though the bundle is fine. Polling absorbs that propagation lag, then
    // fails with a clear message if the server genuinely never comes up.
    if (config.mode === 'remote' && config.baseUrl) {
        const reachable = await waitUntilReachable(config.baseUrl);
        if (!reachable) {
            log.error(`Server at ${config.baseUrl} is not reachable. Make sure your dev server is running.`);
            process.exit(1);
        }
    }

    // Auto-generate TypeScript definitions (unless skipped)
    if (!options.skipDef) {
        await generateDefinitions(lifecycle);
    } else {
        log.info('Skipping TypeScript definition generation');
    }

    // Start dev server if needed
    if (config.shouldStartDevServer && config.serverConfig) {
        await startServer(config.serverConfig, lifecycle);
    }

    // Run CodeceptJS tests
    runTests(lifecycle, options);
}

/**
 * Display configuration information.
 */
function displayConfigInfo(configProvider: ConfigProvider, options: CliOptions): void {
    log.info(configProvider.getModeDescription());
    log.info('Using CodeceptJS configuration: codecept.conf.cjs');

    if (options.ai) {
        log.info('AI features enabled via --ai flag (self-healing, page object generation)');
        log.info('Debug logging enabled for AI decisions');
    }
}

/**
 * Generate TypeScript definitions.
 */
async function generateDefinitions(lifecycle: ProcessLifecycle): Promise<void> {
    log.step('Auto-generating TypeScript definitions...');
    try {
        const runner = lifecycle.getRunner();
        await runner.generateDefinitions();
    } catch (error) {
        log.error(
            `Failed to generate TypeScript definitions: ${error instanceof Error ? error.message : String(error)}`
        );
        log.hint('Use --skip-def to bypass automatic definition generation');
        process.exit(1);
    }
}

/**
 * Start the development server.
 */
async function startServer(serverConfig: ServerConfig, lifecycle: ProcessLifecycle): Promise<void> {
    try {
        const serverManager = new ServerManager(serverConfig);
        lifecycle.registerServer(serverManager);
        await serverManager.start();
    } catch (error) {
        log.error(`Failed to start dev server: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

/**
 * Run CodeceptJS tests.
 */
function runTests(lifecycle: ProcessLifecycle, options: CliOptions): void {
    const runner = lifecycle.getRunner();

    // Get pass-through arguments for CodeceptJS
    const passThroughArgs = ArgumentParser.getPassThroughArgs();

    // Run tests
    const codeceptProcess = runner.run({
        verbose: options.verbose,
        additionalArgs: passThroughArgs,
    });

    // Handle process exit
    codeceptProcess.on('exit', (code) => {
        lifecycle.cleanup();
        process.exit(code || 0);
    });

    // Handle errors
    codeceptProcess.on('error', (error) => {
        log.error('Failed to execute CodeceptJS');
        log.error(error.message);
        log.hint('Make sure CodeceptJS is installed: pnpm install');
        lifecycle.cleanup();
        process.exit(1);
    });
}
