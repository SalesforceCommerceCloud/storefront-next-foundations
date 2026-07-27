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
import { type ReactElement, useState, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InfoModalData, WriteReviewModalData } from '@/components/info-modal/types';
import type { WriteReviewFormData } from '@/extensions/ratings-reviews/lib/api/reviews.server';
import { ProductProvider } from '@/providers/product-context';
import { ProductReviewsProvider } from '@/extensions/ratings-reviews/providers/product-reviews-context';
import type { ShopperProducts } from '@/scapi';

const InfoModal = lazy(() => import('@/components/info-modal'));

type OrderLineRateReviewInnerProps = {
    lineKey: string;
    reviewSubmitted: boolean;
    onLineReviewSubmitted: (lineKey: string) => void;
    formConfig?: WriteReviewFormData;
};

/**
 * Opens the PDP-parity write-review modal for one order line. Form config is supplied
 * by the parent route loader (deferred Promise) — no per-line fetch required.
 */
function OrderLineRateReviewInner({
    lineKey,
    reviewSubmitted,
    onLineReviewSubmitted,
    formConfig,
}: OrderLineRateReviewInnerProps): ReactElement {
    const { t } = useTranslation('extRatingsReviews');
    const [open, setOpen] = useState(false);

    const data: InfoModalData = {
        type: 'write-review',
        formConfig,
        onAfterSubmit: () => {
            onLineReviewSubmitted(lineKey);
        },
    } satisfies WriteReviewModalData;

    if (reviewSubmitted) {
        return (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-status-positive">
                <Check className="size-4 shrink-0" aria-hidden />
                {t('orderLine.reviewSubmitted')}
            </span>
        );
    }

    return (
        <>
            <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-sm font-medium"
                disabled={formConfig == null}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen(true)}
                data-testid="order-line-rate-review">
                {t('orderLine.rateAndReview')}
            </Button>
            {open && (
                <Suspense fallback={null}>
                    <InfoModal open={open} onOpenChange={setOpen} data={data} />
                </Suspense>
            )}
        </>
    );
}

export type OrderLineRateReviewProps = {
    product: ShopperProducts.schemas['Product'];
    lineKey: string;
    reviewSubmitted: boolean;
    onLineReviewSubmitted: (lineKey: string) => void;
    /** Loader-resolved form configuration for the modal. */
    formConfig?: WriteReviewFormData;
};

export function OrderLineRateReview({
    product,
    lineKey,
    reviewSubmitted,
    onLineReviewSubmitted,
    formConfig,
}: OrderLineRateReviewProps): ReactElement {
    return (
        <ProductProvider product={product}>
            <ProductReviewsProvider>
                <OrderLineRateReviewInner
                    lineKey={lineKey}
                    reviewSubmitted={reviewSubmitted}
                    onLineReviewSubmitted={onLineReviewSubmitted}
                    formConfig={formConfig}
                />
            </ProductReviewsProvider>
        </ProductProvider>
    );
}
