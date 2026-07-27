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
import { readdir } from 'fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const SRC_DIR = join(__dirname, '..', 'src');
const BLOCKED_EXTENSIONS = ['.js', '.jsx', '.mjs', '.cjs']; // Only block JavaScript files
const IGNORED_DIRS = ['node_modules', '.pnpm-store', 'dist', 'build', '.vite', 'coverage'];

async function checkDirectory(dir, relativePath = '') {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativeFilePath = join(relativePath, entry.name);

        if (entry.isDirectory()) {
            if (!IGNORED_DIRS.includes(entry.name)) {
                await checkDirectory(fullPath, relativeFilePath);
            }
        } else if (entry.isFile()) {
            const ext = extname(entry.name);
            if (BLOCKED_EXTENSIONS.includes(ext)) {
                console.error(`❌ JavaScript file found (should be TypeScript): ${relativeFilePath}`);
                process.exit(1);
            }
        }
    }
}

async function main() {
    try {
        console.log('🔍 Checking that no JavaScript files exist in source...');
        await checkDirectory(SRC_DIR);
        console.log('✅ No JavaScript files found - all source files are TypeScript or other allowed types!');
    } catch (error) {
        console.error('❌ Error checking file extensions:', error);
        process.exit(1);
    }
}

main();
