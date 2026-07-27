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
 * Runs Chromatic on stories tagged with 'chromatic-core'.
 *
 * Usage:
 *   node scripts/chromatic-core.js [chromatic-args]
 *
 * Example:
 *   node scripts/chromatic-core.js --project-token=xxx
 */

import { execSync } from 'child_process';
import { readdirSync, readFileSync, statSync } from 'fs';
import path, { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Recursively find all story files
function findStoryFiles(dir, fileList = []) {
    const files = readdirSync(dir);

    for (const file of files) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
                findStoryFiles(filePath, fileList);
            }
        } else if (file.endsWith('.stories.ts') || file.endsWith('.stories.tsx')) {
            fileList.push(filePath);
        }
    }

    return fileList;
}

// Find all story files
const storyFiles = findStoryFiles(join(rootDir, 'src'));

// Match 'chromatic-core' / "chromatic-core" inside a `tags: [...]` array on the meta
// object — avoids false positives from comments or unrelated string literals.
const CORE_TAG_REGEX = /tags:\s*\[[^\]]*['"]chromatic-core['"][^\]]*\]/;

const coreStoryFiles = [];

for (const file of storyFiles) {
    const content = readFileSync(file, 'utf-8');

    if (CORE_TAG_REGEX.test(content)) {
        coreStoryFiles.push(file);
        console.log(`✓ Found core story: ${path.relative(rootDir, file)}`);
    }
}

if (coreStoryFiles.length === 0) {
    console.error('❌ No stories found with chromatic-core tag');
    process.exit(1);
}

console.log(`\n📊 Found ${coreStoryFiles.length} core stories\n`);

// Build Chromatic command using --only-story-files since we have actual file paths
const storyFileArgs = coreStoryFiles.map((file) => `--only-story-files="${path.relative(rootDir, file)}"`).join(' ');

// Get any additional args passed to this script
const additionalArgs = process.argv.slice(2).join(' ');

const command = `chromatic --build-script-name=storybook:build ${storyFileArgs} --exit-zero-on-changes ${additionalArgs}`;

console.log('Running Chromatic with core story files...\n');
console.log(`Command: ${command}\n`);

try {
    execSync(command, { stdio: 'inherit', cwd: rootDir });
} catch (error) {
    process.exit(error.status || 1);
}
