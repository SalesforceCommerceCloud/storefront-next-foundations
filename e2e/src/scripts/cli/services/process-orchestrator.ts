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
import type { ServerManager } from './server-manager';
import { CodeceptRunner } from './codecept-runner';
import { log } from '../../../../utils/logger';

/**
 * Process lifecycle management for CLI operations.
 *
 * Manages the lifecycle of server processes and CodeceptJS test execution,
 * including graceful shutdown handling for SIGINT/SIGTERM signals.
 */
export class ProcessLifecycle {
    private serverManager: ServerManager | null = null;
    private codeceptRunner: CodeceptRunner;

    constructor() {
        this.codeceptRunner = new CodeceptRunner();
        // Register signal handlers for graceful shutdown (once per signal)
        process.once('SIGINT', () => this.handleShutdown('SIGINT', 130));
        process.once('SIGTERM', () => this.handleShutdown('SIGTERM', 143));
    }

    /**
     * Register a server manager for lifecycle management.
     */
    registerServer(serverManager: ServerManager): void {
        this.serverManager = serverManager;
    }

    /**
     * Get the CodeceptJS runner.
     */
    getRunner(): CodeceptRunner {
        return this.codeceptRunner;
    }

    /**
     * Clean up all managed processes.
     */
    cleanup(): void {
        if (this.serverManager) {
            this.serverManager.stop();
        }
        this.codeceptRunner.kill('SIGTERM');
    }

    /**
     * Handle shutdown signals (SIGINT/SIGTERM).
     */
    private handleShutdown(signal: string, exitCode: number): void {
        log.warn(`Received ${signal}, cleaning up...`);
        this.cleanup();
        process.exit(exitCode);
    }
}
