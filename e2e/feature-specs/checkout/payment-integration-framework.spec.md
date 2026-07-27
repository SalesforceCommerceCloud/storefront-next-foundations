---
title: "Checkout: Payment Integration Framework"
domain: Checkout
status: active
created: 2026-05-02
last_updated: 2026-05-12
author: Avinash Kumar
---

# Checkout: Payment Integration Framework

## Overview

A provider-agnostic payment integration framework that allows any payment gateway (Stripe, Adyen, Braintree, CyberSource, PayPal, Klarna, etc.) to integrate with checkout without modifying core checkout code. Supports inline card payments, redirect-based flows (PayPal, Klarna, iDEAL), express wallets (Apple Pay, Google Pay), and deferred/webhook-confirmed methods (bank transfer, crypto). Payment integrations live as self-contained extensions; merchants enable or disable them via configuration.

## Acceptance Criteria

### Payment-WI-1: Inline Payment Flow

> As a shopper, I want to pay with my credit card on the checkout page so that I can complete my purchase without leaving the storefront.

- A merchant can install a payment extension and shoppers can complete card payments through that extension's UI on the checkout page
- If the extension's verification step fails, the order is not created and the shopper sees an error
- If the order creation fails after payment was authorized, the framework gives the extension an opportunity to void the authorization

### Payment-WI-2: Redirect Payment Flow

> As a shopper, I want to pay through a method that redirects me to the provider's site (PayPal, Klarna, iDEAL) so that I can use payment methods I trust without entering card details on the storefront.

- A merchant can install a redirect-based payment extension (e.g., PayPal, Klarna) and shoppers can complete payments by being redirected to the provider and back
- Returning to the checkout via the back button or refresh after a successful order does not create a duplicate order
- If the shopper's session has expired between leaving and returning, they see a clear error message and can restart checkout
- If the basket changed during the redirect (e.g., shopper opened another tab), the order is not created and the shopper sees a clear error
- Cross-site requests cannot mint redirect cookies for an arbitrary basket
- Tampered redirect cookies are rejected

### Payment-WI-3: Express Checkout (Wallets)

> As a shopper, I want to pay with Apple Pay / Google Pay / PayPal Express directly from the cart, PDP, or mini-cart so that I can skip the checkout form entirely.

- A merchant can install an express-checkout extension (Apple Pay, Google Pay, PayPal Express) and shoppers can place orders directly from cart, PDP, or mini-cart without filling the checkout form
- Hand-crafted POSTs to the express-checkout endpoint cannot place orders without a verified provider token

### Payment-WI-4: Deferred / Async-Confirmed Payment Flow

> As a shopper, I want to pay via methods that confirm asynchronously (bank transfer, crypto, SEPA direct debit) so that I can use my preferred local payment method even when settlement takes hours or days.

- A merchant can install a deferred-payment extension (bank transfer, crypto, SEPA) and shoppers can place orders that confirm later via webhook
- The order confirmation page shows a clear "payment pending" notice when the order is awaiting confirmation
- When the provider's webhook arrives, the extension can verify it and update the order status

### Payment-WI-5: Saved Payment Methods

> As a returning shopper, I want my previously-used payment methods to be available at checkout so that I can complete my purchase faster.

- Returning shoppers see their saved payment methods on the checkout payment step
- Selecting a saved card and clicking Place Order completes the purchase without re-entering card details
- Shoppers can opt to save a new card for future use

### Payment-WI-6: Order Confirmation

> As a shopper, I want a clear confirmation after I place my order so that I know what happened and what to expect next.

- Successful orders redirect to the order confirmation page
- When the registered-at-checkout flow was used, the confirmation page surfaces the account-creation outcome
- When the order's payment is still pending (deferred flows), the confirmation page shows a "payment pending" notice with guidance on what to expect

### Payment-WI-7: Reliability

