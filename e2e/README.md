# Storefront E2E Testing

End-to-end test suite for the storefront using [CodeceptJS](https://codecept.io/) and [Playwright](https://playwright.dev/).

## Getting Started

### Prerequisites

Ensure the storefront app is configured. From the project root:

```bash
cp .env.default .env
# Edit .env with your B2C Commerce credentials
```

### Setup

From the project root:

```bash
pnpm install  # Installs dependencies and Playwright browsers
```

### Run Your First Test

```bash
# Run all tests against a running storefront
pnpm e2e

# Auto-start local dev server and run tests
pnpm e2e --mode=local
```

## Configuration

Copy the environment template from the `e2e` directory:

```bash
cp e2e/.env.sample e2e/.env
```

> **Note:** `.env.sample` configures the CodeceptJS test runner only. The storefront app's SCAPI creds, MRT vars, hybrid proxy settings, etc. live in `../.env.default` — see [`../docs/README-CONFIG.md`](../docs/README-CONFIG.md) for the full reference.

Key variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:5173` | Storefront URL |
| `SITE_ID` | `RefArchGlobal` | B2C Commerce site ID |
| `SITE_ALIAS` | _(empty)_ | URL prefix for multisite routing |
| `LOCALE` | _(empty)_ | Locale prefix for multisite routing |
| `HEADLESS` | `false` | Run browser headless |
| `RECORD_VIDEO` | `false` | Record video for each test; failed-test videos are attached to the Allure report |

## Running Tests

All commands run from the template root:

```bash
pnpm e2e                              # Run all tests
pnpm e2e --mode=local                 # Auto-start local dev server
pnpm e2e --mode=remote                # Run against remote (requires BASE_URL to point to storefront hostname)
pnpm e2e --grep "@checkout"           # Filter by tag or name
pnpm e2e --headed                     # Show the browser
pnpm e2e --ui                         # Interactive UI mode
pnpm e2e --debug                      # Debug with CodeceptJS inspector
pnpm report                           # Open Allure test report
```

## AI Features

AI features are **disabled by default**. Enable with the `--ai` flag.

### Setup

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Add to `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Run with AI enabled:
   ```bash
   pnpm e2e --ai
   ```

### What AI enables

- **Self-healing**: Automatically repairs broken locators when tests fail
- **Interactive console**: Use `pause()` in a test, then describe actions in plain English
- **Page object generation**: `I.askForPageObject()` reads the live DOM and generates a page object

```bash
DEBUG="codeceptjs:ai" pnpm e2e --ai   # See AI healing decisions
```

## Generating Tests with AI Coding Assistants

AI coding assistants (Cursor, Claude Code, etc.) can generate complete E2E tests using the
[generate-storefront-e2e-test](./.claude/skills/generate-storefront-e2e-test/SKILL.md) skill.
The skill guides the assistant through a structured workflow — from understanding the commerce
scenario to producing spec files, page objects, and self-healing recipes.

### How to use

Ask your AI assistant to create an E2E test. Any of these prompts will activate the skill:

```
"Create an E2E test for the checkout flow"
"Write a test that validates product search"
"Add E2E coverage for the shopping cart"
```

The assistant will:

1. **Clarify requirements** — ask about scope, device targets, guest vs authenticated flows
2. **Audit existing coverage** — review unit tests and Storybook stories to avoid duplication
3. **Propose a test plan** — list scenarios, tags, and page objects before writing code
4. **Generate artifacts** — spec files, page objects, flow files, and self-healing recipes
5. **Register everything** — update `src/pages/index.ts`, `src/flows/index.ts`, and `helpers/self-healing/recipes.ts`

### What it produces

| Artifact | Location | Purpose |
|----------|----------|---------|
| Spec file | `src/specs/<feature>/*.spec.ts` | Test scenarios with Chai assertions |
| Page object | `src/pages/*.page.ts` | Reusable element interactions |
| Flow | `src/flows/*.flow.ts` | Multi-page workflows |
| Healing recipes | `helpers/self-healing/recipes.ts` | Fallback selectors for AI self-healing |

### Key conventions enforced

- Scenarios never call `I.*` directly — all browser interactions live in page objects or flows
- Chai `expect()` for value assertions, CodeceptJS methods for UI interactions
- All hardcoded paths wrapped in `buildSitePath()` for multi-site support
- Each scenario is independent and can run in any order
- Page objects use semantic locators with `.as('Name')` descriptions

After generation, run the tests manually to verify:

```bash
pnpm e2e --grep "@your-tag"
```

See [AGENTS.md](./AGENTS.md) for the full skill reference and additional AI agent capabilities.

## TypeScript Definitions

Definitions are auto-generated before each test run. To generate manually (e.g., for IDE IntelliSense):

```bash
pnpm def
```

## Troubleshooting

**TypeScript errors about missing page objects**
```bash
pnpm def  # Regenerate definitions
```

**Tests fail with "Element not found"**

Enable AI self-healing:
```bash
pnpm e2e --ai --grep "@failing-test"
```

**Local dev server won't start**

Check that `.env` exists at the project root and has valid B2C Commerce credentials.

**Port 5173 already in use**
```bash
lsof -ti:5173 | xargs kill
```

**AI features not working**
```bash
# Verify ANTHROPIC_API_KEY is set
cat .env | grep ANTHROPIC
```

**Remote tests fail: "BASE_URL required"**
```bash
BASE_URL=https://your-site.com pnpm e2e --mode=remote
```

## Code Quality

```bash
pnpm lint         # ESLint
pnpm lint:fix     # Auto-fix lint issues
pnpm typecheck    # TypeScript type checking
```

## Further Reading

- **[docs/a11y.md](./docs/a11y.md)** — Accessibility testing: baseline workflow, severity levels, CI integration
- **[CodeceptJS Docs](https://codecept.io/)** — Framework reference
- **[Playwright Helper](https://codecept.io/helpers/Playwright/)** — Browser interaction API
