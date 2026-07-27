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
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StarRating } from '@/components/product-ratings/star-rating';
import { StarRatingDistributions } from '@/components/product-ratings/star-rating-distributions';
import type { RatingDistributionData } from '../types';

/**
 * Renders star rating distribution modal content.
 * Layout: StarRating component on top, StarRatingDistributions component below, and optional link to reviews.
 * Uses the RatingOnRatingModal style configuration.
 */
export function StarRatingDistributionModalContent({
    rating,
    reviewCount,
    distributions,
    onSeeReviewsClick,
}: {
    rating: number;
    reviewCount: number;
    distributions: RatingDistributionData[];
    onSeeReviewsClick?: () => void;
}): ReactElement {
    const { t } = useTranslation();

    return (
        <div className="w-full space-y-2">
            {/* Star Rating - using RatingOnRatingModal style with adjusted spacing */}
            <StarRating
                rating={rating}
                reviewCount={reviewCount}
                showRatingLabel={true}
                ratingLabelPosition="right"
                ratingLabelFormat="full"
                showReviewCountLabel={true}
                reviewCountLabelClassName="text-xs text-gray-500 mt-2 mb-0"
                className="w-full"
            />

            {/* Rating Distributions */}
            <StarRatingDistributions distributions={distributions} className="w-full" />

            {/* See Reviews Link */}
            {onSeeReviewsClick && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSeeReviewsClick();
                    }}
                    className="mt-4 cursor-pointer text-sm font-normal text-primary hover:underline">
                    {t('product:rating.seeCustomerReviews')}
                </button>
            )}
        </div>
    );
}
