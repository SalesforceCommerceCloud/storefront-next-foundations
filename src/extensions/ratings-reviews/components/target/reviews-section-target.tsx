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
import { Suspense, lazy, type ReactElement } from 'react';
import { Await } from 'react-router';
import { useWriteReviewForm } from '@/extensions/ratings-reviews/context/write-review-form-context';
import type { WriteReviewFormData } from '@/extensions/ratings-reviews/lib/api/reviews.server';

const CustomerReviewsSection = lazy(() =>
    import('@/extensions/ratings-reviews/components/customer-reviews-section').then((m) => ({
        default: m.CustomerReviewsSection,
    }))
);

/**
 * UITarget wrapper for the customer reviews accordion on PDP.
 *
 * The `ProductReviewsProvider` is mounted higher up in the route file (gated
 * by extension markers) so the rating-summary widget inside `ProductView` shares
 * its context with this section. This wrapper just renders the section,
 * resolving the deferred write-review form config and passing it through.
 */
export default function ReviewsSectionTarget(): ReactElement | null {
    const writeReviewFormPromise = useWriteReviewForm();

    if (!writeReviewFormPromise) return null;

    return (
        <Suspense fallback={null}>
            <Await resolve={writeReviewFormPromise} errorElement={<CustomerReviewsSection />}>
                {(formConfig: WriteReviewFormData) => <CustomerReviewsSection writeReviewFormConfig={formConfig} />}
            </Await>
        </Suspense>
    );
}
