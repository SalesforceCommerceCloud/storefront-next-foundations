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
 *
 */

/**
 * Generate Vitest tests from Storybook stories using composeStories
 *
 * Scans src/components and src/extensions recursively for *.stories.tsx files and generates
 * corresponding test files that use composeStories to render and run play() functions.
 */
import fs from 'fs';
import path from 'path';

const componentsDir = path.join(process.cwd(), 'src/components');
const extensionsDir = path.join(process.cwd(), 'src/extensions');
const outputDir = path.join(process.cwd(), '.storybook/tests/generated-stories');

function walk(dir, cb) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            walk(full, cb);
        } else {
            cb(full);
        }
    }
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

let generatedCount = 0;
let skippedCount = 0;

function processStoriesDir(dir, baseDir, dirLabel, isExtensions = false) {
    walk(dir, (file) => {
        if (file.endsWith('.stories.tsx')) {
            // Stories MUST be in a /stories/ subdirectory
            if (!file.includes(path.sep + 'stories' + path.sep)) {
                return;
            }

            // For extensions, only include stories in components/ folders
            if (isExtensions) {
                const rel = path.relative(baseDir, file);
                // Check if the relative path contains components/ folder
                const pathParts = rel.split(path.sep);
                if (!pathParts.includes('components')) {
                    return;
                }
            }

            // Skip ui folder - these are shadcn components, exclude from test generation
            if (file.includes(path.join('components', 'ui'))) {
                skippedCount++;
                return;
            }

            const rel = path.relative(baseDir, file);
            // Convert path separators to double underscores for flat output structure
            // Prefix with directory label to avoid collisions between components and extensions
            const outName = `${dirLabel}_${rel.replace(/[\\/]/g, '__').replace('.stories.tsx', '.story.test.tsx')}`;
            const outPath = path.join(outputDir, outName);

            // Use @/ alias for cleaner imports (maps to src/)
            const importPath = path.relative(path.join(process.cwd(), 'src'), file).replace(/\\/g, '/');
            // Remove .tsx extension for import
            const importPathWithoutExt = `@/${importPath.replace(/\.tsx$/, '')}`;

            const content = `import React from 'react';
import { render } from '@testing-library/react';
import { describe, test } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { StoryTestWrapper } from '../../test-wrapper';
import * as stories from '${importPathWithoutExt}';

const all = composeStories(stories);

describe('Story tests for ${rel}', () => {
  // Skip if no stories are exported (e.g., meta-only files)
  if (Object.keys(all).length === 0) {
    test.skip('No stories exported from this file', () => {});
    return;
  }

  for (const [name, Story] of Object.entries(all)) {
    test(\`\${name} runs play()\`, async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const StoryComponent = Story as any;
      // Wrap with providers to ensure Router, StoreLocatorProvider, and CheckoutProvider are available
      const { container } = render(
        <StoryTestWrapper>
          <StoryComponent />
        </StoryTestWrapper>
      );
      if (StoryComponent.play) {
        await StoryComponent.play({ canvasElement: container });
      }
    }, 20000);
  }
});
`;

            fs.writeFileSync(outPath, content, 'utf8');
            generatedCount++;
        }
    });
}

// Process components directory
if (fs.existsSync(componentsDir)) {
    processStoriesDir(componentsDir, componentsDir, 'components', false);
}

// Process extensions directory - only include components/ folders
if (fs.existsSync(extensionsDir)) {
    processStoriesDir(extensionsDir, extensionsDir, 'extensions', true);
}

console.log(`✅ Generated ${generatedCount} story test file(s) in ${outputDir}`);
if (skippedCount > 0) {
    console.log(`⏭️  Skipped ${skippedCount} story file(s) from ui folder (excluded from test generation)`);
}
