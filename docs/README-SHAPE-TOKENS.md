# Shape Tokens

Shape tokens control border-radius, box-shadow, and border-width across the shadcn primitives in one place. Instead of putting `rounded-xl` / `shadow-md` on each component, the primitives carry token-driven utilities (`rounded-ui`, `shadow-ui`, `border-ui`) that read CSS variables. Change the variable, and every primitive re-skins at once.

`rounded-ui` and `shadow-ui` apply to 19 primitives (Card, Button, Input, Dialog, Checkbox, etc.). `border-ui` currently applies to **Card only** — other primitives (Input, Dialog, etc.) use Tailwind's built-in `border` (1px).

## Source vs Bridge Variables (read this first)

There are two layers of variables — only one of them is writable at runtime. **This is the single most common subtle bug in this system**, so it's worth understanding before you touch any primitive.

| Variable | Where defined | When read | Override here? |
|---|---|---|---|
| `--ui-radius` / `--ui-shadow` / `--ui-border-width` | `src/theme/tokens/core.css` | Runtime | **Yes — always.** This is the runtime API. |
| `--radius-ui` / `--shadow-ui` | `src/theme/tailwind.css` `@theme inline` block | **Compile time only — does NOT exist at runtime** | **Never.** Writing to these is a silent no-op. |

The bridge variables exist purely to register the Tailwind utilities (`rounded-ui`, `shadow-ui`). Tailwind v4's `@theme inline` directive **inlines the lookup at compile time**, which means:

```css
/* You write this in tailwind.css: */
@theme inline {
    --radius-ui: var(--ui-radius);
}

/* Tailwind compiles .rounded-ui to: */
.rounded-ui {
    border-radius: var(--ui-radius);  /* reads the source variable directly */
}
```

The variable name `--radius-ui` is **gone** from the served CSS. Only `--ui-radius` exists at runtime, and the only way to change what `.rounded-ui` renders is to override `--ui-radius`.

**`border-ui` works differently** because it's an `@utility` block, not `@theme inline`:

```css
@utility border-ui {
    border-style: solid;
    border-width: var(--ui-border-width);  /* read at runtime */
}
```

The `@utility` directive does NOT inline; the compiled `.border-ui` rule still references `--ui-border-width` at runtime, so writes to that variable take effect.

**Practical rule for everything below:** when an element needs different shape, override `--ui-radius` / `--ui-shadow` / `--ui-border-width`. Never `--radius-ui` / `--shadow-ui`.

## Token Definitions

Your three source tokens are defined in `src/theme/tokens/core.css`:

```css
:root {
    --ui-radius: var(--radius-xl);   /* radius for rounded-ui (Card, Button, Input, …) */
    --ui-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);  /* shadow for shadow-ui (Card) */
    --ui-border-width: 0;            /* width for border-ui (Card) */
}
```

Set these to whatever your brand needs (`0` for a flat, square look; a larger radius and a soft shadow for a rounded, raised look). Every primitive that uses the token utilities adopts the new values automatically.

## Card Base Class

```tsx
"bg-card text-card-foreground flex flex-col gap-6 rounded-ui border-ui border-border py-6 shadow-ui"
```

- `border-ui` — sets width from `--ui-border-width`
- `border-border` — sets default color (overridable via `border-primary`, etc.)
- `rounded-ui` — sets radius from `--ui-radius`
- `shadow-ui` — sets shadow from `--ui-shadow`

## Scoped Overrides

### Per-component (CSS variable scoping)

To give one component a different shape, scope the source variables to it in `src/theme/base.css`. **Always target the source variables.**

```css
/* ✅ Correct */
.product-card[data-slot="card"] {
    --ui-radius: var(--radius-2xl);
    --ui-shadow: 0 4px 16px -4px rgb(0 0 0 / 0.12);
}

/* ❌ Silent no-op — bridge variables are inlined at compile time */
.product-card[data-slot="card"] {
    --radius-ui: var(--radius-2xl);
    --shadow-ui: 0 4px 16px -4px rgb(0 0 0 / 0.12);
}
```

### Section-level (`:where()` pattern)

To re-shape a whole section — e.g. give Cards on account / auth / checkout pages a 1px border and no shadow for delineation:

```css
:where([data-testid="account-layout"]) [data-slot="card"],
:where([data-section="auth"]) [data-slot="card"],
:where([data-section="checkout"]) [data-slot="card"] {
    --ui-border-width: 1px;
    --ui-shadow: none;
}
```

