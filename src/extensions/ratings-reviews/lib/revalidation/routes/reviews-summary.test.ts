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
/** @sfdc-extension-file SFDC_EXT_RATINGS_REVIEWS */
import { describe, it, expect } from 'vitest';
import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { resourceRoutes } from '@/route-paths';
import { shouldRevalidate } from './reviews-summary';

const baseArgs = {
    currentUrl: new URL('http://localhost/resource/reviews-summary?productId=pure-cube'),
    currentParams: {},
    nextUrl: new URL('http://localhost/resource/reviews-summary?productId=pure-cube'),
    nextParams: {},
    formMethod: undefined,
    formAction: undefined,
    formEncType: undefined,
    text: undefined,
    formData: undefined,
    json: undefined,
    actionStatus: undefined,
    actionResult: undefined,
} satisfies Omit<ShouldRevalidateFunctionArgs, 'defaultShouldRevalidate'>;

const review = {
    id: 'review-1',
    authorName: 'Shopper 1234',
    verifiedPurchase: true,
    date: '2026-06-16',
    rating: 5,
    headline: 'Great',
    body: 'Loved it',
    helpfulCount: 0,
};

describe('reviews-summary shouldRevalidate', () => {
    describe('add-review opt-in', () => {
        it('revalidates when the add-review action returned a new review', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formMethod: 'POST',
                    formAction: resourceRoutes.addReview,
                    actionResult: { success: true, review },
                    defaultShouldRevalidate: false,
                })
            ).toBe(true);
        });

        it('strips a trailing query string from formAction before matching', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formMethod: 'POST',
                    formAction: `${resourceRoutes.addReview}?index`,
                    actionResult: { success: true, review },
                    defaultShouldRevalidate: false,
                })
            ).toBe(true);
        });

        it.each([
            ['the add-review action failed', { success: false, error: { code: 'X', message: 'nope' } }],
            ['the result reports success but carries no review', { success: true }],
            ['the result is null', null],
            ['the result is undefined', undefined],
            ['the result is a non-object', 'ok'],
        ])('does not revalidate when %s', (_label, actionResult) => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formMethod: 'POST',
                    formAction: resourceRoutes.addReview,
                    actionResult,
                    defaultShouldRevalidate: false,
                })
            ).toBe(false);
        });
    });

    describe('unrelated action paths are skipped', () => {
        // Each case posts to the action that actually produces that payload, so the
        // path guard is exercised against a realistic submission rather than a stand-in.
        it.each([
            ['add-to-cart', resourceRoutes.cartItemAdd, { basket: { basketId: 'abc' } }],
            ['currency switch', resourceRoutes.setSiteContext, { success: true }],
            ['wishlist add', resourceRoutes.wishlistAdd, { success: true }],
            ['shopper-context update', resourceRoutes.updateShopperContext, { success: true }],
            ['selected-store change', resourceRoutes.setSelectedStore, { success: true }],
        ])('does not revalidate for %s', (_label, formAction, actionResult) => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formMethod: 'POST',
                    formAction,
                    actionResult,
                    defaultShouldRevalidate: true,
                })
            ).toBe(false);
        });

        it('does not revalidate for an add-review-shaped payload from a different action path', () => {
            // The path guard is what makes this safe: a foreign action returning a
            // { success, review } body must not trip the reviews-summary re-run.
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formMethod: 'POST',
                    formAction: resourceRoutes.updateShopperContext,
                    actionResult: { success: true, review },
                    defaultShouldRevalidate: false,
                })
            ).toBe(false);
        });
    });

    describe('GET submissions are not treated as mutations', () => {
        // A GET submission must defer to the default even when its path and payload would
        // otherwise satisfy the add-review opt-in — only non-GET methods mutate. This is the
        // case the formMethod guard exists for: without it the opt-in would force revalidation.
        it('defers to the default (false) for a GET to add-review with a success payload', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formMethod: 'GET',
                    formAction: resourceRoutes.addReview,
                    actionResult: { success: true, review },
                    defaultShouldRevalidate: false,
                })
            ).toBe(false);
        });

        it('defers to the default (true) for a GET to add-review — not the opt-out false', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formMethod: 'GET',
                    formAction: resourceRoutes.addReview,
                    actionResult: { success: true, review },
                    defaultShouldRevalidate: true,
                })
            ).toBe(true);
        });
    });

    describe('navigation / imperative revalidate defers to default', () => {
        it('defers to the default when a non-GET submission carries no formAction', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formMethod: 'POST',
                    formAction: undefined,
                    defaultShouldRevalidate: true,
                })
            ).toBe(true);
        });

        it('returns defaultShouldRevalidate=true when there is no formAction', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formAction: undefined,
                    defaultShouldRevalidate: true,
                })
            ).toBe(true);
        });

        it('returns defaultShouldRevalidate=false when there is no formAction', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formAction: undefined,
                    defaultShouldRevalidate: false,
                })
            ).toBe(false);
        });
    });
});
