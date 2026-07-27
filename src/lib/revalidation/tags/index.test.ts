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
import {
    matchesTag,
    normalizeTags,
    tagGroup,
    resolveTags,
    tagImplications,
    shouldRevalidateForTags,
    withRevalidateTags,
    type TagGroup,
} from '.';

/**
 * Builds the subset of `ShouldRevalidateFunctionArgs` that `shouldRevalidateForTags` reads.
 * Defaults model a successful, tag-reporting mutation; override per case.
 */
function buildCtx(overrides: {
    formMethod?: string;
    actionStatus?: number;
    actionResult?: { revalidateTags?: unknown; [key: string]: unknown };
    defaultShouldRevalidate?: boolean;
    nextParams?: Record<string, string | undefined>;
}) {
    return {
        formMethod: 'POST',
        actionStatus: 200,
        actionResult: { revalidateTags: ['cart'] },
        defaultShouldRevalidate: false,
        nextParams: {},
        ...overrides,
    } as any;
}

describe('tagImplications', () => {
    it('returns the emitted tags unchanged when nothing matches', () => {
        const expand = tagImplications({ 'cart.lineItems': ['cart.totals'] });
        expect(expand(['product:ABC123.price'])).toEqual(['product:ABC123.price']);
    });

    it('returns an empty array for no emitted tags', () => {
        const expand = tagImplications({ 'cart.lineItems': ['cart.totals'] });
        expect(expand([])).toEqual([]);
    });

    it('returns the emitted tags unchanged against an empty implication map', () => {
        const expand = tagImplications({});
        expect(expand(['cart.lineItems:li-7'])).toEqual(['cart.lineItems:li-7']);
    });

    it('adds the implied tags when a trigger matches', () => {
        const expand = tagImplications({ 'cart.lineItems': ['cart.totals', 'cart.itemCount'] });
        expect(expand(['cart.lineItems:li-7'])).toEqual(['cart.lineItems:li-7', 'cart.totals', 'cart.itemCount']);
    });

    it('matches a trigger structurally, not by string equality', () => {
        // The trigger 'store' matches the emitted 'store' via matchesTag, then implies shipping.
        const expand = tagImplications({ store: ['cart.shipping'] });
        expect(expand(['store'])).toEqual(['store', 'cart.shipping']);
    });

    it('fires every trigger that matches a single emitted tag', () => {
        const expand = tagImplications({
            'cart.lineItems': ['cart.totals'],
            'cart.*': ['cart.itemCount'],
        });
        expect(expand(['cart.lineItems:li-7'])).toEqual(['cart.lineItems:li-7', 'cart.totals', 'cart.itemCount']);
    });

    it('expands each of several emitted tags', () => {
        const expand = tagImplications({
            'cart.lineItems': ['cart.totals'],
            'cart.promotions': ['cart.totals'],
        });
        // The emitted tags seed the result set first, so implied tags append after both.
        expect(expand(['cart.lineItems', 'cart.promotions'])).toEqual([
            'cart.lineItems',
            'cart.promotions',
            'cart.totals',
        ]);
    });

    it('deduplicates an implied tag that is already emitted', () => {
        const expand = tagImplications({ 'cart.lineItems': ['cart.totals'] });
        expect(expand(['cart.lineItems', 'cart.totals'])).toEqual(['cart.lineItems', 'cart.totals']);
    });

    it('expands transitively — an implied tag is itself re-triggered', () => {
        // 'store' implies 'cart.shipping', which in turn implies 'cart.totals'.
        const expand = tagImplications({
            store: ['cart.shipping'],
            'cart.shipping': ['cart.totals'],
        });
        expect(expand(['store'])).toEqual(['store', 'cart.shipping', 'cart.totals']);
    });

    it('chains transitively across multiple hops', () => {
        const expand = tagImplications({
            a: ['b'],
            b: ['c'],
            c: ['d'],
        });
        expect(expand(['a'])).toEqual(['a', 'b', 'c', 'd']);
    });

    it('tolerates a cyclic implication without infinite expansion', () => {
        // a → b → a. The visited guard stops re-queuing already-seen tags.
        const expand = tagImplications({
            a: ['b'],
            b: ['a'],
        });
        expect(expand(['a'])).toEqual(['a', 'b']);
    });

    it('treats a `.*` in an implied value as a literal segment, not a wildcard', () => {
        // Implied values land on the emitted side, where `.*` is the literal segment name `*` — it does NOT fan out
        // to a subscriber's children. So an implied 'cart.*' only intersects a subscription that itself reads the
        // literal 'cart.*', never the real 'cart.totals' the author likely meant. Implied values must stay concrete.
        const expand = tagImplications({ store: ['cart.*'] });
        const expanded = expand(['store']);
        expect(expanded).toEqual(['store', 'cart.*']);
        // The expanded literal matches only a literal 'cart.*' subscription, not a concrete child tag.
        expect(matchesTag('cart.*', 'cart.*')).toBe(true);
        expect(matchesTag('cart.totals', 'cart.*')).toBe(false);
    });
});