`:where()` keeps specificity at `(0,0,1)` so per-card className overrides still win. **Cascade order matters when two `:where()` blocks target the same `data-slot`** — the later block wins because both have the same specificity. Place section overrides AFTER any general primitive surface block they need to defeat.

### Per-instance (className)

Use Tailwind's arbitrary property syntax. Always target the source variable:

```tsx
{/* ✅ Correct — source variable */}
<Card className="[--ui-border-width:2px] border-primary">
<Card className="[--ui-radius:var(--radius-xl)]">
<Card className="[--ui-shadow:none]">

{/* ❌ Silent no-op — Tailwind inlines the bridge name at compile time */}
<Card className="[--radius-ui:var(--radius-xl)]">
<Card className="[--shadow-ui:none]">
```

## tailwind-merge Configuration

`border-ui` is registered as its own class group so `cn()` doesn't strip it when combined with border-color utilities (in `src/lib/utils.ts`):

```ts
const twMerge = extendTailwindMerge<'border-ui'>({
    extend: {
        classGroups: { 'border-ui': ['border-ui'] },
        conflictingClassGroups: {},
    },
});
```

Result: `cn('border-ui border-border', 'border-primary')` → `border-ui border-primary` (width preserved, color swapped).

## Do / Don't Reference

### Component className

| Do | Don't | Why |
|---|---|---|
| `<Card className="[--ui-border-width:2px] border-primary">` | `<Card className="border-2 border-primary">` | `border-2` doesn't override `border-ui`'s variable; both classes coexist and source order decides |
| `<Card className="[--ui-radius:var(--radius-xl)]">` | `<Card className="[--radius-ui:var(--radius-xl)]">` | Bridge variable is inlined at compile time — write does nothing |
| `<Card className="[--ui-radius:var(--radius-xl)]">` | `<Card className="rounded-xl">` | `rounded-xl` and `rounded-ui` coexist; the token still applies |
| `<Card className="[--ui-shadow:none]">` | `<Card className="[--shadow-ui:none]">` | Same bridge-variable trap as above |
| `<Card className="[--ui-border-width:1px]">` | `<Card className="border">` | `border` sets width:1px but `border-ui` reads from the variable — use the variable |
| (nothing — token is already 0) | `<Card className="rounded-none shadow-none">` | Redundant when `--ui-radius: 0` and `--ui-shadow: none` |

### CSS (`base.css` / theme)

| Do | Don't | Why |
|---|---|---|
| `--ui-radius: var(--radius-2xl)` | `--radius-ui: var(--radius-2xl)` | Bridge variable is inlined; runtime write is a silent no-op |
| `--ui-shadow: 0 4px 16px ...` | `--shadow-ui: 0 4px 16px ...` | Same bridge-variable trap |
| `--ui-radius: var(--radius-2xl)` | `border-radius: 1rem` | Source token; primitives read from `--ui-radius` |
| `--ui-shadow: 0 4px 16px ...` | `box-shadow: 0 4px 16px ...` | Source token; primitives read from `--ui-shadow` |
| `--ui-border-width: 1px` | `border-width: 1px` | `border-ui` reads the variable; hardcoded CSS bypasses it |
| `:where([data-section="auth"]) [data-slot="card"]` | `[data-section="auth"] [data-slot="card"]` | `:where()` keeps specificity low for className overridability |
| `[data-slot="card"]` for targeting | `.my-card` or `[data-testid="..."]` | `data-slot` is the semantic hook; testids are for testing, not styling |

### Anti-patterns that cause drift

| Anti-pattern | What happens | Fix |
|---|---|---|
| Writing to `--radius-ui` / `--shadow-ui` (the bridge vars) | Silent no-op — bridge is inlined at compile time. Override never takes effect, but typecheck/lint stay green. **Most common subtle bug in this system.** | Write to `--ui-radius` / `--ui-shadow` instead |
| Adding `rounded-none` to neutralize shape | Works today but breaks the moment the token changes to non-zero | Remove it; set the token value instead |
| `!important` on shape classes (`!rounded-none`) | Can't be overridden by the token system | Remove; the token system uses normal cascade |
| `border-radius: 0.75rem` hardcoded in CSS | Doesn't respond to token changes | Use `--ui-radius: var(--radius-xl)` |
| Using `border` class to add width to Card | `cn()` doesn't know `border` conflicts with `border-ui`; both stay, source order decides | Use `[--ui-border-width:1px]` |
| Targeting Tailwind utility classes in CSS (`.bg-cover`, `.capitalize`) | Breaks when a component refactors to different Tailwind classes | Use `data-slot` attributes |
