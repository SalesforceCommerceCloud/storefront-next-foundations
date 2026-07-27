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
 * Run accessibility scans for both desktop and mobile viewports sequentially.
 *
 * CodeceptJS run-multiple does not forward --grep to its workers, so we run
 * two passes of codeceptjs run instead:
 *   1. Desktop — default Playwright config (1200x900)
 *   2. Mobile  — Pixel 7 emulation via PLAYWRIGHT_MOBILE=true
 *
 * Any extra arguments (e.g. --verbose) are forwarded to both passes.
 * TypeScript definition generation is skipped for the second pass.
 *
 * Usage: pnpm a11y
 */

import { buildBaseArgs, runPasses } from './a11y-runner';

// Extra args passed to this script (e.g. --verbose) are forwarded to both passes.
const baseArgs = buildBaseArgs();

const exitCode = runPasses([
    {
        label: 'Running a11y scans — desktop',
        args: baseArgs,
        env: process.env,
    },
    {
        label: 'Running a11y scans — mobile (Pixel 7 emulation)',
        args: [...baseArgs, '--skip-def'],
        env: { ...process.env, PLAYWRIGHT_MOBILE: 'true' },
    },
]);

process.exit(exitCode);
