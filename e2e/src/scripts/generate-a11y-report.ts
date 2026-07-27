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
 * Generate an offline accessibility report (Markdown + HTML) by running a11y
 * tests with result collection enabled, then formatting the collected JSON.
 *
 * Usage:
 *   pnpm a11y:report
 *   pnpm a11y:report --no-ai
 *
 * Output:
 *   a11y-report/report.md   (gitignored — generate locally when needed)
 *   a11y-report/report.html (gitignored — upload as CI artifact)
 *
 * Exit code:
 *   0 — all pages within baseline
 *   non-zero — one or more pages exceeded baseline (same as pnpm a11y)
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { marked } from 'marked';
import { formatMarkdownReport, type A11yScanResults } from '../utils/a11y-report-utils';
import { buildBaseArgs, runPasses } from './a11y-runner';

const REPORT_DIR = join(process.cwd(), 'a11y-report');
const RESULTS_DIR = join(REPORT_DIR, 'data');
const REPORT_FILE = join(REPORT_DIR, 'report.md');
const HTML_FILE = join(REPORT_DIR, 'report.html');

// Clear previous results so stale files don't pollute the report.
rmSync(REPORT_DIR, { recursive: true, force: true });
mkdirSync(RESULTS_DIR, { recursive: true });

console.log('Running a11y scans with result collection enabled…');

// Extra args passed to this script (e.g. --no-ai) are forwarded to both passes.
const baseArgs = buildBaseArgs();

const collectEnv = { ...process.env, A11Y_COLLECT_RESULTS: 'true' };

// Run both desktop and mobile passes with result collection enabled. Tests may
// fail due to violations — we still generate the report from whatever results
// were written, then exit with the non-zero code so CI fails correctly.
const exitCode = runPasses([
    {
        label: 'Running a11y scans — desktop',
        args: baseArgs,
        env: collectEnv,
    },
    {
        label: 'Running a11y scans — mobile (Pixel 7 emulation)',
        args: [...baseArgs, '--skip-def'],
        env: { ...collectEnv, PLAYWRIGHT_MOBILE: 'true' },
    },
]);

generateReport();

process.exit(exitCode);

function generateReport(): void {
    // Read collected result files.
    const allResults: Record<string, A11yScanResults> = {};

    for (const filename of readdirSync(RESULTS_DIR).sort()) {
        if (!filename.endsWith('.json')) continue;
        // Filename format: `<pageKey>__<viewport>.json` (double underscore separator)
        const key = filename.replace(/\.json$/, '').replace('__', '/');
        const content = readFileSync(join(RESULTS_DIR, filename), 'utf-8');
        allResults[key] = JSON.parse(content) as A11yScanResults;
    }

    if (Object.keys(allResults).length === 0) {
        console.error('\nNo scan results found. Make sure the storefront dev server is running.');
        process.exit(1);
    }

    const markdown = formatMarkdownReport(allResults);
    writeFileSync(REPORT_FILE, markdown, 'utf-8');
    console.log(`\nA11y report written to ${REPORT_FILE}`);

    const htmlBody = marked.parse(markdown) as string;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 960px; margin: 40px auto; padding: 0 24px; color: #24292e; line-height: 1.6; }
    h1, h2, h3 { border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
    code { background: #f6f8fa; padding: .2em .4em; border-radius: 3px; font-size: 85%; font-family: SFMono-Regular, Consolas, monospace; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    th, td { border: 1px solid #dfe2e5; padding: 6px 13px; }
    th { background: #f6f8fa; font-weight: 600; }
    tr:nth-child(even) td { background: #f6f8fa; }
    blockquote { margin: 0; padding: 0 1em; color: #6a737d; border-left: .25em solid #dfe2e5; }
  </style>
</head>
<body>
${htmlBody}
</body>
</html>`;

    writeFileSync(HTML_FILE, html, 'utf-8');
    console.log(`A11y HTML report written to ${HTML_FILE}`);
    console.log(`Scanned ${Object.keys(allResults).length} page/viewport combinations.`);
}
