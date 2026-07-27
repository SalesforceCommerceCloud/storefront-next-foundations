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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color family to semantic token mappings
const colorSemantics = {
    // Neutrals - map to muted/secondary/foreground system
    gray: 'neutral',
    slate: 'neutral',
    zinc: 'neutral',
    neutral: 'neutral',
    stone: 'neutral',

    // Destructive colors
    red: 'destructive',
    rose: 'destructive',

    // Primary colors
    blue: 'primary',

    // Secondary colors
    green: 'secondary',
    emerald: 'secondary',
    teal: 'secondary',
    cyan: 'secondary',
    sky: 'secondary',
    indigo: 'secondary',
    violet: 'secondary',
    purple: 'secondary',
    fuchsia: 'secondary',
    pink: 'secondary',

    // Accent colors
    yellow: 'accent',
    amber: 'accent',
    orange: 'accent',
    lime: 'accent',
};

// Shade to opacity mappings for most utilities
const shadeOpacities = {
    50: '/10',
    100: '/20',
    200: '/30',
    300: '/40',
    400: '/50',
    500: '', // base color, no opacity
    600: '', // base color
    700: '', // base color
    800: '', // base color
    900: '', // base color
    950: '', // base color
};

// For text utilities, lighter shades get different opacities for better readability
const textShadeOpacities = {
    50: '/50',
    100: '/60',
    200: '/70',
    300: '/80',
    400: '/90',
    500: '', // base color
    600: '', // base color
    700: '', // base color
    800: '', // base color
    900: '', // base color
    950: '', // base color
};

// Special handling for neutral colors (gray, slate, zinc, neutral, stone)
const neutralMappings = {
    50: { bg: 'bg-muted/30', text: 'text-muted-foreground/30', border: 'border-border/30', ring: 'ring-ring/30' },
    100: { bg: 'bg-muted/50', text: 'text-muted-foreground/40', border: 'border-border/40', ring: 'ring-ring/40' },
    200: { bg: 'bg-muted', text: 'text-muted-foreground/50', border: 'border-border/60', ring: 'ring-ring/60' },
    300: { bg: 'bg-secondary/20', text: 'text-muted-foreground/60', border: 'border-border', ring: 'ring-ring' },
    400: { bg: 'bg-secondary/40', text: 'text-muted-foreground/70', border: 'border-border', ring: 'ring-ring' },
    500: { bg: 'bg-secondary', text: 'text-muted-foreground', border: 'border-foreground/20', ring: 'ring-ring' },
    600: { bg: 'bg-secondary', text: 'text-muted-foreground', border: 'border-foreground/30', ring: 'ring-ring' },
    700: { bg: 'bg-foreground/10', text: 'text-foreground/80', border: 'border-foreground/40', ring: 'ring-ring' },
    800: { bg: 'bg-foreground/20', text: 'text-foreground/90', border: 'border-foreground/60', ring: 'ring-ring' },
    900: { bg: 'bg-foreground/90', text: 'text-foreground', border: 'border-foreground/80', ring: 'ring-ring' },
    950: { bg: 'bg-foreground', text: 'text-foreground', border: 'border-foreground', ring: 'ring-ring' },
};

