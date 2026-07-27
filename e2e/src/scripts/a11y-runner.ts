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

/**
 * Shared utilities for a11y scripts that run desktop + mobile passes.
 */

import { spawnSync } from 'child_process';

export const tsxRunner = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
export const testRunnerScript = 'src/scripts/cli/test-runner.ts';

/** CLI args passed after the script name (e.g. --mode=local --no-ai). */
const extraArgs = process.argv.slice(2);

/**
 * Build the base argument list for a test-runner invocation.
 * Always includes `--grep @a11y` and any extra CLI flags the user passed.
 */
export function buildBaseArgs(...additionalArgs: string[]): string[] {
    return [testRunnerScript, '--grep', '@a11y', ...additionalArgs, ...extraArgs];
}

export interface A11yPass {
    label: string;
    args: string[];
    env: NodeJS.ProcessEnv;
}

/**
 * Run a series of a11y passes sequentially.
 * Returns the highest exit code from any pass (0 = all passed).
 */
export function runPasses(passes: A11yPass[]): number {
    let maxCode = 0;
    for (const pass of passes) {
        console.log(`\n▶ ${pass.label}`);
        const result = spawnSync(tsxRunner, pass.args, {
            stdio: 'inherit',
            env: pass.env,
            shell: false,
        });
        const code = result.status ?? 1;
        if (code > maxCode) maxCode = code;
    }
    return maxCode;
}
