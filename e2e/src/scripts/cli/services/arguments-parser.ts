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

import { type TestMode } from './config-provider';
import { DEFAULT_MODE } from '../constants';

/**
 * Argument parsing utilities for CLI operations.
 *
 * Handles filtering and forwarding of command-line arguments to CodeceptJS/Playwright,
 * separating CLI-specific options from pass-through arguments.
 */
export class ArgumentParser {
    /** Flags consumed exclusively by the CLI wrapper (never forwarded). */
    private static CLI_OPTIONS = [
        '--mode',
        '--base-url',
        '--site-id',
        '--ai',
        '--no-ai',
        '--verbose',
        '--def',
        '--skip-def',
        '--playwright-help',
    ];

    /** CLI options that expect a following value argument (space-separated or = form). */
    private static CLI_OPTIONS_WITH_VALUES = ['--mode', '--base-url', '--site-id'];

    /**
     * Parse CLI-specific options directly from process.argv.
     *
     * Commander's passThroughOptions() stops option parsing at the first unknown
     * option (e.g. --grep), so CLI flags placed after pass-through args would be
     * silently ignored by program.opts(). Reading process.argv directly avoids
     * this and correctly handles flags in any order.
     */
    static parseCLIOptions(): {
        mode: TestMode;
        baseUrl?: string;
        siteId?: string;
        ai: boolean;
        verbose: boolean;
        def: boolean;
        skipDef: boolean;
        playwrightHelp: boolean;
    } {
        return this.scan(process.argv.slice(2)).cliOptions;
    }

    /**
     * Get arguments to forward to CodeceptJS.
     *
     * If `--` is present in argv, everything after it is returned verbatim
     * (explicit strategy).  Otherwise, CLI-specific flags are filtered out
     * and the rest is forwarded (implicit strategy).
     */
    static getPassThroughArgs(): string[] {
        const separatorIndex = process.argv.indexOf('--');
        if (separatorIndex !== -1) {
            return process.argv.slice(separatorIndex + 1);
        }
        return this.scan(process.argv.slice(2)).passThroughArgs;
    }

    /**
     * Single-pass scan of args that simultaneously extracts CLI options and
     * collects pass-through args. Both parseCLIOptions() and getPassThroughArgs()
     * delegate here so the value-consumption logic is defined once.
     *
     * A space-separated value is only consumed when the following token does not
     * start with '-', preventing flags from being silently eaten as option values.
     */
    private static scan(args: string[]): {
        cliOptions: {
            mode: TestMode;
            baseUrl?: string;
            siteId?: string;
            ai: boolean;
            verbose: boolean;
            def: boolean;
            skipDef: boolean;
            playwrightHelp: boolean;
        };
        passThroughArgs: string[];
    } {
        const cliOptions = {
            mode: DEFAULT_MODE as TestMode,
            baseUrl: undefined as string | undefined,
            siteId: undefined as string | undefined,
            ai: false,
            verbose: false,
            def: false,
            skipDef: false,
            playwrightHelp: false,
        };
        const passThroughArgs: string[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            // Boolean flags
            if (arg === '--ai') {
                cliOptions.ai = true;
                continue;
            }
            if (arg === '--no-ai') {
                cliOptions.ai = false;
                continue;
            }
            if (arg === '--verbose') {
                cliOptions.verbose = true;
                continue;
            }
            if (arg === '--def') {
                cliOptions.def = true;
                continue;
            }
            if (arg === '--skip-def') {
                cliOptions.skipDef = true;
                continue;
            }
            if (arg === '--playwright-help') {
                cliOptions.playwrightHelp = true;
                continue;
            }

            // Value options — space-separated form.
            // Only consume the next token as a value when it doesn't start with '-';
            // otherwise leave it to be parsed as its own flag.
            if (this.CLI_OPTIONS_WITH_VALUES.includes(arg)) {
                const next = args[i + 1];
                if (next !== undefined && !next.startsWith('-')) {
                    const value = args[++i];
                    if (arg === '--mode') cliOptions.mode = value as TestMode;
                    else if (arg === '--base-url') cliOptions.baseUrl = value;
                    else if (arg === '--site-id') cliOptions.siteId = value;
                }
                continue;
            }

            // Value options — equals form
            const valueOpt = this.CLI_OPTIONS_WITH_VALUES.find((opt) => arg.startsWith(`${opt}=`));
            if (valueOpt) {
                const value = arg.slice(valueOpt.length + 1);
                if (valueOpt === '--mode') cliOptions.mode = value as TestMode;
                else if (valueOpt === '--base-url') cliOptions.baseUrl = value;
                else if (valueOpt === '--site-id') cliOptions.siteId = value;
                continue;
            }

            passThroughArgs.push(arg);
        }

        return { cliOptions, passThroughArgs };
    }
}
