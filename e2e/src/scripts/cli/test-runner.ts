#!/usr/bin/env node
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
import { ERROR_MESSAGES } from './constants';
import { loadEnvironmentFiles } from './services/env-manager';
import { createProgram, handleDefFlag, handlePlaywrightHelp, runTestFlow } from './helpers/cli-utils';
import { ArgumentParser } from './services/arguments-parser';
import { log } from '../../../utils/logger';

/**
 * Main CLI execution.
 */
async function main(): Promise<void> {
    try {
        // Parse CLI options directly from process.argv — Commander's passThroughOptions()
        // stops at the first unknown option (e.g. --grep), so program.opts() would silently
        // drop any CLI flags that appear after pass-through args.
        const options = ArgumentParser.parseCLIOptions();

        // Handle --def flag early — it only generates TypeScript definitions
        // and does not need .env configuration.
        if (options.def) {
            return await handleDefFlag();
        }

        // Load environment files (before any config checks)
        loadEnvironmentFiles();

        // Still parse via Commander so --help and --version work correctly
        const program = createProgram();
        program.parse(process.argv);

        // Handle --playwright-help flag
        if (options.playwrightHelp) {
            return handlePlaywrightHelp();
        }

        // Run the test flow
        await runTestFlow(options);
    } catch (error) {
        log.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

// Run CLI
void main().catch((error) => {
    console.error(ERROR_MESSAGES.CLI_START_FAILED, error);
    process.exit(1);
});