> As a merchant, I want the checkout to be safe against double-charges and stranded shoppers so that I can run my business without manual reconciliation or refund queues.

- Repeated rapid clicks on Place Order do not place duplicate orders
- Network retries during checkout do not result in duplicate charges
- If a payment extension fails to attach a payment instrument, the framework refuses to create the order and surfaces a clear error
- If a redirect-based payment leaves the shopper stranded (provider redirects back with an error, session expired, etc.), the shopper lands back on the checkout page with a clear toast describing what happened

### Payment-WI-8: Operability

> As an operator, I want every payment-related event to be observable so that I can diagnose issues during incidents and reconcile failed payments without guesswork.

- Operators can find every payment-related event in MRT logs by filtering on a stable prefix
- Misconfigured deployments (missing signing secret) surface a warning at first request rather than failing only when a shopper triggers a redirect
- When a payment extension fails to recover from a failed order (orphaned authorization), operators have enough log detail to reconcile manually

### Payment-WI-9: Framework Activation

> As a merchant, I want the payment framework to stay dormant until I install and configure a payment extension so that the built-in checkout flow keeps working unchanged in deployments that don't use external gateways.

- When no payment extension is configured, the built-in checkout payment flow runs unchanged and framework-specific routes are not exposed
- Activation is explicit (a single configuration flag) — installing the framework files does not activate framework code paths until a merchant opts in

### Payment-WI-10: Internationalization

> As a shopper, I want payment-related messages to appear in my language so that I can understand what happened during checkout regardless of locale.

- All shopper-facing payment-related messages (error toasts, payment-pending notices, redirect status pages) are translatable

## Design

This section covers cross-cutting design decisions and the implementation surface. Per-work-item design notes follow.

### Payment Patterns

All payment interactions reduce to four orchestration patterns; the framework supports all of them through a single contract surface:

- **Inline:** card / saved-method tokenization happens on the checkout page; the order is created with a verified instrument
- **Redirect:** shopper leaves the page to authorize on the provider; framework round-trips state via a signed cookie
- **Express:** wallet SDK collects everything in its native sheet; framework receives the result on a dedicated endpoint
- **Deferred:** order is created with `paymentStatus: 'not_paid'`; the provider confirms asynchronously via webhook

The framework is pattern-agnostic — it dispatches the same set of hooks in the same order regardless. What differs is what the extension does inside each hook.

### Client-Side Contract: PaymentSubmissionRef

A mutable ref shared between the checkout container and the payment extension. The extension writes its callbacks (`onPaymentSubmit`, `onPaymentSuccess`, `onPaymentReturn`) and metadata (`flowType`, `idempotencyKey`, `returnUrl`) on mount; the checkout container reads them when the shopper clicks Place Order.

`onPaymentSubmit` is async-only and resolves with a discriminated-union `PaymentSubmitResult` (`ready` / `redirect` / `error`). The framework dispatches based on `status`. Sync inline flows resolve with `undefined` after calling `submitPlaceOrder` synchronously.

`onPaymentSuccess` is bound to a monotonic submission token. The effect that watches the payment fetcher only fires the callback when the live token still matches — protects against a stale callback firing on an unrelated fetcher transition.

A synchronous `isSubmitting` flag is set the moment the click handler enters and cleared on completion. Covers the async window between click and fetcher state transition during which a second click could re-enter `onPaymentSubmit`.

### Server-Side Contract: Action Hooks

Plain async functions invoked at specific lifecycle points during the place-order action:

| Hook ID | Blocking | Purpose |
|---|---|---|
| `sfcc.checkout.payments.beforePlaceOrder` | Yes | Verify payment, attach instrument to basket |
| `sfcc.checkout.payments.afterPlaceOrder` | No | Capture payment, fulfillment triggers |
| `sfcc.checkout.payments.onRedirectReturn` | Yes | Verify return params with provider after a redirect |
| `sfcc.checkout.payments.onExpressComplete` | Yes | Verify provider token, apply addresses + instrument |
| `sfcc.checkout.payments.onWebhook` | No | Process async payment confirmation |
| `sfcc.checkout.payments.onOrderFailure` | No | Void / refund orphaned authorization |