describe('shouldRevalidateForTags', () => {
    describe('falls back to the RR default', () => {
        it('for a plain GET navigation (no submission)', () => {
            const fn = shouldRevalidateForTags(['cart']);
            expect(fn(buildCtx({ formMethod: 'GET', defaultShouldRevalidate: true }))).toBe(true);
            expect(fn(buildCtx({ formMethod: 'GET', defaultShouldRevalidate: false }))).toBe(false);
        });

        it('for a revalidation that carries no formMethod (e.g. explicit revalidate())', () => {
            const fn = shouldRevalidateForTags(['cart']);
            expect(fn(buildCtx({ formMethod: undefined, defaultShouldRevalidate: true }))).toBe(true);
            expect(fn(buildCtx({ formMethod: undefined, defaultShouldRevalidate: false }))).toBe(false);
        });

        it('for a failed action that reports no tags', () => {
            const fn = shouldRevalidateForTags(['cart']);
            expect(fn(buildCtx({ actionStatus: 500, actionResult: { ok: true }, defaultShouldRevalidate: true }))).toBe(
                true
            );
            expect(
                fn(buildCtx({ actionStatus: 422, actionResult: { ok: true }, defaultShouldRevalidate: false }))
            ).toBe(false);
        });

        it('when the action reports no tags', () => {
            const fn = shouldRevalidateForTags(['cart']);
            expect(fn(buildCtx({ actionResult: { revalidateTags: [] }, defaultShouldRevalidate: true }))).toBe(true);
            expect(fn(buildCtx({ actionResult: { ok: true }, defaultShouldRevalidate: false }))).toBe(false);
        });

        it('when a submission left no action result (action returned null/undefined or threw)', () => {
            // `formMethod` still marks this as a submission, so the route falls back to the RR default
            // (which revalidates after an action) rather than being misclassified as a navigation.
            const fn = shouldRevalidateForTags(['cart']);
            expect(fn(buildCtx({ actionResult: undefined, defaultShouldRevalidate: true }))).toBe(true);
            expect(fn(buildCtx({ actionResult: undefined, defaultShouldRevalidate: false }))).toBe(false);
        });
    });

    describe('status-independent tag matching', () => {
        // Tags decide regardless of HTTP status: a failed action that already touched server state
        // (partial write, 409 conflict, idempotency edge) must still revalidate the routes that
        // subscribe to what it touched. Optimistic-UI rollback is handled by RR independently of this.
        it('matches reported tags on a failed action (4xx/5xx) just as on a successful one', () => {
            const fn = shouldRevalidateForTags(['cart']);
            for (const actionStatus of [200, 299, 409, 422, 500, undefined]) {
                expect(
                    fn(
                        buildCtx({
                            actionStatus,
                            actionResult: { revalidateTags: ['cart'] },
                            defaultShouldRevalidate: false,
                        })
                    )
                ).toBe(true);
            }
        });

        it('does not revalidate a failed action whose reported tags do not match', () => {
            const fn = shouldRevalidateForTags(['product.*']);
            expect(
                fn(
                    buildCtx({
                        actionStatus: 500,
                        actionResult: { revalidateTags: ['cart.lineItems'] },
                        defaultShouldRevalidate: true,
                    })
                )
            ).toBe(false);
        });
    });

    describe('tag intersection', () => {
        it('revalidates when a declared tag matches an emitted tag', () => {
            const fn = shouldRevalidateForTags(['cart.*']);
            expect(fn(buildCtx({ actionResult: { revalidateTags: ['cart.lineItems:li-7'] } }))).toBe(true);
        });

        it('does not revalidate when no declared tag matches', () => {
            const fn = shouldRevalidateForTags(['product.*']);
            expect(fn(buildCtx({ actionResult: { revalidateTags: ['cart.lineItems'] } }))).toBe(false);
        });

        it('resolves a dynamic spec from nextParams', () => {
            const fn = shouldRevalidateForTags(({ params }) => [`product:${params.pid}.*`]);
            expect(
                fn(
                    buildCtx({
                        nextParams: { pid: 'ABC123' },
                        actionResult: { revalidateTags: ['product:ABC123.price'] },
                    })
                )
            ).toBe(true);
            expect(
                fn(
                    buildCtx({
                        nextParams: { pid: 'ABC123' },
                        actionResult: { revalidateTags: ['product:DEF456.price'] },
                    })
                )
            ).toBe(false);
        });

        it('expands tag groups in the declaration', () => {
            const cartTotals = tagGroup('cart.totals', ['cart.lineItems.*']);
            const fn = shouldRevalidateForTags([cartTotals]);
            expect(fn(buildCtx({ actionResult: { revalidateTags: ['cart.lineItems:li-7'] } }))).toBe(true);
        });
    });

    describe('ambient tags', () => {
        it('is empty by default — a cross-cutting tag does not match an unrelated subscription', () => {
            const fn = shouldRevalidateForTags(['cart']);
            expect(
                fn(buildCtx({ actionResult: { revalidateTags: ['currency'] }, defaultShouldRevalidate: false }))
            ).toBe(false);
        });

        it('omits ambient tags when ambient is disabled', () => {
            const fn = shouldRevalidateForTags(['cart'], { ambient: false });
            expect(
                fn(buildCtx({ actionResult: { revalidateTags: ['currency'] }, defaultShouldRevalidate: false }))
            ).toBe(false);
        });
    });

    describe('implication expander', () => {
        it('expands emitted tags before matching', () => {
            const expand = tagImplications({ 'cart.lineItems': ['cart.totals'] });
            const fn = shouldRevalidateForTags(['cart.totals'], { ambient: false, expand });
            // Emitted 'cart.lineItems' does not match 'cart.totals' directly, but the
            // expander adds 'cart.totals', which then intersects.
            expect(fn(buildCtx({ actionResult: { revalidateTags: ['cart.lineItems'] } }))).toBe(true);
        });
    });

    describe('composition with a custom shouldRevalidate (escape hatch)', () => {
        // Mirrors the documented pattern: keep the tag decision as the base and
        // layer an extra runtime guard (drawer open, read from the URL) on top.
        const revalidateCart = shouldRevalidateForTags(['cart.*']);
        const shouldRevalidate = (args: ReturnType<typeof buildCtx> & { nextUrl: URL }) =>
            revalidateCart(args) && args.nextUrl.searchParams.get('drawer') === 'open';

        const withDrawer = (state: string, overrides: Parameters<typeof buildCtx>[0]) => ({
            ...buildCtx(overrides),
            nextUrl: new URL(`https://example.test/cart?drawer=${state}`),
        });

        it('revalidates only when the tag matches AND the extra guard passes', () => {
            expect(
                shouldRevalidate(withDrawer('open', { actionResult: { revalidateTags: ['cart.lineItems:li-7'] } }))
            ).toBe(true);
        });

        it('does not revalidate when the tag matches but the extra guard fails', () => {
            expect(
                shouldRevalidate(withDrawer('closed', { actionResult: { revalidateTags: ['cart.lineItems:li-7'] } }))
            ).toBe(false);
        });

        it('does not revalidate when the guard passes but the tag does not match', () => {
            expect(
                shouldRevalidate(withDrawer('open', { actionResult: { revalidateTags: ['product:ABC123.price'] } }))
            ).toBe(false);
        });
    });
});

