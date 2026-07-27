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

/**
 * Update the axe-core a11y baseline snapshot.
 *
 * Runs all @a11y tests with A11Y_UPDATE_BASELINE=true so the spec writes
 * current violation counts to a11y-baseline.json instead of
 * asserting against the existing snapshot.
 *
 * Usage:
 *   pnpm a11y:update-baseline
 *   pnpm a11y:update-baseline --mode=local --no-ai
 *
 * After running, review the diff on a11y-baseline.json and commit it.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildBaseArgs, runPasses } from './a11y-runner';

console.log('[A11Y] Running axe scans to update baseline (desktop + mobile)...');
console.log('[A11Y] Violations will be written to a11y-baseline.json');

// Snapshot the existing baseline so we can restore it if any pass fails.
// This prevents a partial run from leaving the baseline in a broken state.
const baselineFile = join(__dirname, '../../a11y-baseline.json');
let previousBaseline = '{}\n';
try {
    previousBaseline = readFileSync(baselineFile, 'utf-8');
} catch {
    // File doesn't exist yet — starting fresh is fine.
}

// Clear the existing baseline before scanning so stale keys from removed or
// renamed tests do not persist. Each pass accumulates its keys into the fresh
// file, giving replace semantics across a full run.
writeFileSync(baselineFile, '{}\n', 'utf-8');
console.log('[A11Y] Cleared existing baseline.');

const baseArgs = buildBaseArgs('--skip-def');
const baseEnv = { ...process.env, A11Y_UPDATE_BASELINE: 'true' };

const exitCode = runPasses([
    {
        label: 'Updating baseline — desktop',
        args: baseArgs,
        env: baseEnv,
    },
    {
        label: 'Updating baseline — mobile (Pixel 7 emulation)',
        args: baseArgs,
        env: { ...baseEnv, PLAYWRIGHT_MOBILE: 'true' },
    },
]);

if (exitCode === 0) {
    console.log('\n[A11Y] Baseline update complete (desktop + mobile).');
    console.log('[A11Y] Review changes in a11y-baseline.json and commit.');
} else {
    // Restore the previous baseline so a partial run does not leave it broken.
    writeFileSync(baselineFile, previousBaseline, 'utf-8');
    console.error(`\n[A11Y] Baseline update finished with failures (exit code ${exitCode}).`);
    console.error('[A11Y] Some scenarios may have failed before the axe scan (e.g. navigation or setup errors).');
    console.error('[A11Y] So the previous baseline has been restored.');
    console.error('\n[A11Y] Review the output above:');
    console.error('[A11Y] If some tests are flaky, try re-running the baseline update.');
    console.error('[A11Y] Otherwise, fix the failing tests first and then re-run the baseline update.');
}

process.exit(exitCode);
