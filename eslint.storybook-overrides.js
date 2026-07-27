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
 * Storybook-specific ESLint overrides for template-retail-rsc-app
 *
 * These overrides extend the base monorepo ESLint config with rules
 * specific to Storybook story files and related testing files.
 *
 * Used by:
 * - eslint.config.js (in monorepo mode)
 * - scripts/generate-eslint-config.js (when generating standalone config for mirror repo)
 */
import storybook from 'eslint-plugin-storybook';

export const storybookOverrides = [
    {
        // Ignore Storybook config files, build artifacts, and generated test files
        ignores: [
            '.storybook/**/*',
            'build/**/*',
            'coverage/**/*',
            'storybook-static/**/*',
            '_local/**/*',
            '**/__snapshots__/**/*',
            '**/*-snapshot.tsx',
        ],
    },
    {
        // Storybook story files
        files: ['**/*.stories.{ts,tsx,js,jsx}'],
        plugins: {
            storybook,
        },
        rules: {
            ...storybook.configs.recommended.rules,
            'import/no-namespace': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/consistent-type-imports': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            'custom/color-linter': 'off',
        },
    },
];
