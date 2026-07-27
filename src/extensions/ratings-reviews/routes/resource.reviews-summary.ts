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
import { data } from 'react-router';
import type { Route } from './+types/resource.reviews-summary';
import { extractResponseError } from '@/lib/utils';
import { getLogger } from '@/lib/logger.server';
import { getReviewsSummary, type ReviewsSummaryData } from '@/extensions/ratings-reviews/lib/api/reviews.server';

export { shouldRevalidate } from '@/extensions/ratings-reviews/lib/revalidation/routes/reviews-summary';

/**
 * Result of the reviews-summary lookup.
 * @property success - Whether the lookup succeeded
 * @property summary - Reviews summary (count, average, distribution) when successful
 * @property error - Error message if the lookup failed
 */
export interface ReviewsSummaryResult {
    success: boolean;
    summary?: ReviewsSummaryData;
    error?: string;
}

/**
 * Resource route used by surfaces that can't be SSR-streamed (e.g., the cart-item
 * modal, which mounts on click). Called via `useFetcher` from
 * `<ProductRatingSummary>` to fetch a product's rating summary on demand.
 *
 * @example
 *   GET /resource/reviews-summary?productId=pure-cube
 */
export async function loader({
    request,
    context,
}: Route.LoaderArgs): Promise<ReturnType<typeof data<ReviewsSummaryResult>>> {
    const logger = getLogger(context);
    try {
        const url = new URL(request.url);
        const productId = url.searchParams.get('productId') ?? undefined;
        const summary = await getReviewsSummary(productId);
        return data({ success: true, summary });
    } catch (error) {
        logger.error('ReviewsSummary: lookup failed', { error });
        const { responseMessage, status_code } = await extractResponseError(error as Error);
        return data({ success: false, error: responseMessage }, { status: Number(status_code) });
    }
}
