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
import { describe, it, expect } from 'vitest';

import { matchesTag, shouldRevalidateForTags, withRevalidateTags } from '.';

/**
 * @fileoverview Worked example of the recommended **tag catalog** convention — NOT shipped framework code.
 *
 * The primitives in `tags/` operate on plain strings, so the `.` / `:` tag syntax is easy to typo and a typo fails
 * silently (a tag that matches nothing simply never revalidates). A tag also crosses the action → `shouldRevalidate`
 * boundary as an untyped string: React Router types `actionResult` as `any`, so no type survives the wire.
 *
 * The convention that closes both gaps: give each domain its own tag catalog — a small typed module of builders, one
 * per domain (`tags/cart.ts`, `tags/product.ts`, …) — and import it on both sides. The builder encapsulates the syntax,
 * and a misspelled tag name becomes a compile error on each side independently. The tag names are merchant-specific, so
 * these catalogs belong in your own project — the framework ships only the primitives. The two catalogs below stand in
 * for those per-domain modules; the test proves the emitter/subscriber pair still matches through `matchesTag`.
 */

// Stands in for `tags/cart.ts` — the cart domain's catalog. Builders return `as const` so the literal tag type is kept.
const cartTags = {
    /** Broad subscription: any cart change. */
    all: 'cart.*',
    /** A specific line item — what a per-item mutation emits. */
    lineItem: (id: string) => `cart.lineItems:${id}` as const,
    totals: 'cart.totals',
} as const;

// Stands in for `tags/product.ts` — the product domain's catalog.
const productTags = {
    /** Any tag for a specific product — the pin a PDP subscribes with. */
    of: (sku: string) => `product:${sku}.*` as const,
    /** A specific product's price — what a price mutation emits. */
    priceOf: (sku: string) => `product:${sku}.price` as const,
} as const;

describe('tag catalog convention (worked example)', () => {
    it('the emitter spells tags through the same builders the subscriber does', () => {
        // Server action: report the tag it touched, generated from the catalog instead of a hand-typed string.
        const actionResult = withRevalidateTags({ ok: true }, [cartTags.lineItem('li-7')]);
        expect(actionResult.revalidateTags).toEqual(['cart.lineItems:li-7']);

        // Client route: subscribe with the same catalog. The broad cart subscription admits the specific emit.
        const shouldRevalidate = shouldRevalidateForTags([cartTags.all]);
        expect(
            shouldRevalidate({
                formMethod: 'POST',
                actionResult,
                defaultShouldRevalidate: false,
                nextParams: {},
            } as any)
        ).toBe(true);
    });

    it('a PDP pinned to one product revalidates only on that product', () => {
        const shouldRevalidate = shouldRevalidateForTags(({ params }) => [productTags.of(params.sku ?? '')]);

        const onThisProduct = {
            formMethod: 'POST',
            actionResult: withRevalidateTags({ ok: true }, [productTags.priceOf('ABC123')]),
            defaultShouldRevalidate: false,
            nextParams: { sku: 'ABC123' },
        };
        const onAnotherProduct = { ...onThisProduct, nextParams: { sku: 'XYZ789' } };

        expect(shouldRevalidate(onThisProduct as any)).toBe(true);
        expect(shouldRevalidate(onAnotherProduct as any)).toBe(false);
    });

    it('builders encapsulate the `.` / `:` syntax so the matching rules apply unchanged', () => {
        // "publish specific, subscribe broad": the specific emit matches the broad subscription, not the reverse.
        expect(matchesTag(cartTags.all, cartTags.lineItem('li-7'))).toBe(true);
        expect(matchesTag(cartTags.lineItem('li-7'), cartTags.lineItem('li-7'))).toBe(true);
        expect(matchesTag(cartTags.lineItem('li-7'), cartTags.lineItem('li-9'))).toBe(false);
    });
});