The framework defines a fixed set; extensions register handlers but cannot add new ones. Each hook has a typed data interface. Payment extensions implement only the hooks they need.

`AfterPlaceOrderHookData.order` is typed against the SCAPI Order schema.

### formData Contract

| Field | Direction | Purpose |
|---|---|---|
| `framework_paymentFlowType` | client → server | Presence signals "extension active"; value (`inline` / `redirect` / `deferred`) lets server hooks branch |
| `framework_idempotencyKey` | client → server | Per-checkout-session UUID forwarded to the PSP to deduplicate retries |
| `creditCardToken` | client → server | Saved-card token (SCAPI strips this from responses, so it must travel via formData) |

Field names are exported as `PAYMENT_FRAMEWORK_FIELDS` constants and imported by both client and server, so a typo on either side is impossible.

When extras are passed to `submitPlaceOrder(extraFormData)`, they last-write-win over the framework's auto-appended defaults. This lets a multi-pattern extension override `framework_paymentFlowType` per submission.

### Routes

| Route | Method | Purpose |
|---|---|---|
| `/action/place-order` | POST | Default place-order action; branches on `framework_paymentFlowType` |
| `/action/payment-redirect-init` | POST | Mints HMAC-signed redirect cookie; same-origin only, basketId-bound, UUID-shape idempotencyKey, providerName ≤ 64 chars, providerState ≤ 1 KB |
| `/action/payment-redirect-return` | GET | Thin loader. Validates cookie + stateToken, renders auto-submitting page. **Does not mutate state** (loaders re-run on prefetch / back-button) |
| `/action/payment-redirect-finalize` | POST | Re-validates cookie, runs `onRedirectReturn`, creates order, runs `afterPlaceOrder`. Cookie cleared on every response |
| `/action/payment-express-complete` | POST | Runs `onExpressComplete`. Refuses to create the order if no instrument was attached after the hook |
| `/action/payment-webhook?provider=<name>` | POST | Generic webhook dispatcher. Forwards raw body + headers to `onWebhook`. Framework does not verify signatures — that's the extension's job |

All routes return 404 when the framework is not enabled (see Framework Gating below).

### Redirect State Cookie

When the shopper is redirected to an external provider, both the client (React state) and server (per-shopper memory in a serverless instance) lose all checkout context. A signed cookie carries the state across the round-trip:

- Format: `<url-encoded-json>.<hmac-sha256-hex>`
- Flags: `httpOnly`, `Secure`, `SameSite=Lax`, `Max-Age=1800` (30 min)
- Signed with `PAYMENT_COOKIE_SECRET` (preferred) or `CLIENT_SECRET` (fallback). Secret is cached on first read.
- Length pre-check on signature (must be 64 hex chars) before timing-safe compare
- `stateToken` is server-generated (`crypto.randomUUID`); validated on return with timing-safe comparison
- `basketId` is verified against the current shopper's basket on init AND finalize
- `providerState` is capped at 1 KB
- Application-level expiry check on read

**Replay safety** — the GET return loader does not mutate state; it renders a small page that auto-POSTs to a separate finalize action. The finalize action clears the cookie on every response (success or failure) before any retry could see it. Combined with the cookie's 30-minute TTL and the basketId binding, this prevents prefetch / back-button / refresh from creating a duplicate order.

### Return-Page UX

The auto-submit page rendered by the GET return loader shows:

- A spinner with `aria-live="polite"` status region
- A clear "Completing your payment" message
- A "Don't close this window or use your browser's back button" guidance line
- A `<noscript>` fallback with an explicit Continue button
- A 30-second timeout that surfaces a "contact support" message rather than leaving the shopper on a frozen page
- HTML-attribute escape on the form-action interpolation (defense against XSS via attacker-controlled provider query strings)
- `Cache-Control: no-store` so a back-button hit doesn't reuse the page

