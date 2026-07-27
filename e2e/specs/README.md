# Specifications

This directory contains specifications for the storefront e2e test suite. Feature specs are markdown documentation files that describe **what** needs to be built, before we write **how** to test it.

## Structure

Feature specs are organized by domain (checkout, cart, account, etc.):

```
specs/
├── checkout/
│   ├── guest-checkout.spec.md
│   ├── billing-address.spec.md
│   ├── payment-validation.spec.md
│   └── checkout-registration.spec.md
├── cart/
│   ├── add-to-cart.spec.md
│   └── cart-updates.spec.md
├── account/
├── search/
└── README.md (this file)
```

## What is a Spec?

A spec is a **markdown document** that defines:
- **Acceptance Criteria** — What the user should be able to do
- **Feature Logic** — Key behaviors, state management, edge cases
- **Implementation Notes** — Technical context and dependencies
- **Test Coverage Map** — Links to test implementations
- **Related Features** — Cross-references to related specs
- **Risks & Dependencies** — What could break or block this

Feature specs are **not test code**. They're documentation written before implementation to align product, engineering, and QA on what success looks like.

## Spec Format

Each spec follows this structure:

```markdown
---
title: [Feature Title]
domain: [Checkout|Cart|Account|etc.]
status: [draft|active|deprecated]
version: 1.0
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
author: [author]
---

# [Feature Title]

## Overview
One paragraph describing business value and user story.

## Acceptance Criteria

### AC1: [Criterion]
- [ ] Specific behavior
- [ ] Another behavior
- [ ] Edge case

### AC2: [Another Criterion]
- [ ] Specific behavior
- [ ] Another behavior

## Feature Logic

### Key Behaviors
1. **Step 1**: Description
2. **Step 2**: Description

### State Management
- How state persists
- Session boundaries
- Data lifecycle

### Edge Cases
- Invalid input → Behavior
- Timeout → Behavior

## Implementation Notes
- Technology stack details
- API dependencies
- Compliance/security notes

## Test Coverage Map

| Acceptance Criteria | E2E Test | Unit Test |
|---|---|---|
| AC1 | filename.spec.ts:L123 | UnitTest.ts |
| AC2 | filename.spec.ts:L456 | - |

## Related Features
- [Other Feature](./other-feature.spec.md)

## Risks & Dependencies
- **Risk**: [Description]
- **Dependency**: [Description]
```

## Creating a New Spec

### Option 1: Use the Template
Copy the template file from the Claude Code skills directory:
- `.claude/skills/specs/templates/spec.template.md`

### Option 2: Quick Start
1. Create a new `.spec.md` file in the appropriate domain folder
2. Use the format above
3. Fill in the frontmatter and sections
4. Write acceptance criteria based on the user story
5. Identify edge cases and dependencies
6. Reference it in related specs

## Linking Specs to Tests

When writing test implementations (in `src/specs/core/`), reference the spec:

```typescript
/**
 * Spec: e2e/specs/checkout/guest-checkout.spec.md
 * Acceptance Criteria: AC1 - Guest can complete checkout without account
 */
Scenario('Guest can complete checkout flow', async () => {
  // Test implementation
})
  .tag('@guest-checkout')
  .tag('@checkout');
```

Then update the spec's Test Coverage Map with the test file location and line number.

## Spec Lifecycle

```
draft  ──[team review]──>  active  ──[implement]──>  tests passing
         ↓
     needs changes
```

- **draft** — Under discussion, not ready for implementation
- **active** — Actively being implemented or already live in production
- **deprecated** — Feature being phased out or replaced

Update the status as the feature progresses.

## Test Plans

For higher-level test strategy and coverage mapping across multiple specs, see `../test-plans/`.

Test plans bridge the gap between specs (what) and test implementations (how).

## Version Control

Feature specs are committed to git, so:
- Changes are tracked in commit history
- Specs can be reviewed like code (see git blame for who wrote what)
- Specs are part of the project documentation forever
- Use git blame to understand when and why a spec changed

## Helpful Links

- **E2E Test Setup**: See `../CLAUDE.md` for CodeceptJS patterns and test authoring
- **Test Plans**: See `../test-plans/README.md` for test strategy
- **Test Implementations**: See `../src/specs/core/` for actual test code
