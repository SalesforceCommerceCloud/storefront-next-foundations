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

export const DEFAULT_MODE = 'auto';

export const CLI_NAME = 'e2e';
export const CLI_DESCRIPTION = 'Storefront Next E2E Test Runner';
export const CLI_VERSION = '0.1.0';
export const CLI_USAGE = '[options] [playwright-options]';

export const MODE_OPTION_DESCRIPTION =
    'Test mode: local, remote, or auto (default: auto)\n' +
    '  - local:  Auto-starts dev server, tests localhost:5173\n' +
    '  - remote: Tests deployed site (requires BASE_URL)\n' +
    '  - auto:   Uses remote if BASE_URL is set, else local';

export const BASE_URL_OPTION_DESCRIPTION = 'URL to test against (sets BASE_URL env variable)';

export const SITE_ID_OPTION_DESCRIPTION = 'Commerce Cloud Site ID (default: RefArchGlobal)';

export const PLAYWRIGHT_HELP_OPTION_DESCRIPTION = "Show Playwright's native help";

export const ADDITIONAL_HELP_TEXT = `
Common Playwright Options (pass through):
  --ui                       Run tests in interactive UI mode
  --debug                    Run tests with Playwright Inspector
  --headed                   Run tests in headed browser mode
  --project=<name>           Run tests only for specific project (e.g., core-desktop, core-mobile)
  --grep=<pattern>           Only run tests matching this pattern
  show-report                Open the last HTML test report
  codegen <url>              Generate test code from browser actions

Environment Variables:
  BASE_URL                   URL to test against (for remote mode)
  SITE_ID                    Commerce Cloud Site ID (default: RefArchGlobal)
  STOREFRONT_DEV_PORT        Local dev server port (default: 5173)
  STOREFRONT_APP_PATH        Path to storefront app (default: ..)
  CI                         Enable CI mode (retries, limited workers)

Examples:
  $ pnpm e2e --mode=local
  $ pnpm e2e --mode=remote --base-url=https://site.com
  $ pnpm e2e --ui
  $ pnpm e2e --mode=local --headed
  $ pnpm e2e --project=core-mobile
  $ pnpm e2e --grep="checkout"
  $ pnpm e2e show-report
  $ BASE_URL=https://site.com pnpm e2e

For more information, see e2e/README.md
`;

export const PLAYWRIGHT_HELP_HEADER = '\n🎭 Playwright Native Help:\n';

export const ERROR_MESSAGES = {
    INVALID_MODE: (mode: string) => `❌ Invalid mode: ${mode}. Must be 'local', 'remote', or 'auto'.`,
    ENVIRONMENT_VALIDATION_FAILED: '\n❌ Environment validation failed:\n',
    PLAYWRIGHT_EXECUTION_FAILED: '\n❌ Failed to execute Playwright:\n',
    PLAYWRIGHT_INSTALLATION_HELP:
        '\nMake sure Playwright is installed:\n  pnpm install\n  pnpm exec playwright install\n',
    GENERIC_ERROR: '\n❌ Error:\n',
    CLI_START_FAILED: 'Failed to start CLI:',
};

export const INFO_MESSAGES = {
    MODE_PREFIX: '\n🎭 ',
    CONFIG_PREFIX: '📝 Using config: ',
    CONFIG_SUFFIX: '\n',
};
