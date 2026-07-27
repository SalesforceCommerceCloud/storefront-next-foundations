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
import { describe, expect, test } from 'vitest';
import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { resourceRoutes, routes } from '@/route-paths';
import { shouldRevalidate } from './cart';

/**
 * Builds a full {@link ShouldRevalidateFunctionArgs} so each case states only the fields it cares about. Defaults model
 * a same-URL post-action pass with React Router's default revalidation enabled — the baseline the cart route keeps for
 * every basket-affecting mutation and overrides to `false` only for the wishlist toggle.
 */
function buildArgs(overrides: Partial<ShouldRevalidateFunctionArgs> = {}): ShouldRevalidateFunctionArgs {
    return {
        currentUrl: new URL('http://localhost/cart'),
        nextUrl: new URL('http://localhost/cart'),
        currentParams: {},
        nextParams: {},
        formMethod: 'POST',
        defaultShouldRevalidate: true,
        ...overrides,
    } as ShouldRevalidateFunctionArgs;
}

describe('cart shouldRevalidate', () => {
    describe('revalidates by default (basket is the loader content)', () => {
        test.each([
            ['cart-item-add', resourceRoutes.cartItemAdd],
            ['cart-item-remove', resourceRoutes.cartItemRemove],
            ['cart-item-update', resourceRoutes.cartItemUpdate],
            ['cart-bundle-add', resourceRoutes.cartBundleAdd],
            ['cart-bundle-update', resourceRoutes.cartBundleUpdate],
            ['cart-set-add', resourceRoutes.cartSetAdd],
            ['bonus-product-add', resourceRoutes.bonusProductAdd],
            ['promo-code-add', resourceRoutes.promoCodeAdd],
            ['promo-code-remove', resourceRoutes.promoCodeRemove],
            ['cart-pickup-store-update', resourceRoutes.cartPickupStoreUpdate],
            ['set-selected-store', resourceRoutes.setSelectedStore],
        ])('revalidates for %s', (_label, formAction) => {
            expect(shouldRevalidate(buildArgs({ formAction }))).toBe(true);
        });

        test.each([
            ['set-site-context', resourceRoutes.setSiteContext],
            ['update-shopper-context', resourceRoutes.updateShopperContext],
        ])('revalidates for the ambient dimension %s (fall-through, not explicitly admitted)', (_label, formAction) => {
            expect(shouldRevalidate(buildArgs({ formAction }))).toBe(true);
        });

        test.each([
            ['login', routes.login],
            ['signup', routes.signup],
            ['logout', routes.logout],
        ])('revalidates for the identity transition %s (fall-through)', (_label, formAction) => {
            expect(shouldRevalidate(buildArgs({ formAction }))).toBe(true);
        });

        test('a basket mutation returns the default rather than hardcoding true', () => {
            // Locks in that admitted mutations fall through to `defaultShouldRevalidate` (not a hardcoded `true`), so a
            // RR pass that already defaulted to skipping is respected.
            expect(
                shouldRevalidate(buildArgs({ formAction: resourceRoutes.cartItemAdd, defaultShouldRevalidate: false }))
            ).toBe(false);
        });
    });

    describe('wishlist toggle skip', () => {
        test.each([
            ['wishlist-add', resourceRoutes.wishlistAdd],
            ['wishlist-remove', resourceRoutes.wishlistRemove],
        ])('skips revalidation for %s', (_label, formAction) => {
            expect(shouldRevalidate(buildArgs({ formAction }))).toBe(false);
        });

        test('resolves an absolute-URL formAction before matching the skip list', () => {
            expect(shouldRevalidate(buildArgs({ formAction: `http://localhost${resourceRoutes.wishlistAdd}` }))).toBe(
                false
            );
        });

        test('resolves a formAction with a trailing query (?index) before matching the skip list', () => {
            expect(shouldRevalidate(buildArgs({ formAction: `${resourceRoutes.wishlistRemove}?index` }))).toBe(false);
        });
    });

    describe('non-action passes fall through to the default', () => {
        test('a plain navigation (no formMethod) follows defaultShouldRevalidate', () => {
            expect(shouldRevalidate(buildArgs({ formMethod: undefined, defaultShouldRevalidate: true }))).toBe(true);
            expect(shouldRevalidate(buildArgs({ formMethod: undefined, defaultShouldRevalidate: false }))).toBe(false);
        });

        test('a GET submission follows defaultShouldRevalidate (never treated as a skip)', () => {
            expect(
                shouldRevalidate(
                    buildArgs({
                        formMethod: 'GET',
                        formAction: resourceRoutes.wishlistAdd,
                        defaultShouldRevalidate: true,
                    })
                )
            ).toBe(true);
        });

        test('an unclassifiable submission (no formAction) revalidates — the safe default for this route', () => {
            expect(shouldRevalidate(buildArgs({ formAction: undefined }))).toBe(true);
        });
    });
});