// Function to generate color utilities programmatically
function generateColorUtilities() {
    const migrations = {};

    // All possible shades
    const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    const utilityTypes = ['bg', 'text', 'border', 'ring'];

    // Generate utilities for each color family
    Object.entries(colorSemantics).forEach(([colorFamily, semanticToken]) => {
        shades.forEach((shade) => {
            utilityTypes.forEach((utilityType) => {
                const className = `${utilityType}-${colorFamily}-${shade}`;

                // Handle neutral colors with special mappings
                if (semanticToken === 'neutral') {
                    migrations[className] = neutralMappings[shade][utilityType];
                } else {
                    // Handle semantic colors (primary, secondary, destructive, accent)
                    const isTextUtility = utilityType === 'text';
                    const opacity = isTextUtility ? textShadeOpacities[shade] : shadeOpacities[shade];
                    migrations[className] = `${utilityType}-${semanticToken}${opacity}`;
                }
            });
        });
    });

    // Add special color utilities
    migrations['bg-white'] = 'bg-background';
    migrations['bg-black'] = 'bg-foreground';
    migrations['bg-transparent'] = 'bg-transparent';
    migrations['bg-current'] = 'bg-current';

    migrations['text-white'] = 'text-primary-foreground';
    migrations['text-black'] = 'text-foreground';
    migrations['text-transparent'] = 'text-transparent';
    migrations['text-current'] = 'text-current';

    migrations['border-white'] = 'border-background';
    migrations['border-black'] = 'border-foreground';
    migrations['border-transparent'] = 'border-transparent';
    migrations['border-current'] = 'border-current';

    migrations['ring-white'] = 'ring-background';
    migrations['ring-black'] = 'ring-foreground';
    migrations['ring-transparent'] = 'ring-transparent';
    migrations['ring-current'] = 'ring-current';

    return migrations;
}

// Generate the color migration mapping
const colorMigrations = generateColorUtilities();

function migrateFile(filePath) {
    try {
        let newContent = fs.readFileSync(filePath, 'utf8');
        let changes = 0;

        // Replace hardcoded colors with themeable equivalents
        for (const [oldColor, newColor] of Object.entries(colorMigrations)) {
            const regex = new RegExp(`\\b${oldColor}\\b`, 'g');
            const matches = newContent.match(regex);
            if (matches) {
                newContent = newContent.replace(regex, newColor);
                changes += matches.length;
                console.log(`  ${oldColor} → ${newColor} (${matches.length} occurrences)`);
            }
        }

        if (changes > 0) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`  ✅ Updated ${filePath} (${changes} changes)`);
            return changes;
        }

        return 0;
    } catch (error) {
        console.error(`  ❌ Error processing ${filePath}:`, error.message);
        return 0;
    }
}

function findFiles(dir, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
    const files = [];

    function scan(currentDir) {
        const items = fs.readdirSync(currentDir);

        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // Skip node_modules and other build directories
                if (!['node_modules', 'dist', 'build', '.vite', '.next', 'out', 'coverage'].includes(item)) {
                    scan(fullPath);
                }
            } else if (extensions.includes(path.extname(item))) {
                files.push(fullPath);
            }
        }
    }

    scan(dir);
    return files;
}

function main() {
    const srcDir = path.join(__dirname, '..', 'src');
    const reactRouterDir = path.join(__dirname, '..', 'react-router-vite');

    console.log('🎨 Migrating hardcoded Tailwind colors to themeable Shadcn utilities...\n');
    console.log(`📊 Generated ${Object.keys(colorMigrations).length} color utility mappings programmatically\n`);

    let totalChanges = 0;
    let filesChanged = 0;

    // Process src directory
    if (fs.existsSync(srcDir)) {
        console.log('📁 Processing src/ directory...');
        const srcFiles = findFiles(srcDir);

        for (const file of srcFiles) {
            const changes = migrateFile(file);
            if (changes > 0) {
                totalChanges += changes;
                filesChanged++;
            }
        }
    }

    // Process react-router-vite directory
    if (fs.existsSync(reactRouterDir)) {
        console.log('\n📁 Processing react-router-vite/ directory...');
        const routerFiles = findFiles(reactRouterDir);

        for (const file of routerFiles) {
            const changes = migrateFile(file);
            if (changes > 0) {
                totalChanges += changes;
                filesChanged++;
            }
        }
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`   Files changed: ${filesChanged}`);
    console.log(`   Total changes: ${totalChanges}`);

    if (totalChanges > 0) {
        console.log(`\n💡 Run 'pnpm lint' to verify the migration worked correctly.`);
        console.log(`   You may need to manually review some color choices for semantic accuracy.`);
    } else {
        console.log(`\n✨ No hardcoded colors found to migrate!`);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
