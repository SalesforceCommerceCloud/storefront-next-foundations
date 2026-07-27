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
 * Lists all available extension points in a storefront-next template:
 *   - UITarget IDs (from <UITarget targetId="..." /> usage in source)
 *   - Server action hook IDs (from ACTION_HOOK_IDS constant + runHookSafe call sites)
 *
 * Usage:
 *   node scripts/list-extension-points.js [--json] [--root <path>]
 *
 * Options:
 *   --json          Output as JSON instead of human-readable table
 *   --root <path>   Template root directory (default: directory containing this script's parent)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const rootIndex = args.indexOf('--root');
const rootDir =
    rootIndex !== -1 && args[rootIndex + 1] ? path.resolve(args[rootIndex + 1]) : path.resolve(__dirname, '..');

const srcDir = path.join(rootDir, 'src');

if (!fs.existsSync(srcDir)) {
    console.error(`Source directory not found: ${srcDir}`);
    process.exit(1);
}

const TARGET_ID_PATTERN = /targetId="([^"]+)"/g;
const HOOK_CONSTANT_PATTERN = /(\w+):\s*'(sfcc\.[^']+)'/g;
const HOOK_CALL_PATTERN = /hookId:\s*ACTION_HOOK_IDS\.(\w+)/g;
const BLOCKING_PATTERN = /blocking:\s*true/;

// Directories to exclude from extension point discovery.
// Dev-tooling directories with UITarget or hook usage should be added here.
const EXCLUDED_DIRS = new Set(['node_modules', '.storybook']);

function walkFiles(dir, extensions, results = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!EXCLUDED_DIRS.has(entry.name)) {
                walkFiles(fullPath, extensions, results);
            }
        } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
            results.push(fullPath);
        }
    }
    return results;
}

function collectUITargets() {
    const targets = new Map();
    const files = walkFiles(srcDir, ['.tsx', '.ts', '.jsx', '.js']);

    for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf-8');
        TARGET_ID_PATTERN.lastIndex = 0;
        let match;
        while ((match = TARGET_ID_PATTERN.exec(content)) !== null) {
            const targetId = match[1];
            if (!targets.has(targetId)) {
                targets.set(targetId, []);
            }
            targets.get(targetId).push(path.relative(rootDir, filePath));
        }
    }

    return targets;
}

function collectActionHooks() {
    const hookFile = path.join(srcDir, 'targets', 'action-hook.server.ts');
    if (!fs.existsSync(hookFile)) {
        return { hookIds: new Map(), hookUsages: [] };
    }

    const hookContent = fs.readFileSync(hookFile, 'utf-8');

    const constantToId = new Map();
    HOOK_CONSTANT_PATTERN.lastIndex = 0;
    let match;
    while ((match = HOOK_CONSTANT_PATTERN.exec(hookContent)) !== null) {
        constantToId.set(match[1], match[2]);
    }

    const hookUsages = [];
    const actionDirs = [path.join(srcDir, 'lib', 'actions'), path.join(srcDir, 'routes')];

    for (const actionDir of actionDirs) {
        if (!fs.existsSync(actionDir)) continue;
        const files = walkFiles(actionDir, ['.ts', '.tsx']);

        for (const filePath of files) {
            const content = fs.readFileSync(filePath, 'utf-8');
            HOOK_CALL_PATTERN.lastIndex = 0;
            let callMatch;
            while ((callMatch = HOOK_CALL_PATTERN.exec(content)) !== null) {
                const constantName = callMatch[1];
                const hookId = constantToId.get(constantName);
                if (!hookId) continue;

                const callStart = callMatch.index;
                const blockEnd = content.indexOf('});', callStart);
                const block = content.slice(callStart, blockEnd !== -1 ? blockEnd : callStart + 500);
                const blocking = BLOCKING_PATTERN.test(block);

                hookUsages.push({
                    hookId,
                    constantName,
                    file: path.relative(rootDir, filePath),
                    blocking,
                });
            }
        }
    }

    return { hookIds: constantToId, hookUsages };
}

// --- Collect data ---

const uiTargets = collectUITargets();
const { hookIds, hookUsages } = collectActionHooks();

// --- Output ---

if (jsonOutput) {
    const output = {
        uiTargets: [...uiTargets.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([targetId, files]) => ({ targetId, files })),
        actionHooks: [...hookIds.entries()]
            .sort(([, a], [, b]) => a.localeCompare(b))
            .map(([constantName, hookId]) => {
                const usages = hookUsages.filter((u) => u.hookId === hookId);
                return {
                    hookId,
                    constantName,
                    usages: usages.map((u) => ({
                        file: u.file,
                        blocking: u.blocking,
                    })),
                };
            }),
    };
    console.log(JSON.stringify(output, null, 2));
} else {
    const sortedTargets = [...uiTargets.entries()].sort(([a], [b]) => a.localeCompare(b));

    console.log(`\nUI Targets (${sortedTargets.length})`);
    console.log('='.repeat(60));

    const groups = new Map();
    for (const [targetId, files] of sortedTargets) {
        const prefix = targetId.split('.').slice(0, 2).join('.');
        if (!groups.has(prefix)) {
            groups.set(prefix, []);
        }
        groups.get(prefix).push({ targetId, files });
    }

    for (const [prefix, entries] of groups) {
        console.log(`\n  ${prefix}.*`);
        for (const { targetId, files } of entries) {
            const fileList = files.length <= 2 ? files.join(', ') : `${files[0]} (+${files.length - 1} more)`;
            console.log(`    ${targetId}`);
            console.log(`      ${fileList}`);
        }
    }

    console.log(`\n\nServer Action Hooks (${hookIds.size})`);
    console.log('='.repeat(60));

    const sortedHooks = [...hookIds.entries()].sort(([, a], [, b]) => a.localeCompare(b));
    for (const [constantName, hookId] of sortedHooks) {
        const usages = hookUsages.filter((u) => u.hookId === hookId);
        const blocking = usages.some((u) => u.blocking);
        const badge = blocking ? ' [BLOCKING]' : '';
        console.log(`\n  ${hookId}${badge}`);
        console.log(`    constant: ACTION_HOOK_IDS.${constantName}`);
        for (const usage of usages) {
            console.log(`    called in: ${usage.file}`);
        }
    }

    console.log(`\n\nSummary: ${sortedTargets.length} UI targets, ${hookIds.size} action hooks\n`);
}
