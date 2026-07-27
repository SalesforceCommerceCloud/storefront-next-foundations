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
import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import waitOn from 'wait-on';
import { log } from '../../../../utils/logger';
import { getEnvironmentConfig } from './env-manager';
import { checkUrl, POLL_INTERVAL_MS } from '../helpers/url-reachability';

export interface ServerConfig {
    command: string;
    cwd: string;
    url: string;
    timeout: number;
}

/** Maximum time to wait for server to become ready (in milliseconds). */
const HEALTH_CHECK_TIMEOUT_MS = 20_000; // 20 seconds (20 retries × 1s)

/**
 * ServerManager handles the lifecycle of the development server
 *
 * Responsibilities:
 * - Start and stop the dev server process
 * - Robust health-check polling to verify server availability
 * - Prevent duplicate server starts
 */
export class ServerManager {
    private process: ChildProcess | null = null;

    constructor(private config: ServerConfig) {}

    /**
     * Start the development server.
     * Checks if server is already running before starting a new one.
     */
    async start(): Promise<void> {
        // Validate working directory exists
        if (!existsSync(this.config.cwd)) {
            throw new Error(`Working directory does not exist: ${this.config.cwd}`);
        }

        // Check if server is already reachable
        if (await this.checkServerHealth()) {
            log.success(`Server already running at ${this.config.url}`);
            return;
        }

        return this.startServerProcess();
    }

    /**
     * Stop the development server gracefully.
     * Kills the entire process group (shell + pnpm + vite) so no orphan processes remain.
     */
    stop(): void {
        if (this.process) {
            log.step('Stopping dev server...');
            const pid = this.process.pid;
            if (pid !== undefined) {
                try {
                    // Kill the entire process group spawned with detached: true.
                    // Negative PID targets all processes in the group (shell + pnpm + vite).
                    process.kill(-pid, 'SIGTERM');
                } catch {
                    // Fallback if process group kill fails (e.g. already exited)
                    this.process.kill('SIGTERM');
                }
            } else {
                this.process.kill('SIGTERM');
            }
            this.process = null;
        }
    }

    /**
     * Single health-check for this server's configured URL.
     */
    private checkServerHealth(): Promise<boolean> {
        return checkUrl(this.config.url);
    }

    /**
     * Wait for server to become ready using wait-on for health checking.
     * Uses AbortSignal for clean cancellation by wrapping wait-on in a cancellable Promise.
     */
    private async waitForServerReady(signal: AbortSignal): Promise<void> {
        // Wrap wait-on in a Promise that respects AbortSignal
        const waitOnPromise = waitOn({
            resources: [this.config.url],
            interval: POLL_INTERVAL_MS,
            timeout: HEALTH_CHECK_TIMEOUT_MS,
            window: 1000, // Wait for server to be stable for 1s
            httpTimeout: POLL_INTERVAL_MS,
        });

        // Create a cancellation promise that rejects when signal is aborted
        const cancellationPromise = new Promise<never>((_, reject) => {
            if (signal.aborted) {
                reject(new Error('Health check cancelled'));
                return;
            }
            signal.addEventListener('abort', () => {
                reject(new Error('Health check cancelled'));
            });
        });

        try {
            // Race between wait-on and cancellation
            await Promise.race([waitOnPromise, cancellationPromise]);
        } catch {
            if (signal.aborted) {
                // Aborted, don't throw - caller will handle
                return;
            }
            // Re-throw wait-on timeout errors with better message
            throw new Error(
                `Server at ${this.config.url} did not become healthy within ${HEALTH_CHECK_TIMEOUT_MS / 1_000} seconds.`
            );
        }
    }

    /**
     * Start the server process and wait for it to be ready using wait-on.
     * Uses AbortController for clean cancellation of health checks.
     */
    private async startServerProcess(): Promise<void> {
        log.step(`Starting dev server: ${this.config.command}`);
        log.info(`Working directory: ${this.config.cwd}`);

        // Determine log visibility before spawning so we can set stdio correctly.
        // Using 'inherit' (verbose) or 'ignore' (quiet) avoids creating OS pipes
        // between this process and the server. Pipes would cause SIGPIPE to kill
        // the server when this parent process exits at the end of a test pass —
        // which is fatal in multi-pass runs (e.g. desktop + mobile a11y scans)
        // where the server must survive between passes.
        const env = getEnvironmentConfig();
        const showServerLogs = env.verbose || process.env.SHOW_DEV_SERVER_LOGS === 'true';

        this.process = spawn('pnpm', ['dev'], {
            cwd: this.config.cwd,
            // 'inherit' → server output goes directly to the terminal (no pipe).
            // 'ignore'  → server output is discarded (no pipe).
            stdio: showServerLogs ? ['ignore', 'inherit', 'inherit'] : 'ignore',
            // detached: true creates a new process group so stop() can send
            // SIGTERM to the entire group (shell + pnpm + vite) via kill(-pid).
            detached: true,
            shell: true,
            env: { ...process.env },
        });

        // AbortController for clean cancellation of health checks
        const abortController = new AbortController();
        const signal = abortController.signal;

        // If the server process crashes before becoming healthy, abort and reject
        const earlyExit = new Promise<never>((_, reject) => {
            this.process?.on('error', (error) => {
                abortController.abort();
                reject(new Error(`Failed to start dev server: ${error.message}`));
            });

            this.process?.on('exit', (code) => {
                if (code !== null && code !== 0) {
                    abortController.abort();
                    reject(new Error(`Dev server exited with code ${code}`));
                }
            });
        });

        // Overall timeout: abort health check and reject if server takes too long
        const overallTimeout = this.config.timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                abortController.abort();
                this.stop();
                reject(new Error(`Server failed to start within ${overallTimeout / 1_000} seconds`));
            }, overallTimeout);
        });

        // Race: either the server becomes healthy or it crashes/times out
        try {
            await Promise.race([this.waitForServerReady(signal), earlyExit, timeoutPromise]);
            log.success(`Dev server is ready at ${this.config.url}`);
        } catch (error) {
            // Ensure cleanup on error
            abortController.abort();
            throw error;
        }
    }
}
