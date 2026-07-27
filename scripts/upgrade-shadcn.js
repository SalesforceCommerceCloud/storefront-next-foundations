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
 * Bulk upgraded all used shadcn/ui components in the project.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const UI_DIR = path.join('src', 'components', 'ui');

function log(msg) {
    process.stdout.write(msg + '\n');
}

function error(msg) {
    process.stderr.write(msg + '\n');
}

function run(command, args, options = {}) {
    return new Promise((resolve) => {
        const child = spawn(command, args, {
            stdio: 'inherit',
            shell: process.platform === 'win32', // makes "npx" work more reliably on Windows
            ...options,
        });

        child.on('error', (err) => resolve({ ok: false, code: 1, err }));
        child.on('close', (code) => resolve({ ok: code === 0, code: code ?? 1 }));
    });
}

async function main() {
    // Check if we're in a Next.js project (same heuristic as bash script)
    if (!fs.existsSync(UI_DIR) || !fs.statSync(UI_DIR).isDirectory()) {
        error('Error: src/components/ui directory not found');
        error('Please run this script from your Next.js project root');
        process.exit(1);
    }

    log('Starting shadcn/ui components upgrade...');
    log(`Checking components in ${UI_DIR}/...`);

    const entries = fs.readdirSync(UI_DIR, { withFileTypes: true });

    const tsxFiles = entries
        .filter((e) => e.isFile() && e.name.endsWith('.tsx'))
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b));

    let upgraded = 0;
    let failed = [];

    for (const filename of tsxFiles) {
        const component = path.basename(filename, '.tsx');
        log(`Upgrading component: ${component}`);

        // Equivalent to: npx shadcn@latest add -y -o "$component"
        // Run from project root (current working directory).
        const result = await run('npx', ['shadcn@latest', 'add', '-y', '-o', component]);

        if (result.ok) {
            upgraded += 1;
            log(`✓ Successfully upgraded ${component}`);
        } else {
            failed.push(component);
            log(`✗ Failed to upgrade ${component}`);
        }
    }

    log('Upgrade complete!');
    log(`Successfully upgraded: ${upgraded} components`);
    if (failed.length) {
        log(`Failed to upgrade: ${failed.length} components (${failed.join(', ')})`);
        process.exit(1);
    }
}

main().catch((err) => {
    error(String(err?.stack || err));
    process.exit(1);
});
