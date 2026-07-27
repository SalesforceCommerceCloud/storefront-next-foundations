# E2E Testing AI Agents & Skills

> **System Instruction for AI Agents:** 
> Before responding to any user request, check if the task matches one of the skills listed below. If it does, **immediately read the linked SKILL.md file** and follow its instructions. This applies to ALL AI agents (Cursor, Claude Code, etc.).

## Available Skills

### [Generate Storefront E2E Test](./.claude/skills/generate-storefront-e2e-test/SKILL.md)
**When to use:** User asks to create, write, or generate E2E tests for the storefront application.

**Capabilities:**
- Systematically creates CodeceptJS E2E tests for Salesforce Commerce Cloud storefront
- Specializes in commerce-specific test patterns (search, cart, checkout, products)
- Leverages AI-powered features: `pause()` for interactive development, `I.askForPageObject()` for DOM-driven page object generation
- Ensures proper test structure (Scenario-Mocha style), tagging, and organization
- Updates self-healing recipes for test maintenance
- Validates SFCC cookies and session management

**Trigger phrases:**
- "Create an E2E test for..."
- "Write a test that validates..."
- "Generate tests for the checkout flow"
- "Add E2E coverage for product search"
- "Test the shopping cart functionality"

**Key Requirements:**
- Uses Chai `expect()` assertions for value validation (NOT manual `throw new Error()`)
- Creates page objects with semantic locators and `.as('Name')` descriptions
- Updates `helpers/self-healing/recipes.ts` when adding/modifying page objects
- Focuses on actual storefront (not demo/workbench environments)
- Auto-generates TypeScript definitions before test execution

---

## Project Context

This is the **storefront-next-e2e** package, focused on E2E testing for Salesforce Commerce Cloud storefront built with React Router v7.

**Stack:**
- CodeceptJS 3.7.5 with Playwright engine
- TypeScript 5.6.0
- Mocha test runner
- AI-powered test development and self-healing

**Essential Documentation:**
- [CLAUDE.md](./CLAUDE.md) - AI-specific guidance for test development
- [README.md](./README.md) - User-facing documentation and commands
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture details

**Quick Commands:**
```bash
pnpm e2e              # Run all tests (definitions auto-generated)
pnpm e2e --ai         # Run with AI features (self-healing, page object generation)
pnpm e2e --grep "@tag" # Filter tests by tag
pnpm report           # View Allure dashboard
```

---

## How to Use This File

### For AI Agents
1. **Read this file first** when a task is assigned
2. **Match the task** to one of the skills listed above
3. **Read the linked SKILL.md** file for detailed instructions
4. **Follow the workflow** outlined in the skill

### For Developers
1. **Reference this file** to understand what AI capabilities exist
2. **Use trigger phrases** to invoke specific skills
3. **Update this file** when adding new skills to the `.claude/skills/` directory

---

## Skill Development Guidelines

When creating new skills for this package:

1. **Location**: Place skill files in `.claude/skills/<skill-name>/SKILL.md`
2. **Registration**: Add entry to this `AGENTS.md` file with:
   - Clear title and link to SKILL.md
   - "When to use" description
   - Capabilities list
   - Trigger phrases
3. **E2E Context**: Ensure skills understand storefront commerce context
4. **References**: Link to CLAUDE.md, README.md, and ARCHITECTURE.md as needed

---

## Notes

- This file is **version-controlled** and shared across the team
- Works with **all AI agents** (Cursor, Claude Code, etc.) via `.cursorrules` and `.clauderules`
- **No manual setup required** for new developers
- Skills are **package-specific** (isolated to storefront-next-e2e)
