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
import { execSync } from 'node:child_process';
import { extname } from 'node:path';

// Get staged files
const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

const BLOCKED_EXTENSIONS = ['.js', '.jsx', '.mjs', '.cjs']; // Only block JavaScript files
const IGNORED_PATTERNS = [
    /^package\.json$/,
    /^pnpm-lock\.yaml$/,
    /^\.eslintrc\.js$/,
    /^vite\.config\.ts$/,
    /^tsconfig\.json$/,
    /^scripts\/.*\.js$/,
    /^\.cursor\/.*$/,
];

let hasErrors = false;

for (const file of stagedFiles) {
    // Skip ignored files
    if (IGNORED_PATTERNS.some((pattern) => pattern.test(file))) {
        continue;
    }

    const ext = extname(file);
    if (BLOCKED_EXTENSIONS.includes(ext)) {
        console.error(`❌ JavaScript file staged for commit (should be TypeScript): ${file}`);
        hasErrors = true;
    }
}

if (hasErrors) {
    console.error('\n🚫 Commit blocked: JavaScript files (.js, .jsx, .mjs, .cjs) are not allowed in the source code.');
    console.error('Please convert JavaScript files to TypeScript or remove them from staging.');
    process.exit(1);
}

console.log('✅ No JavaScript files found in staged files!');
