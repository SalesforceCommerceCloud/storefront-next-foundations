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
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import type { ServerConfig } from './server-manager';
import { getEnvironmentConfig, applyEnvironmentConfig, type EnvironmentConfig } from './env-manager';
import { log } from '../../../../utils/logger';

export type TestMode = 'local' | 'remote' | 'auto';

export interface TestConfiguration {
    mode: TestMode;
    shouldStartDevServer: boolean;
    serverConfig?: ServerConfig;
    baseUrl?: string;
    siteId: string;
}

export interface CliOptions {
    mode: TestMode;
    baseUrl?: string;
    siteId?: string;
    playwrightHelp?: boolean;
    ai: boolean;
    verbose?: boolean;
    def?: boolean;
    skipDef?: boolean;
}

/**
 * ConfigProvider centralizes all configuration logic.
 *
 * Environment mutations are funnelled through `applyEnvironmentConfig()`
 * from env-manager.ts so they happen in one controlled place rather
 * than being scattered across the codebase.
 *
 * Responsibilities:
 * - Resolve test mode and environment
 * - Configure environment variables (via env-manager)
 * - Provide server configuration
 * - Validate configuration requirements
 */
export class ConfigProvider {
    private config: TestConfiguration | null = null;

    constructor(private options: CliOptions) {}

    /**
     * Initialize and return the test configuration.
     */
    initialize(): TestConfiguration {
        // Configure ts-node for CommonJS compilation
        applyEnvironmentConfig({ TS_NODE_PROJECT: 'tsconfig.codecept.json' });

        // Set AI and verbose flags
        this.configureFeatureFlags();

        // Initialize configuration
        this.config = this.initializeFromMode();

        // Verify CodeceptJS config exists
        this.validateCodeceptConfig();

        return this.config;
    }

    /**
     * Get the current configuration (must call initialize first).
     */
    getConfig(): TestConfiguration {
        if (!this.config) {
            throw new Error('Configuration not initialized. Call initialize() first.');
        }
        return this.config;
    }

    /**
     * Get a human-readable description of the current mode.
     */
    getModeDescription(): string {
        if (!this.config) {
            throw new Error('Configuration not initialized. Call initialize() first.');
        }

        const actualMode = this.config.mode;
        const baseUrl = this.config.baseUrl;

        const descriptions: Record<string, string> = {
            local: 'Local mode — starting dev server automatically',
            remote: `Remote mode — testing against ${baseUrl}`,
        };

        return descriptions[actualMode] || 'Unknown mode';
    }

    /**
     * Initialize configuration based on mode.
     */
    private initializeFromMode(): TestConfiguration {
        let mode = this.options.mode;

        // Validate mode
        if (!['local', 'remote', 'auto'].includes(mode)) {
            throw new Error(`Invalid mode: ${mode}. Must be one of: local, remote, auto`);
        }

        // Read current environment once
        const env = getEnvironmentConfig();

        // Check for conflicts when --mode is explicitly passed (not 'auto')
        if (mode !== 'auto') {
            this.warnOnModeConflicts(mode, env);
        }

        // Apply CLI overrides to environment in one batch
        applyEnvironmentConfig({
            BASE_URL: this.options.baseUrl,
            SITE_ID:
                this.options.siteId ??
                (env.siteId === 'RefArchGlobal' && !process.env.SITE_ID ? 'RefArchGlobal' : undefined),
        });

        // Auto mode: determine actual mode based on BASE_URL
        if (mode === 'auto') {
            const baseUrl = this.options.baseUrl || env.baseUrl;
            mode = baseUrl ? 'remote' : 'local';
        }

        // Configure mode-specific settings
        if (mode === 'local') {
            this.configureLocalMode(env.storefrontDevPort);
        } else if (mode === 'remote') {
            this.configureRemoteMode();
        }

        applyEnvironmentConfig({ TEST_MODE: mode });

        const shouldStartDevServer = mode === 'local';

        return {
            mode,
            shouldStartDevServer,
            serverConfig: shouldStartDevServer ? this.getServerConfig() : undefined,
            baseUrl: process.env.BASE_URL,
            siteId: process.env.SITE_ID || 'RefArchGlobal',
        };
    }

    /**
     * Configure local mode: set localhost URL, enable dev server.
     * When mode is explicitly 'local', always override BASE_URL to localhost.
     */
    private configureLocalMode(port: string): void {
        // Always set BASE_URL for local mode (overrides environment variable)
        applyEnvironmentConfig({
            BASE_URL: `http://localhost:${port}`,
        });

        applyEnvironmentConfig({ START_DEV_SERVER: 'true' });

        this.validateLocalEnvironment();
    }

