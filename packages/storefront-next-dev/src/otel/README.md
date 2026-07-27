# OpenTelemetry spans

The storefront emits OpenTelemetry spans describing each inbound request and the
work it triggers. All tracing is gated by the `SFNEXT_OTEL_ENABLED=true` environment
variable; when unset, no spans, no propagator, and no instrumentation are installed.

Spans are written synchronously to stdout as JSON (`MrtConsoleSpanExporter` →
`console.info`). Managed Runtime (MRT) collects stdout and forwards it to the trace
backend — no in-process OTLP agent. See [`setup.ts`](./setup.ts) for the full
exporter rationale.

## Span catalog

| Span name | Kind | Emitted by | Fires when | Key attributes |
|---|---|---|---|---|
| `sfnext.request` | **SERVER** | Express middleware ([`express/middleware.ts`](./express/middleware.ts)) | Once per inbound HTTP request — the service entry point | `http.request.method`, `url.path`, `http.response.status_code`, `http.total_duration_ms` |
| `sfnext.response_streaming` | INTERNAL | Express middleware | From the first byte written (first `writeHead`/`write`) until the response stream closes | `http.request.method`, `url.path`, `http.streaming_duration_ms`, `http.response.status_code` |
| `sfnext.ssr` | INTERNAL | React Router handler ([`react-router/instrumentation.ts`](./react-router/instrumentation.ts)) | Around the SSR render for every request (document + data) | `http.request.method`, `url.path` |
| `sfnext.middleware` | INTERNAL | React Router route | Around each route middleware in the chain | `rr.route.id`, `http.route` |
| `sfnext.loader` | INTERNAL | React Router route | Around each route loader | `rr.route.id`, `http.route` |
| `sfnext.action` | INTERNAL | React Router route | Around each route action (mutations) | `rr.route.id`, `http.route` |
| `sfnext.fetch` | CLIENT | undici auto-instrumentation ([`setup.ts`](./setup.ts)) | Around every outbound `fetch` (SCAPI, SLAS, …) | `http.request.method`, `url.full`, `url.path`, `url.query`, `server.address`, `http.response.status_code` |

## Naming convention

Names are **low-cardinality operation identifiers** in a dotted `sfnext.*` namespace —
never the raw request path, a full URL, or any id. This is the OpenTelemetry guidance
(a span name is a coarse bucket the backend aggregates on; high-cardinality values
belong in attributes) and it mirrors MRT's own span names (`mrt.user_handler`,
`mrt.redirect_rule.lookup`). On MRT the log→trace bridge prepends `mrt.`, so
`sfnext.request` appears as `mrt.sfnext.request` next to MRT's platform spans.

Variable detail lives in attributes, not the name:

- The request method and path → `http.request.method` + `url.path`.
- The route → `http.route`, the **route template** (`:siteId/:localeId/product/:productId`),
  which is bounded/low-cardinality — never the resolved path with real ids.
- The outbound request → `sfnext.fetch` for every CLIENT span; the method, host, and
  full target live in `http.request.method`, `server.address`, and `url.full`.

`rr.route.id` is the React Router file-route id (e.g. `routes/_app.product.$productId`);
`http.route` is the URL pattern. They are distinct and both useful, so both are recorded.

## SpanKind

`kind` tells the backend each span's role; it drives the service topology map, RED
metrics, and client/server span pairing.

- **`sfnext.request` is `SERVER`** — it is the single inbound entry point for the
  storefront service. One SERVER span per request.
- **The route/render spans are `INTERNAL`** — in-process work within the same service,
  not a service boundary.
- **Outbound `fetch` spans are `CLIENT`** (set by the undici instrumentation) — they
  pair with the SERVER span of the service being called (e.g. SCAPI).

## Trace hierarchy

One inbound request = one trace, rooted at the `SERVER` span. A localized home-page
render (`GET /global/en-US/`) looks like this:

```
sfnext.request                      [SERVER]  url.path=/global/en-US/
├─ sfnext.ssr                       [INTERNAL]
│  └─ sfnext.middleware  (× N)      [INTERNAL]  rr.route.id=root        ← see note
│     ├─ sfnext.fetch               [CLIENT]    /shopper/auth/.../oauth2/token  (SLAS)
│     ├─ sfnext.loader              [INTERNAL]  rr.route.id=root
│     ├─ sfnext.loader              [INTERNAL]  rr.route.id=routes/_app
│     │  ├─ sfnext.fetch            [CLIENT]    /experience/.../components/header
│     │  └─ sfnext.fetch            [CLIENT]    /product/.../categories/{id}    (× categories)
│     └─ sfnext.loader              [INTERNAL]  rr.route.id=routes/_app._index
│        ├─ sfnext.fetch            [CLIENT]    /experience/.../pages/homepage
│        ├─ sfnext.fetch            [CLIENT]    /search/.../product-search
│        └─ sfnext.fetch            [CLIENT]    /customer/.../product-lists
└─ sfnext.response_streaming        [INTERNAL]
```

> **Note — middleware nesting.** React Router runs middleware as an onion (each layer
> calls the next), and the instrumentation wraps each layer with `startActiveSpan`, so
> `sfnext.middleware` spans **nest linearly** and there are many of them per request
> (the root middleware chain alone produced ~20). They all carry `rr.route.id=root` /
> `http.route=/` and are indistinguishable from one another — this is inherent to how RR
> instruments the chain, not a naming issue. The rename makes them aggregate cleanly
> under one operation name (`sfnext.middleware`); it does not reduce the per-request count.

## MRT log→trace bridge

On MRT, stdout is the only export path. The bridge tails our JSON, **re-authors** each
span inside MRT's own pipeline (`service.name: mrt-customer-data-plane`,
`telemetry.sdk.language: python`), and prepends `mrt.` to the name. It carries over the
name, trace/parent topology, timing, **and our span attributes**. Because the bridge
keeps attributes, the low-cardinality-name + rich-attribute design above is the correct
target (this reverses an earlier interim guidance that briefly pushed all detail into
the name while attribute digestion was unavailable).

`forwardTrace` and the snake_case `start_time`/`end_time` keys in the emitted JSON are
required by the bridge — see [`mrt-console-span-exporter.ts`](./mrt-console-span-exporter.ts).

## Validation & tests

- Unit tests assert each name/kind/attribute set:
  [`express/middleware.test.ts`](./express/middleware.test.ts),
  [`react-router/instrumentation.test.ts`](./react-router/instrumentation.test.ts).
- End-to-end propagation (real pipeline, spans read off `console.info`):
  [`propagation.integration.test.ts`](./propagation.integration.test.ts).