describe('withRevalidateTags', () => {
    it('merges the tags into the data under revalidateTags', () => {
        expect(withRevalidateTags({ line: { id: 'li-7' } }, ['cart.lineItems:li-7'])).toEqual({
            line: { id: 'li-7' },
            revalidateTags: ['cart.lineItems:li-7'],
        });
    });

    it('adds revalidateTags to an empty data object', () => {
        expect(withRevalidateTags({}, ['cart'])).toEqual({ revalidateTags: ['cart'] });
    });

    it('overwrites any existing revalidateTags field', () => {
        expect(withRevalidateTags({ revalidateTags: ['stale'] }, ['cart'])).toEqual({ revalidateTags: ['cart'] });
    });
});

describe('tagGroup', () => {
    it('bundles a tag with its declared deps', () => {
        const group = tagGroup('cart.totals', ['cart.lineItems.*', 'cart.promotions']);
        expect(group).toEqual({ tag: 'cart.totals', deps: ['cart.lineItems.*', 'cart.promotions'] });
    });

    it('defaults deps to an empty array when omitted', () => {
        expect(tagGroup('cart.totals')).toEqual({ tag: 'cart.totals', deps: [] });
    });

    it('accepts nested tag groups as deps', () => {
        const cartTotals = tagGroup('cart.totals', ['cart.lineItems.*']);
        const cartShipping = tagGroup('cart.shipping', [cartTotals, 'store']);
        expect(cartShipping.deps).toEqual([cartTotals, 'store']);
    });
});