    /**
     * Configure remote mode: validate BASE_URL, disable dev server.
     */
    private configureRemoteMode(): void {
        applyEnvironmentConfig({ START_DEV_SERVER: 'false' });

        const baseUrl = this.options.baseUrl || process.env.BASE_URL;
        if (!baseUrl) {
            throw new Error(
                'BASE_URL is required for remote mode.\n\n' +
                    'Usage:\n' +
                    '  BASE_URL=https://your-site.com pnpm test --mode=remote\n' +
                    '  or\n' +
                    '  pnpm test --mode=remote --base-url=https://your-site.com'
            );
        }

        this.validateRemoteUrl(baseUrl);
    }

    /**
     * Configure AI and verbose feature flags.
     */
    private configureFeatureFlags(): void {
        if (this.options.ai) {
            applyEnvironmentConfig({
                CODECEPT_AI: 'true',
                DEBUG: 'codeceptjs:ai',
            });
        } else {
            applyEnvironmentConfig({
                CODECEPT_AI: 'false',
            });
        }

        if (this.options.verbose) {
            applyEnvironmentConfig({ VERBOSE: 'true' });
        }
    }

    /**
     * Validate local environment (storefront app exists).
     */
    private validateLocalEnvironment(): void {
        const { storefrontAppPath } = getEnvironmentConfig();
        const resolvedPath = resolve(process.cwd(), storefrontAppPath);

        if (!existsSync(resolvedPath)) {
            throw new Error(
                `Storefront application not found at: ${resolvedPath}\n` +
                    `Please ensure the storefront package exists or set STOREFRONT_APP_PATH environment variable.`
            );
        }

        const packageJsonPath = join(resolvedPath, 'package.json');
        if (!existsSync(packageJsonPath)) {
            throw new Error(
                `No package.json found at: ${packageJsonPath}\n` +
                    `The storefront directory must be a valid npm package.`
            );
        }
    }

    /**
     * Validate remote URL is properly formatted.
     */
    private validateRemoteUrl(url: string): void {
        try {
            new URL(url);
        } catch {
            throw new Error(`Invalid BASE_URL: ${url}\n` + `Please provide a valid URL (e.g., https://your-site.com)`);
        }
    }

    /**
     * Get server configuration from environment variables.
     */
    private getServerConfig(): ServerConfig {
        const { storefrontDevPort, storefrontAppPath } = getEnvironmentConfig();

        return {
            command: 'pnpm dev',
            cwd: join(process.cwd(), storefrontAppPath),
            url: `http://localhost:${storefrontDevPort}`,
            timeout: 120 * 1_000, // 2 minutes
        };
    }

    /**
     * Verify CodeceptJS config exists.
     */
    private validateCodeceptConfig(): void {
        const configPath = resolve(process.cwd(), 'codecept.conf.cjs');
        if (!existsSync(configPath)) {
            throw new Error(
                `CodeceptJS configuration file not found: ${configPath}\n` +
                    `Please ensure you're running this command from the e2e package directory.`
            );
        }
    }

    /**
     * Warn when explicit --mode flag conflicts with environment variables.
     * The CLI flag takes priority, but we inform the user about the override.
     */
    private warnOnModeConflicts(explicitMode: TestMode, env: EnvironmentConfig): void {
        // Warn if --mode=local but BASE_URL is set in environment (not from CLI)
        if (explicitMode === 'local' && env.baseUrl && !this.options.baseUrl) {
            log.warn(
                `Explicit --mode=local flag detected, but BASE_URL is set to '${env.baseUrl}' in environment.\n` +
                    `  The --mode flag takes priority — running against local dev server (http://localhost:${env.storefrontDevPort}).\n` +
                    `  To test against the remote URL, use --mode=remote or remove the --mode flag.`
            );
        }

        // Warn if --mode=remote but no BASE_URL is provided anywhere
        if (explicitMode === 'remote' && !this.options.baseUrl && !env.baseUrl) {
            // This will be caught by configureRemoteMode(), but we can provide early warning
            log.warn(
                `Explicit --mode=remote flag detected, but no BASE_URL is configured.\n` +
                    `  You must provide BASE_URL via environment variable or --base-url flag.`
            );
        }
    }
}