### Idempotency

`framework_idempotencyKey` is generated once per checkout session (when the checkout page mounts) and threaded through three layers:

1. Auto-appended to every place-order form submission
2. Persisted in the redirect cookie across the round-trip to a provider
3. Forwarded by the extension to the PSP on every API call (e.g., Stripe `Idempotency-Key` header)

When the same operation is retried (network retry, accidental double-click, redirect replay), the PSP returns the original response instead of treating it as a new charge.

### Framework Gating

A single configuration flag, `app.payment.frameworkEnabled` (default `false`), gates all framework code paths:

- `place-order` ignores `framework_paymentFlowType` formData
- All `payment-*` routes return 404
- The built-in inline payment flow (template's own card form) runs unchanged

When set to `true`, framework code paths become active. Merchants opt in only after installing a payment extension.

The flag exists because the action-hook virtual module exposes `runHook(id, ctx)` but no introspection API for "is any handler registered?". Auto-detection would require an SDK-level scan of `target-config.json` files at build time. An explicit opt-in flag is a smaller, clearer alternative.

### Saved Payment Methods

Two models, distinguished by who holds the reusable token:

- **Token stored on Commerce Cloud** (Elavon, CyberSource): the gateway issues a `creditCardToken` that Commerce Cloud charges directly. The framework passes it through formData to `createPaymentInstrumentForOrder` so the platform preserves it on the customer profile.
- **Token stored on the provider** (Stripe, Adyen): the PSP's tokenization is opaque to Commerce Cloud. The framework saves only display metadata; the extension stores the PSP's customer ID against the Commerce Cloud profile (e.g., `c_stripeCustomerId` custom attribute) and charges via the extension's `beforePlaceOrder` hook on reuse.

### Webhook Verification Helpers

The framework provides three composable primitives in `lib/payment/webhook-signature.server.ts`:

- `verifyHmacSha256(rawBody, signature, secret)` — timing-safe HMAC-SHA256 verification
- `parseSignedHeader(header)` — parses Stripe-style `t=...,v1=...,v0=...` signature headers
- `isWithinReplayWindow(timestampSec, toleranceSec)` — replay-attack defense

Each PSP signs differently, so the framework cannot abstract verification fully. Extensions compose these primitives in their `onWebhook` handler. Extensions MUST verify signatures against the **raw body bytes** (provided as `rawBody` in hook data) — re-serialized JSON breaks signatures.

### Deferred Flow Lifecycle

The deferred pattern creates the order with `paymentStatus: 'not_paid'` and confirms via webhook. The order confirmation page does not auto-poll; the shopper sees the "Payment Pending" notice statically and gets an email when payment clears (sent by the extension when the webhook fires).

If the webhook never arrives, three layers of recovery apply:

1. Provider retries (most PSPs retry for hours-to-days on non-2xx)
2. SCFRA stuck-orders job detects orders with `paymentStatus: 'not_paid'` after a configurable threshold and fails them
3. Optional extension-side reconciliation (cron or queue-driven re-check against the provider's API)

Extensions MUST verify webhook signatures against raw bytes, apply a replay-window check, and apply state transitions idempotently (the same webhook may arrive multiple times).

### Post-Hook Contract Checks

When an extension is active, the framework asserts contracts after the extension's hooks run:

- `place-order`: after `beforePlaceOrder`, the basket must have a payment instrument attached. If not, the framework returns a clear error rather than letting SCAPI's `createOrder` fail with an opaque message.
- `payment-express-complete`: after `onExpressComplete`, the basket must have a payment instrument attached. If not, the framework refuses to create the order — defense against unverified POSTs that bypass the extension.

### Operability

- All payment route logs use the `[Payment] <route>:` prefix (matches the `[Turnstile]` convention)
- `onOrderFailure` hook failures are logged at error level with order/basket IDs so operators can manually reconcile orphaned authorizations
- `assertPaymentRedirectConfigured()` runs on the first request after deploy via the app-config middleware. Logs a warning if the signing secret is missing — deployments without payment extensions are unaffected; deployments using redirects see the warning at deploy time rather than from a shopper report
- Shopper-facing redirect failures land on `/checkout?error=<code>` with translated toast messages (`payment_expired`, `payment_invalid`, `basket_changed`, `payment_failed`, `order_failed`, `unexpected`). The query param is stripped from the URL after the toast fires.

### Configuration

| Variable | Required | Purpose |
|----------|----------|---------|
| `PUBLIC__app__payment__frameworkEnabled` | No (default `false`) | Master switch for framework activation |
| `PAYMENT_COOKIE_SECRET` | Recommended for production | Dedicated HMAC signing key for redirect cookies. Isolates payment-cookie integrity from SCAPI key rotation. |
| `CLIENT_SECRET` | Yes (for SCAPI) | Zero-config fallback signing key. Used only when `PAYMENT_COOKIE_SECRET` is not set, so the framework works out of the box on dev / staging without extra setup. |

### Extension Directory Convention

```
src/extensions/<provider-name>/
  target-config.json         # Hook registrations
  components/<provider>.tsx  # Client-side payment UI
  hooks/before-place-order.ts
  hooks/after-place-order.ts
  hooks/on-redirect-return.ts
  hooks/on-order-failure.ts
  hooks/on-webhook.ts
  lib/<provider>.server.ts   # Provider API client
  routes/...                 # Optional provider-specific routes (e.g., refund endpoints)
  types.ts
```

## Out of Scope (Tracked Separately)

- A complete reference implementation against the v3 contracts. The Stripe reference on `avinash.paymentPOC` validated the v1 contracts and needs to be ported forward.
- Rate limiting on framework routes — addressed at the infrastructure layer (MRT / Cloudflare / WAF), not at the application layer.
- Formal security review — the design captures the obvious threats (cookie tampering, CSRF, replay, XSS, cookie bloat, timing attacks) but a dedicated review is appropriate before going live.

## Testing

**Unit tests:**
- HMAC sign/verify round-trip, tamper detection, expiry, signature length pre-check, secret cache, secret rotation, fail-fast assertion
- Redirect-init: same-origin, basket binding, UUID idempotencyKey, providerName length, providerState size cap, malformed JSON
- Redirect-return: cookie validation, stateToken match, query-param forwarding, HTML-attribute escape (XSS guard), expired cookie
- Redirect-finalize: every error redirect path, cookie clear on every response, hook dispatch, success path
- Express-complete: post-hook contract check, structured error propagation, no-extension refusal
- Webhook signature helpers: HMAC verify, header parsing, replay window
- Webhook route: raw-body forwarding, header lowercasing, hook dispatch
- Place-order extension-active path: post-hook instrument check, billing-address bypass when extension active, framework-disabled config short-circuit
- Post-order helper: query param building, extra headers, basket destroy

**Planned E2E coverage:** redirect lifecycle including back-button replay, express checkout lifecycle, double-submit prevention, redirect session expiry, deferred-flow webhook + confirmation refresh.

## Documentation

- **Design doc:** `docs/README-CHECKOUT-PAYMENT-INTEGRATION-FRAMEWORK.md`
- **Feature spec:** `e2e/feature-specs/checkout/payment-integration-framework.spec.md`
- **Extension guide:** `src/extensions/README.md`

## References

- [Stripe Payment Element](https://stripe.com/docs/payments/payment-element)
- [SCAPI Shopper Orders](https://developer.salesforce.com/docs/commerce/commerce-api/)
- [React Router Actions](https://reactrouter.com/start/framework/actions)
