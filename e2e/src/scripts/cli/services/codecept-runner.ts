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
import { type ChildProcess, type SpawnOptions } from 'child_process';
import spawn from 'cross-spawn';
import { join } from 'path';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { log } from '../../../../utils/logger';

export interface CodeceptRunOptions {
    verbose?: boolean;
    configPath?: string;
    additionalArgs?: string[];
}

/**
 * Result from a completed child process.
 */
export interface SpawnResult {
    code: number;
    stdout: string;
    stderr: string;
}

/**
 * Error thrown when a spawned process exits with a non-zero code.
 */
export class SpawnError extends Error {
    constructor(
        message: string,
        public readonly code: number,
        public readonly stdout: string,
        public readonly stderr: string
    ) {
        super(message);
        this.name = 'SpawnError';
    }
}

/**
 * Options for spawnAsync — extends Node's SpawnOptions with CLI-specific flags.
 */
export interface SpawnAsyncOptions extends SpawnOptions {
    /** Suppress stdout/stderr forwarding to the parent process. Default: true (silent). */
    silent?: boolean;
}

/**
 * Spawn a child process and return a promise that resolves on successful exit.
 *
 * Captures stdout and stderr. Rejects with a SpawnError on non-zero exit
 * or if the process fails to start.
 */
function spawnAsync(command: string, args: string[], options: SpawnAsyncOptions = {}): Promise<SpawnResult> {
    const { silent = true, ...spawnOpts } = options;

    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, {
            cwd: process.cwd(),
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
            ...spawnOpts,
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data: Buffer) => {
            const text = data.toString();
            stdout += text;
            if (!silent) {
                process.stdout.write(text);
            }
        });

        proc.stderr?.on('data', (data: Buffer) => {
            const text = data.toString();
            stderr += text;
            if (!silent) {
                process.stderr.write(text);
            }
        });

        proc.on('error', (error) => {
            log.error(`Failed to spawn ${command}: ${error.message}`);
            reject(new SpawnError(`Failed to spawn ${command}: ${error.message}`, 1, stdout, stderr));
        });

        proc.on('exit', (code) => {
            const exitCode = code ?? 1;
            if (exitCode !== 0) {
                reject(
                    new SpawnError(
                        `${command} exited with code ${exitCode}${stderr ? `\n${stderr.trim()}` : ''}`,
                        exitCode,
                        stdout,
                        stderr
                    )
                );
            } else {
                resolve({ code: exitCode, stdout, stderr });
            }
        });
    });
}

/**
 * Spawn a child process in the foreground (inheriting stdio).
 *
 * Returns the raw ChildProcess so the caller can attach lifecycle
 * listeners (e.g. `on('exit')`, `on('error')`).
 */
function spawnForeground(command: string, args: string[], options: SpawnOptions = {}): ChildProcess {
    return spawn(command, args, {
        stdio: 'inherit',
        env: process.env,
        ...options,
    });
}

/**
 * CodeceptRunner handles execution of CodeceptJS commands
 *
 * Responsibilities:
 * - Generate TypeScript definitions (codeceptjs def)
 * - Post-generation cleanup of steps.d.ts
 * - Build and execute CodeceptJS test commands
 * - Handle process lifecycle and cleanup
 * - Process spawning utilities (consolidated from spawn-helper.ts)
 */
export class CodeceptRunner {
    private process: ChildProcess | null = null;

    /**
     * Generate TypeScript definitions for CodeceptJS.
     *
     * After generation, performs cleanup on steps.d.ts:
     * - Removes the legacy `/// <reference types='codeceptjs' />` tag
     *   so type resolution is handled solely by tsconfig.json.
     */
    async generateDefinitions(): Promise<void> {
        const { stdout } = await spawnAsync('codeceptjs', ['def', '-c', 'codecept.conf.cjs']);

        if (stdout.includes('Definitions were generated')) {
            log.success('TypeScript definitions updated');
        }

        // Post-generation cleanup: strip legacy reference tag from steps.d.ts
        await this.cleanupDefinitions();
    }

    /**
     * Run CodeceptJS tests with the specified options.
     * Returns the spawned process for lifecycle management.
     */
    run(options: CodeceptRunOptions): ChildProcess {
        const args = this.buildCommandArgs(options);

        // Note: CODECEPT_AI environment variable is already set by ConfigProvider.configureFeatureFlags()
        // No need to set it here - the value comes from the environment

        log.command(`codeceptjs ${args.join(' ')}`);

        this.process = spawnForeground('codeceptjs', args);

        return this.process;
    }

    /**
     * Kill the running CodeceptJS process.
     */
    kill(signal: NodeJS.Signals = 'SIGTERM'): void {
        if (this.process) {
            this.process.kill(signal);
            this.process = null;
        }
    }

    /**
     * Remove the legacy `/// <reference types='codeceptjs' />` directive
     * from the generated steps.d.ts so that type resolution is managed
     * entirely through tsconfig.json.
     */
    private async cleanupDefinitions(): Promise<void> {
        const dtsPath = join(process.cwd(), 'steps.d.ts');
        if (!existsSync(dtsPath)) {
            return;
        }

        const content = await readFile(dtsPath, 'utf8');
        const cleaned = content.replace(/\/\/\/ <reference types='codeceptjs' \/>\r?\n/g, '');

        if (cleaned !== content) {
            await writeFile(dtsPath, cleaned);
            log.step('Removed legacy reference tag from steps.d.ts');
        }
    }

    /**
     * Build the command-line arguments for CodeceptJS.
     */
    private buildCommandArgs(options: CodeceptRunOptions): string[] {
        const workers = parseInt(process.env.WORKERS ?? '', 10) || 1;
        const args = workers > 1 ? ['run-workers', String(workers)] : ['run'];

        // Add config file
        const configPath = options.configPath || 'codecept.conf.cjs';
        args.push('-c', configPath);

        // Add AI flag if enabled (controlled by CODECEPT_AI env var set by ConfigProvider)
        if (process.env.CODECEPT_AI === 'true') {
            args.push('--ai');
        }

        // Add verbose flag
        if (options.verbose) {
            args.push('--verbose');
        }

        // Add any additional arguments (grep, grep-invert, tests, etc.)
        if (options.additionalArgs && options.additionalArgs.length > 0) {
            args.push(...options.additionalArgs);
        }

        return args;
    }
}

// Export spawn utilities for use in test-runner.ts
// Note: SpawnError, SpawnResult, and SpawnAsyncOptions are already exported above, so we don't re-export them here
export { spawnForeground, spawnAsync };
