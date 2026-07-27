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
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/extensions/ratings-reviews/lib/api/reviews.server');
vi.mock('@/middlewares/auth.server');

import { action as actionImpl } from './action.add-review';
import { addReview } from '@/extensions/ratings-reviews/lib/api/reviews.server';
import { getAuth } from '@/middlewares/auth.server';
import { createFormDataRequest } from '@/test-utils/request-helpers';
import { expectStatus } from '@/lib/test-utils';
import { resourceRoutes } from '@/route-paths';

const action = actionImpl as unknown as (args: { request: Request; context: unknown }) => ReturnType<typeof actionImpl>;

const mockContext = {} as unknown;

const validBody = 'a'.repeat(60);
const validForm: Record<string, string> = {
    productId: 'prod-1',
    rating: '5',
    headline: 'Great product',
    body: validBody,
    location: 'Boston, MA',
    recommend: 'true',
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(addReview).mockResolvedValue(undefined);
    vi.mocked(getAuth).mockReturnValue({
        userType: 'registered',
        customerId: 'cust-123',
    } as ReturnType<typeof getAuth>);
});

describe('action.add-review — method validation', () => {
    test.each(['GET', 'PUT', 'DELETE', 'PATCH'])('returns 405 for %s', async (method) => {
        const response = await action({
            request: new Request(`http://localhost${resourceRoutes.addReview}`, { method }),
            context: mockContext,
        });
        expectStatus(response, 405);
        const json = response.data;
        expect(json.success).toBe(false);
    });
});

describe('action.add-review — authentication', () => {
    test('returns 401 for guest users', async () => {
        vi.mocked(getAuth).mockReturnValue({ userType: 'guest', customerId: undefined } as ReturnType<typeof getAuth>);
        const request = createFormDataRequest(`http://localhost${resourceRoutes.addReview}`, 'POST', validForm);
        const response = await action({ request, context: mockContext });
        expectStatus(response, 401);
        expect(response.data.success).toBe(false);
        expect(addReview).not.toHaveBeenCalled();
    });
});

describe('action.add-review — validation', () => {
    test.each([
        ['rating below range', { ...validForm, rating: '0' }],
        ['rating above range', { ...validForm, rating: '6' }],
        ['empty headline', { ...validForm, headline: '' }],
        ['body too short', { ...validForm, body: 'too short' }],
        ['empty productId', { ...validForm, productId: '' }],
    ])('returns 400 for %s', async (_label, formFields) => {
        const request = createFormDataRequest(`http://localhost${resourceRoutes.addReview}`, 'POST', formFields);
        const response = await action({ request, context: mockContext });
        expectStatus(response, 400);
        expect(response.data.success).toBe(false);
        expect(addReview).not.toHaveBeenCalled();
    });

    test('returns 400 when photos JSON is malformed', async () => {
        const request = createFormDataRequest(`http://localhost${resourceRoutes.addReview}`, 'POST', {
            ...validForm,
            photos: '{not-json',
        });
        const response = await action({ request, context: mockContext });
        expectStatus(response, 400);
        expect(addReview).not.toHaveBeenCalled();
    });
});

describe('action.add-review — happy path', () => {
    test('returns 200 with constructed ReviewItem for a valid POST', async () => {
        const request = createFormDataRequest(`http://localhost${resourceRoutes.addReview}`, 'POST', validForm);
        const response = await action({ request, context: mockContext });

        expectStatus(response, 200);
        expect(response.data.success).toBe(true);
        if (!response.data.success) throw new Error('expected success');

        const review = response.data.review;
        expect(review.id).toMatch(/^review-\d+$/);
        expect(review.authorName).toBe('Shopper -123');
        expect(review.rating).toBe(5);
        expect(review.headline).toBe('Great product');
        expect(review.body).toBe(validBody);
        expect(review.location).toBe('Boston, MA');
        expect(review.verifiedPurchase).toBe(true);
        expect(review.helpfulCount).toBe(0);
        // ISO date YYYY-MM-DD
        expect(review.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        expect(addReview).toHaveBeenCalledTimes(1);
        expect(addReview).toHaveBeenCalledWith('prod-1', expect.objectContaining({ rating: 5 }));
    });

    test('parses photos JSON when present', async () => {
        const photos = [{ url: 'https://cdn.example.com/p1.jpg', alt: 'photo 1' }];
        const request = createFormDataRequest(`http://localhost${resourceRoutes.addReview}`, 'POST', {
            ...validForm,
            photos: JSON.stringify(photos),
        });
        const response = await action({ request, context: mockContext });

        expectStatus(response, 200);
        expect(response.data.success).toBe(true);
        if (!response.data.success) throw new Error('expected success');
        expect(response.data.review.photos).toEqual(photos);
    });

    test('rejects photos with non-https URLs', async () => {
        const photos = [{ url: 'javascript:alert(1)', alt: 'xss' }];
        const request = createFormDataRequest(`http://localhost${resourceRoutes.addReview}`, 'POST', {
            ...validForm,
            photos: JSON.stringify(photos),
        });
        const response = await action({ request, context: mockContext });

        expectStatus(response, 400);
        expect(response.data.success).toBe(false);
    });

    test('treats empty location as undefined', async () => {
        const request = createFormDataRequest(`http://localhost${resourceRoutes.addReview}`, 'POST', {
            ...validForm,
            location: '',
        });
        const response = await action({ request, context: mockContext });
        expectStatus(response, 200);
        expect(response.data.success).toBe(true);
        if (!response.data.success) throw new Error('expected success');
        expect(response.data.review.location).toBeUndefined();
    });
});

describe('action.add-review — internal failure', () => {
    test('returns 500 when addReview throws', async () => {
        vi.mocked(addReview).mockRejectedValueOnce(new Error('boom'));
        const request = createFormDataRequest(`http://localhost${resourceRoutes.addReview}`, 'POST', validForm);
        const response = await action({ request, context: mockContext });
        expectStatus(response, 500);
        expect(response.data.success).toBe(false);
    });
});
