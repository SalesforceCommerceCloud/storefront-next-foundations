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
import type { Route } from './+types/action.add-review';
import { data } from 'react-router';

import { createActionError, type ActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getAuth as getAuthServer } from '@/middlewares/auth.server';

import { addReview, type ReviewItem } from '@/extensions/ratings-reviews/lib/api/reviews.server';
import { addReviewSchema } from '@/extensions/ratings-reviews/lib/schemas';

export type AddReviewResponse = { success: true; review: ReviewItem } | { success: false; error: ActionError };

export async function action({
    request,
    context,
}: Route.ActionArgs): Promise<ReturnType<typeof data<AddReviewResponse>>> {
    if (request.method !== 'POST') {
        return data(
            {
                success: false,
                error: createActionError({ code: ErrorCode.METHOD_NOT_ALLOWED, message: 'Method not allowed' }),
            },
            { status: 405 }
        );
    }

    const session = getAuthServer(context);
    if (session.userType !== 'registered' || !session.customerId) {
        return data(
            {
                success: false,
                error: createActionError({
                    code: ErrorCode.NOT_AUTHENTICATED,
                    message: 'You must be signed in to submit a review',
                }),
            },
            { status: 401 }
        );
    }

    let parsed: unknown;
    try {
        const formData = await request.formData();
        const photosRaw = formData.get('photos');
        parsed = {
            productId: formData.get('productId'),
            rating: Number(formData.get('rating')),
            headline: formData.get('headline'),
            body: formData.get('body'),
            location: formData.get('location') || undefined,
            photos: typeof photosRaw === 'string' && photosRaw ? JSON.parse(photosRaw) : undefined,
            recommend:
                formData.get('recommend') === 'true' ? true : formData.get('recommend') === 'false' ? false : undefined,
        };
    } catch {
        return data(
            {
                success: false,
                error: createActionError({
                    code: ErrorCode.REQUIRED_FIELD,
                    message: 'Invalid form data',
                }),
            },
            { status: 400 }
        );
    }

    const validation = addReviewSchema.safeParse(parsed);
    if (!validation.success) {
        return data(
            {
                success: false,
                error: createActionError({
                    code: ErrorCode.REQUIRED_FIELD,
                    message: validation.error.issues[0]?.message ?? 'Invalid payload',
                }),
            },
            { status: 400 }
        );
    }

    try {
        // Author name is derived server-side from the authenticated session — never trust
        // client-supplied display names. In a real integration, resolve from the customer
        // profile service using session.customerId.
        const authorName = `Shopper ${session.customerId?.slice(-4) ?? 'Unknown'}`;

        const review: ReviewItem = {
            id: `review-${Date.now()}`,
            authorName,
            verifiedPurchase: true,
            date: new Date().toISOString().split('T')[0],
            location: validation.data.location,
            rating: validation.data.rating,
            headline: validation.data.headline,
            body: validation.data.body,
            photos: validation.data.photos,
            helpfulCount: 0,
        };
        await addReview(validation.data.productId, review);
        return data({ success: true, review });
    } catch (error) {
        return data({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
