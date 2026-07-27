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
 * Browser-side correlation id for one shopper's checkout journey. Spans the
 * cart's Checkout button click through Place Order finalize, so log lines
 * from any checkout-flow request can be stitched together.
 *
 * The id is sent on the standard `x-correlation-id` header that the
 * storefront's `correlationMiddleware` already consumes; the logger
 * automatically attaches it to every log line via context, so no per-route
 * plumbing is needed - just send the same id on every fetch in the journey.
 *
 * Today the place-order routes (prepare / finalize) are the consumers via
 * the standard middleware. A follow-on work item will extend the same id
 * to the other checkout actions (`submit-contact-info`,
 * `submit-shipping-address`, etc.) by having them send the header too.
 *
 * Stored in `sessionStorage` so it survives page reloads within the same
 * tab. Cleared on order-confirmation navigation (next checkout starts fresh).
 */

const STORAGE_KEY = 'checkoutCorrelationId';

/**
 * Returns the existing checkout correlation id, or mints a new one and
 * stores it. Safe to call on the cart page (mints early) and again on the
 * place-order click handler (reads existing).
 */
export function getOrCreateCheckoutCorrelationId(): string {
    if (typeof sessionStorage === 'undefined') {
        // SSR / non-browser fallback: mint a transient id; not stored.
        return crypto.randomUUID();
    }
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
}

/** Clear the correlation id. Call after order-confirmation navigation succeeds. */
export function clearCheckoutCorrelationId(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEY);
}