describe('resolveTags', () => {
    it('passes plain string specs through unchanged', () => {
        expect(resolveTags(['cart.totals', 'store'])).toEqual(['cart.totals', 'store']);
    });

    it('returns an empty array for no specs', () => {
        expect(resolveTags([])).toEqual([]);
    });

    it('expands a group to its tag followed by its deps', () => {
        const cartTotals = tagGroup('cart.totals', ['cart.lineItems.*', 'cart.promotions']);
        expect(resolveTags([cartTotals])).toEqual(['cart.totals', 'cart.lineItems.*', 'cart.promotions']);
    });

    it('expands a group with no deps to just its tag', () => {
        expect(resolveTags([tagGroup('cart.totals')])).toEqual(['cart.totals']);
    });

    it('expands nested groups transitively', () => {
        const cartTotals = tagGroup('cart.totals', ['cart.lineItems.*', 'cart.promotions']);
        const cartShipping = tagGroup('cart.shipping', [cartTotals, 'store']);
        expect(resolveTags([cartShipping])).toEqual([
            'cart.shipping',
            'cart.totals',
            'cart.lineItems.*',
            'cart.promotions',
            'store',
        ]);
    });

    it('resolves a mix of strings and groups in order', () => {
        const cartTotals = tagGroup('cart.totals', ['cart.lineItems.*']);
        expect(resolveTags([cartTotals, 'order.confirmation'])).toEqual([
            'cart.totals',
            'cart.lineItems.*',
            'order.confirmation',
        ]);
    });

    it('tolerates a reference cycle, keeping each tag without infinite recursion', () => {
        // a.deps → b, b.deps → a — built with mutable deps, then frozen into the readonly type.
        const a = { tag: 'a', deps: [] as TagGroup[] };
        const b = { tag: 'b', deps: [a] as TagGroup[] };
        a.deps.push(b);
        expect(resolveTags([a])).toEqual(['a', 'b', 'a']);
    });
});

describe('normalizeTags', () => {
    it('returns a string array unchanged', () => {
        expect(normalizeTags(['cart', 'cart.lineItems', 'checkout.update', 'product:ABC123.price'])).toEqual([
            'cart',
            'cart.lineItems',
            'checkout.update',
            'product:ABC123.price',
        ]);
    });

    it('stringifies non-string array elements', () => {
        expect(normalizeTags([1, true, null, undefined])).toEqual(['1', 'true', 'null', 'undefined']);
    });

    it('uses an element custom toString when stringifying', () => {
        expect(normalizeTags([{ toString: () => 'cart.totals' }])).toEqual(['cart.totals']);
    });

    it('preserves an empty array', () => {
        expect(normalizeTags([])).toEqual([]);
    });

    it.each([
        ['undefined', undefined],
        ['null', null],
        ['a string', 'cart'],
        ['a number', 42],
        ['a plain object', {}],
    ])('returns an empty array for a non-array value (%s)', (_label, value) => {
        expect(normalizeTags(value)).toEqual([]);
    });
});

