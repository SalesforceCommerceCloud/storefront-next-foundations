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
import { addReviewSchema, reviewPhotoSchema } from './schemas';

const validBody = 'a'.repeat(60);

const validPayload = {
    productId: 'prod-1',
    rating: 5,
    headline: 'Great product',
    body: validBody,
};

describe('addReviewSchema', () => {
    test('accepts a minimal valid payload', () => {
        const result = addReviewSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
    });

    test('accepts all optional fields when provided', () => {
        const result = addReviewSchema.safeParse({
            ...validPayload,
            location: 'Boston',
            photos: [{ url: 'https://cdn.example.com/a.jpg', alt: 'alt' }],
            recommend: true,
        });
        expect(result.success).toBe(true);
    });

    test.each([
        ['productId', { ...validPayload, productId: '' }],
        ['rating below 1', { ...validPayload, rating: 0 }],
        ['rating above 5', { ...validPayload, rating: 6 }],
        ['rating non-integer', { ...validPayload, rating: 4.5 }],
        ['headline empty', { ...validPayload, headline: '' }],
        ['headline > 250', { ...validPayload, headline: 'h'.repeat(251) }],
        ['body too short', { ...validPayload, body: 'a'.repeat(49) }],
        ['body too long', { ...validPayload, body: 'a'.repeat(2001) }],
        ['location > 120', { ...validPayload, location: 'l'.repeat(121) }],
        [
            'photos > 10',
            { ...validPayload, photos: Array.from({ length: 11 }, () => ({ url: 'https://cdn.example.com/a.jpg' })) },
        ],
    ])('rejects invalid input: %s', (_label, payload) => {
        const result = addReviewSchema.safeParse(payload);
        expect(result.success).toBe(false);
    });

    test('accepts body at lower bound (50 chars)', () => {
        const result = addReviewSchema.safeParse({ ...validPayload, body: 'b'.repeat(50) });
        expect(result.success).toBe(true);
    });

    test('accepts body at upper bound (2000 chars)', () => {
        const result = addReviewSchema.safeParse({ ...validPayload, body: 'b'.repeat(2000) });
        expect(result.success).toBe(true);
    });

    test('accepts integer rating at both bounds', () => {
        expect(addReviewSchema.safeParse({ ...validPayload, rating: 1 }).success).toBe(true);
        expect(addReviewSchema.safeParse({ ...validPayload, rating: 5 }).success).toBe(true);
    });
});

describe('reviewPhotoSchema', () => {
    test('requires a valid https URL', () => {
        expect(reviewPhotoSchema.safeParse({ url: '' }).success).toBe(false);
        expect(reviewPhotoSchema.safeParse({ url: '/photo.jpg' }).success).toBe(false);
        expect(reviewPhotoSchema.safeParse({ url: 'http://example.com/photo.jpg' }).success).toBe(false);
        expect(reviewPhotoSchema.safeParse({ url: 'javascript:alert(1)' }).success).toBe(false);
        expect(reviewPhotoSchema.safeParse({ url: 'https://cdn.example.com/photo.jpg' }).success).toBe(true);
    });

    test('alt is optional and capped at 250 chars', () => {
        expect(reviewPhotoSchema.safeParse({ url: 'https://cdn.example.com/photo.jpg' }).success).toBe(true);
        expect(reviewPhotoSchema.safeParse({ url: 'https://cdn.example.com/photo.jpg', alt: 'caption' }).success).toBe(
            true
        );
        expect(
            reviewPhotoSchema.safeParse({ url: 'https://cdn.example.com/photo.jpg', alt: 'a'.repeat(251) }).success
        ).toBe(false);
    });
});
