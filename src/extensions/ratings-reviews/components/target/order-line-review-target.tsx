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
import { Suspense, type ReactElement } from 'react';
import { Await } from 'react-router';
import { OrderLineRateReview } from '@/extensions/ratings-reviews/components/order-line-rate-review';
import { useOrderLineReviewSlot } from '@/extensions/ratings-reviews/components/order-line-review-context';
import { useWriteReviewForm } from '@/extensions/ratings-reviews/context/write-review-form-context';
import type { WriteReviewFormData } from '@/extensions/ratings-reviews/lib/api/reviews.server';

/**
 * UITarget wrapper for the per-line "Rate & Review" CTA on the order detail
 * page. Reads per-line product/lineKey/etc. from the parent
 * `OrderLineReviewSlot` context and the deferred form-config Promise from the
 * `WriteReviewFormProvider`.
 *
 * Renders nothing if the slot context is missing (the target was placed outside
 * the per-item slot) or if the provider didn't supply the Promise (extension
 * uninstalled).
 */
export default function OrderLineReviewTarget(): ReactElement | null {
    const slot = useOrderLineReviewSlot();
    const writeReviewFormPromise = useWriteReviewForm();

    if (!slot || !writeReviewFormPromise) return null;

    const { product, lineKey, reviewSubmitted, onLineReviewSubmitted } = slot;

    return (
        <Suspense
            fallback={
                <OrderLineRateReview
                    product={product}
                    lineKey={lineKey}
                    reviewSubmitted={reviewSubmitted}
                    onLineReviewSubmitted={onLineReviewSubmitted}
                />
            }>
            <Await resolve={writeReviewFormPromise} errorElement={null}>
                {(formConfig: WriteReviewFormData) => (
                    <OrderLineRateReview
                        product={product}
                        lineKey={lineKey}
                        reviewSubmitted={reviewSubmitted}
                        onLineReviewSubmitted={onLineReviewSubmitted}
                        formConfig={formConfig}
                    />
                )}
            </Await>
        </Suspense>
    );
}
