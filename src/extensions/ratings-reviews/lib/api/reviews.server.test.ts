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
import { describe, test, expect } from 'vitest';
import { addReview, getReviews, getReviewsSummary, getWriteReviewForm, type ReviewItem } from './reviews.server';

function makeReview(rating: number, id = `r-${rating}-${Math.random().toString(36).slice(2, 7)}`): ReviewItem {
    return {
        id,
        authorName: 'Test Author',
        verifiedPurchase: false,
        date: '2026-01-01',
        rating,
        headline: 'Headline',
        body: 'A body for the review that comfortably exceeds the minimum length.',
        helpfulCount: 0,
    };
}

describe('reviews.server / getReviewsSummary', () => {
    test('totalCount and distribution reflect mock fixtures (7 reviews: 5 fives, 2 fours)', async () => {
        const summary = await getReviewsSummary('product-summary-isolated');
        expect(summary.totalCount).toBe(7);
        expect(summary.distribution).toEqual({
            oneStar: 0,
            twoStars: 0,
            threeStars: 0,
            fourStars: 2,
            fiveStars: 5,
        });
    });

    test('averageRating is rounded to one decimal place', async () => {
        const summary = await getReviewsSummary('product-summary-rounding');
        // 5*5 + 2*4 = 33; 33/7 = 4.714... -> 4.7
        expect(summary.averageRating).toBe(4.7);
    });

    test('basedOnLabel pluralizes correctly for >1 reviews', async () => {
        const summary = await getReviewsSummary('product-summary-label');
        expect(summary.basedOnLabel).toBe('Based on 7 reviews');
    });

    test('aiSummary is included', async () => {
        const summary = await getReviewsSummary('product-summary-ai');
        expect(summary.aiSummary).toBeTruthy();
    });
});

describe('reviews.server / addReview', () => {
    test('persists a review for a productId and surfaces it in subsequent reads', async () => {
        const productId = `product-add-${Date.now()}`;
        const newReview = makeReview(3, 'user-r-1');
        await addReview(productId, newReview);

        const summary = await getReviewsSummary(productId);
        expect(summary.totalCount).toBe(8); // 7 mock + 1 new
        expect(summary.distribution.threeStars).toBe(1);

        const data = await getReviews(productId);
        // User review prepended.
        expect(data.reviews[0]).toEqual(newReview);
    });

    test('keeps writes isolated per productId', async () => {
        const productA = `product-iso-a-${Date.now()}`;
        const productB = `product-iso-b-${Date.now()}`;
        await addReview(productA, makeReview(1, 'a-1'));

        const summaryA = await getReviewsSummary(productA);
        const summaryB = await getReviewsSummary(productB);
        expect(summaryA.totalCount).toBe(8);
        expect(summaryA.distribution.oneStar).toBe(1);
        expect(summaryB.totalCount).toBe(7);
        expect(summaryB.distribution.oneStar).toBe(0);
    });

    test('falls back to a "default" key when productId is undefined', async () => {
        const review = makeReview(2, `default-${Date.now()}`);
        await addReview(undefined, review);

        const summary = await getReviewsSummary(undefined);
        // The default key is shared across the test process; assert that the new review
        // affected the count and distribution rather than asserting an absolute total.
        expect(summary.totalCount).toBeGreaterThanOrEqual(8);
        expect(summary.distribution.twoStars).toBeGreaterThanOrEqual(1);
    });
});

describe('reviews.server / getReviews', () => {
    test('returns the merged review list, header, and sort options', async () => {
        const data = await getReviews('product-read-isolated');
        expect(data.heading).toBe('Customer Reviews');
        expect(data.writeReviewButtonLabel).toBe('Write a Review');
        expect(data.reviews.length).toBe(7);
        expect(data.sortOptions).toEqual(['Most Recent', 'Highest Rating', 'Lowest Rating', 'Most Helpful']);
        expect(data.defaultSort).toBe('Most Recent');
    });
});

describe('reviews.server / getWriteReviewForm', () => {
    test('returns a populated form configuration', async () => {
        const form = await getWriteReviewForm('any');
        expect(form.title).toBeTruthy();
        expect(form.submitLabel).toBeTruthy();
        expect(form.cancelLabel).toBeTruthy();
        expect(form.overallRating.required).toBe(true);
        expect(form.reviewBody.minCharacters).toBeGreaterThan(0);
    });
});
