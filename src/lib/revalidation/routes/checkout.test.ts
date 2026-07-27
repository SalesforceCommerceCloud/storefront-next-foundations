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
import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { shouldRevalidate, CHECKOUT_REVALIDATE_TAGS } from './checkout';
import { CHECKOUT_ACTION_INTENTS } from '@/components/checkout/utils/checkout-context-types';

const baseArgs = {
    currentUrl: new URL('http://localhost/checkout'),
    currentParams: {},
    nextUrl: new URL('http://localhost/checkout'),
    nextParams: {},
    formMethod: 'POST' as const,
    formAction: '/checkout',
    formEncType: 'application/x-www-form-urlencoded' as const,
    text: undefined,
    formData: undefined,
    json: undefined,
} satisfies Omit<ShouldRevalidateFunctionArgs, 'defaultShouldRevalidate'>;

describe('checkout shouldRevalidate', () => {
    describe('CHECKOUT_REVALIDATE_TAGS', () => {
        it('is a readonly array containing checkout.update', () => {
            expect(CHECKOUT_REVALIDATE_TAGS).toEqual(['checkout.update']);
        });
    });

    describe('tag-intersect match', () => {
        it('revalidates when actionResult carries a matching tag', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: 200,
                    actionResult: { success: true, revalidateTags: ['checkout.update'] },
                    defaultShouldRevalidate: false,
                })
            ).toBe(true);
        });

        it('skips when actionResult carries a non-matching tag', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: 200,
                    actionResult: { success: true, revalidateTags: ['checkout.payment.complete'] },
                    defaultShouldRevalidate: false,
                })
            ).toBe(false);
        });
    });

    describe('untagged action falls back to defaultShouldRevalidate', () => {
        it('returns true when defaultShouldRevalidate is true and no tags are reported', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: 200,
                    actionResult: { success: true },
                    defaultShouldRevalidate: true,
                })
            ).toBe(true);
        });

        it('returns false when defaultShouldRevalidate is false and no tags are reported', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: 200,
                    actionResult: { success: true },
                    defaultShouldRevalidate: false,
                })
            ).toBe(false);
        });

        it('returns true when defaultShouldRevalidate is true and revalidateTags is empty', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: 200,
                    actionResult: { success: true, revalidateTags: [] },
                    defaultShouldRevalidate: true,
                })
            ).toBe(true);
        });

        it('returns false when defaultShouldRevalidate is false and revalidateTags is empty', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: 200,
                    actionResult: { success: true, revalidateTags: [] },
                    defaultShouldRevalidate: false,
                })
            ).toBe(false);
        });
    });

    describe('3xx redirect skip', () => {
        // A redirect carries no JSON body, so actionResult is undefined; the 3xx guard is a
        // structural invariant that wins over everything (basket destroyed, never revalidate).
        it.each([300, 302, 399])('skips revalidation for %i', (status) => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: status,
                    actionResult: undefined,
                    defaultShouldRevalidate: true,
                })
            ).toBe(false);
        });

        it('does not skip via the 3xx branch when status is 200 with a matching tag', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: 200,
                    actionResult: { success: true, revalidateTags: ['checkout.update'] },
                    defaultShouldRevalidate: false,
                })
            ).toBe(true);
        });
    });

    describe('step intent skip', () => {
        // Step actions report no tags, so the step-intent guard supplies the skip.
        it.each(Object.values(CHECKOUT_ACTION_INTENTS))('skips revalidation for step intent=%s', (intent) => {
            const formData = new FormData();
            formData.set('intent', intent);
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formData,
                    actionStatus: 200,
                    actionResult: { success: true },
                    defaultShouldRevalidate: true,
                })
            ).toBe(false);
        });

        // A published tag is authoritative: a step action that explicitly reports a
        // matching tag is decided by the intersection, not muted by the step-intent guard.
        it('revalidates when a step action explicitly reports a matching tag', () => {
            const formData = new FormData();
            formData.set('intent', Object.values(CHECKOUT_ACTION_INTENTS)[0]);
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formData,
                    actionStatus: 200,
                    actionResult: { success: true, revalidateTags: ['checkout.update'] },
                    defaultShouldRevalidate: false,
                })
            ).toBe(true);
        });
    });

    describe('plain navigation (no action)', () => {
        it('returns defaultShouldRevalidate=true when no formMethod or actionResult', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formMethod: undefined,
                    actionResult: undefined,
                    actionStatus: undefined,
                    defaultShouldRevalidate: true,
                })
            ).toBe(true);
        });

        it('returns defaultShouldRevalidate=false when no formMethod or actionResult', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formMethod: undefined,
                    actionResult: undefined,
                    actionStatus: undefined,
                    defaultShouldRevalidate: false,
                })
            ).toBe(false);
        });
    });

    describe('failed action (4xx/5xx) with matching tag', () => {
        // Tags decide regardless of HTTP status: a failed action can still have mutated server state.
        // 400 also confirms the 3xx guard boundary is tight (>= 300 && < 400 does not catch 4xx).
        it.each([400, 500])('revalidates on %i when actionResult carries a matching tag', (actionStatus) => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus,
                    actionResult: { revalidateTags: ['checkout.update'] },
                    defaultShouldRevalidate: false,
                })
            ).toBe(true);
        });
    });

    describe('malformed revalidateTags', () => {
        it('falls back to defaultShouldRevalidate when revalidateTags is not an array', () => {
            // normalizeTags coerces non-arrays to [] which defers to defaultShouldRevalidate.
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: 200,
                    actionResult: { revalidateTags: 'checkout.update' },
                    defaultShouldRevalidate: true,
                })
            ).toBe(true);
        });
    });
});
