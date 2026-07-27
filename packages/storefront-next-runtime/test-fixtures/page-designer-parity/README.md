# Page Designer Parity Fixtures

Frozen-output fixtures used by the Page Designer Attribute Serialization
parity harness.

Each fixture pairs:

- A canonical input **`PageManifest`** captured offline against an ECOM
  stack with the new manifest builder.
- The corresponding canonical SCAPI `getPage` JSON response captured
  against the same ECOM stack with a known request host.

The MRT-side test harness drives `(manifest input) → resolvePage(...) →
expected SCAPI output` for each fixture and asserts byte-equal output
after JSON canonicalisation.

## Layout

```
packages/storefront-next-runtime/test-fixtures/page-designer-parity/
├── README.md                 — this file
├── index.ts                  — fixture loader (typed, no runtime deps)
└── fixtures/
    └── <fixture-id>/
        ├── manifest.json     — canonical PageManifest input
        ├── expected.json     — canonical SCAPI getPage output
        └── meta.json         — request host, locale, defaultLocale, …
```

## Conventions

- **No JS runtime in the fixtures dir.** Files are JSON only. The
  `index.ts` loader lives alongside as a pure data accessor so both
  ECOM-side tests (when run) and MRT-side tests can depend on the same
  source of truth. Keep it dependency-free so it can be imported from
  any package.
- **Add fixtures via PR alongside both consumers.** Fixture changes
  always land in a single PR with both the ECOM-side and MRT-side
  parity harnesses updated together.
- **Captures are reproducible.** The `meta.json` records the ECOM stack
  identifier, request host, locale, default locale, and SCAPI capture
  timestamp so any fixture can be regenerated from the same source.

## Acceptance criterion

Harness must keep at least one trivial fixture passing — a page with
one `string`-typed component attribute. Each new attribute type added
to the resolver lands with a corresponding fixture.