describe('matchesTag', () => {
    describe('exact, single-segment matches', () => {
        it('matches identical tags', () => {
            expect(matchesTag('cart', 'cart')).toBe(true);
        });

        it('rejects different segment names', () => {
            expect(matchesTag('cart', 'product')).toBe(false);
        });

        it('rejects when the pattern is a prefix string but not a structural prefix', () => {
            // 'cart' must not match 'cartItems' — segment names compare whole, not substring.
            expect(matchesTag('cart', 'cartItems')).toBe(false);
        });
    });

    describe('segment-count rules (no wildcard)', () => {
        it('matches multi-segment tags with equal segment counts', () => {
            expect(matchesTag('cart.lineItems', 'cart.lineItems')).toBe(true);
        });

        it('rejects when the pattern has fewer segments than the emitted tag', () => {
            expect(matchesTag('cart', 'cart.lineItems')).toBe(false);
        });

        it('rejects when the pattern has more segments than the emitted tag', () => {
            expect(matchesTag('cart.lineItems', 'cart')).toBe(false);
        });

        it('rejects when a non-leading segment name differs', () => {
            expect(matchesTag('cart.lineItems', 'cart.totals')).toBe(false);
        });
    });

    describe('wildcard suffix (.*)', () => {
        it('matches the prefix domain itself', () => {
            expect(matchesTag('cart.*', 'cart')).toBe(true);
        });

        it('matches one level below the prefix', () => {
            expect(matchesTag('cart.*', 'cart.lineItems')).toBe(true);
        });

        it('matches multiple levels below the prefix', () => {
            expect(matchesTag('cart.*', 'cart.lineItems:li-7')).toBe(true);
        });

        it('matches an instance-pinned tag below the prefix', () => {
            expect(matchesTag('cart.*', 'cart.totals')).toBe(true);
        });

        it('does not match a different domain', () => {
            expect(matchesTag('cart.*', 'product:ABC123.price')).toBe(false);
        });

        it('rejects when the emitted tag is shorter than the wildcard prefix', () => {
            // 'product.inventory.*' needs at least two emitted segments.
            expect(matchesTag('product.inventory.*', 'product')).toBe(false);
        });

        it('matches when the emitted tag exactly fills the wildcard prefix length', () => {
            expect(matchesTag('product.inventory.*', 'product.inventory')).toBe(true);
        });

        it('matches an instance-pinned wildcard prefix at any depth', () => {
            expect(matchesTag('product:ABC123.*', 'product:ABC123')).toBe(true);
            expect(matchesTag('product:ABC123.*', 'product:ABC123.price')).toBe(true);
            expect(matchesTag('product:ABC123.*', 'product:ABC123.inventory')).toBe(true);
        });

        it('does not match a different instance under an instance-pinned wildcard', () => {
            expect(matchesTag('product:ABC123.*', 'product:DEF456.price')).toBe(false);
        });

        it('matches any SKU under a domain-level wildcard', () => {
            expect(matchesTag('product.*', 'product:ABC123')).toBe(true);
            expect(matchesTag('product.*', 'product:ABC123.price')).toBe(true);
            expect(matchesTag('product.*', 'product:DEF456.inventory')).toBe(true);
        });

        it('does not cross domains under a domain-level wildcard', () => {
            expect(matchesTag('product.*', 'cart.lineItems')).toBe(false);
        });
    });

    describe('instance-omission rule (bidirectional)', () => {
        it('matches when the pattern omits the ID (broad subscription)', () => {
            expect(matchesTag('product.price', 'product:ABC123.price')).toBe(true);
        });

        it('matches when the emitted tag omits the ID (bulk emit)', () => {
            expect(matchesTag('product:ABC123.price', 'product.price')).toBe(true);
        });

        it('matches when both sides pin the same ID', () => {
            expect(matchesTag('cart.lineItems:li-7', 'cart.lineItems:li-7')).toBe(true);
        });

        it('rejects when both sides pin differing IDs', () => {
            expect(matchesTag('cart.lineItems:li-7', 'cart.lineItems:li-99')).toBe(false);
            expect(matchesTag('product:ABC123.price', 'product:DEF456.price')).toBe(false);
        });

        it('matches a bulk line-item emit against an instance-pinned subscription', () => {
            // "Clear Cart" emits cart.lineItems (no ID) → reaches a loader watching li-7.
            expect(matchesTag('cart.lineItems:li-7', 'cart.lineItems')).toBe(true);
        });

        it('matches every product price for an any-product subscription', () => {
            expect(matchesTag('product.price', 'product:DEF456.price')).toBe(true);
        });

        it('keeps an instance ID that itself contains a colon intact (splits on the first colon only)', () => {
            // The ID is everything after the first colon, so a composite key like `store:NY-7` is one ID, not two.
            expect(matchesTag('cart.lineItems:store:NY-7', 'cart.lineItems:store:NY-7')).toBe(true);
        });

        it('distinguishes colon-bearing IDs that differ only after the first colon', () => {
            // Before the fix both collapsed to id `store`; now `store:NY-7` !== `store:LA-3` is honored.
            expect(matchesTag('cart.lineItems:store:NY-7', 'cart.lineItems:store:LA-3')).toBe(false);
        });

        it('still matches a colon-bearing pinned subscription against an id-less bulk emit', () => {
            expect(matchesTag('cart.lineItems:store:NY-7', 'cart.lineItems')).toBe(true);
        });
    });

    describe('publish-specific / subscribe-broad table', () => {
        it.each([
            ['cart.*', 'cart.lineItems:li-7', true],
            ['product:ABC123.*', 'product:ABC123.price', true],
            ['product.price', 'product:ABC123.price', true],
            ['product.*', 'product:ABC123.price', true],
            ['cart.*', 'product:ABC123.price', false],
            ['cart.*', 'cart.lineItems', true],
            ['cart.lineItems:li-7', 'cart.lineItems', true],
        ])('pattern %s vs emitted %s → %s', (pattern, emitted, expected) => {
            expect(matchesTag(pattern, emitted)).toBe(expected);
        });
    });
});
