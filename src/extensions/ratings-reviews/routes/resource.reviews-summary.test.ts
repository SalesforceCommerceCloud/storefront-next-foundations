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
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/extensions/ratings-reviews/lib/api/reviews.server');
vi.mock('@/lib/logger.server', () => ({
    getLogger: () => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    }),
}));
vi.mock('@/lib/utils', () => ({
    extractResponseError: vi.fn(() =>
        Promise.resolve({
            responseMessage: 'Lookup failed',
            status_code: '503',
        })
    ),
}));

import { loader as loaderImpl, shouldRevalidate } from './resource.reviews-summary';
import { shouldRevalidate as shouldRevalidateImpl } from '@/extensions/ratings-reviews/lib/revalidation/routes/reviews-summary';
import { getReviewsSummary } from '@/extensions/ratings-reviews/lib/api/reviews.server';
import { expectStatus } from '@/lib/test-utils';
import { resourceRoutes } from '@/route-paths';

const loader = loaderImpl as unknown as (args: { request: Request; context: unknown }) => ReturnType<typeof loaderImpl>;

const mockSummary = {
    totalCount: 7,
    averageRating: 4.7,
    distribution: { oneStar: 0, twoStars: 0, threeStars: 0, fourStars: 2, fiveStars: 5 },
    basedOnLabel: 'Based on 7 reviews',
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe('resource.reviews-summary loader', () => {
    test('returns the summary for the requested productId', async () => {
        vi.mocked(getReviewsSummary).mockResolvedValueOnce(mockSummary);

        const response = await loader({
            request: new Request(`http://localhost${resourceRoutes.reviewsSummary}?productId=prod-123`),
            context: {},
        });

        expectStatus(response, 200);
        expect(response.data.success).toBe(true);
        expect(response.data.summary).toEqual(mockSummary);
        expect(getReviewsSummary).toHaveBeenCalledWith('prod-123');
    });

    test('passes undefined when productId is absent', async () => {
        vi.mocked(getReviewsSummary).mockResolvedValueOnce(mockSummary);

        await loader({
            request: new Request(`http://localhost${resourceRoutes.reviewsSummary}`),
            context: {},
        });

        expect(getReviewsSummary).toHaveBeenCalledWith(undefined);
    });

    test('returns the failure envelope and propagated status when getReviewsSummary rejects', async () => {
        vi.mocked(getReviewsSummary).mockRejectedValueOnce(new Error('upstream down'));

        const response = await loader({
            request: new Request(`http://localhost${resourceRoutes.reviewsSummary}?productId=prod-1`),
            context: {},
        });

        expectStatus(response, 503);
        expect(response.data.success).toBe(false);
        expect(response.data.error).toBe('Lookup failed');
    });

    test('re-exports the canonical shouldRevalidate gate', () => {
        // The route opts the fetcher out of default revalidation by re-exporting the gate;
        // assert identity so the re-export can't silently drift to a wrong or missing symbol.
        // The gate's own behavior is covered in the revalidation helper's test.
        expect(shouldRevalidate).toBe(shouldRevalidateImpl);
    });
});
