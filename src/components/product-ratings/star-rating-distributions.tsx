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
import { forwardRef, useMemo, type HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { StarRatingDistribution } from './star-rating-distribution';

export interface RatingDistributionData {
    /**
     * Star rating (1-5)
     */
    rating: number;
    /**
     * Number of reviews for this rating
     */
    count: number;
}

export interface StarRatingDistributionsProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Array of rating distribution data
     */
    distributions: RatingDistributionData[];
    /**
     * Currently selected rating filter (for highlighting clickable bars)
     */
    selectedRating?: number | null;
    /**
     * Called when a distribution row is clicked to filter by that rating
     */
    onRatingClick?: (rating: number) => void;
}

/**
 * StarRatingDistributions component stacks rating distributions for 5, 4, 3, 2, 1 stars
 */
export const StarRatingDistributions = forwardRef<HTMLDivElement, StarRatingDistributionsProps>(
    ({ distributions, selectedRating, onRatingClick, className, ...props }, ref) => {
        const { t } = useTranslation();

        // Calculate total reviews (memoized to prevent recalculation on every render)
        const totalReviews = useMemo(() => distributions.reduce((sum, dist) => sum + dist.count, 0), [distributions]);

        // Create a map for easy lookup (memoized to prevent recalculation on every render)
        const distributionMap = useMemo(() => new Map(distributions.map((d) => [d.rating, d.count])), [distributions]);

        // Ensure we have entries for all ratings from 5 to 1
        const ratingsToShow = [5, 4, 3, 2, 1];

        // Generate accessible label using translation with total reviews
        const ariaLabel = t('product:rating.distributionsAriaLabel', {
            total: totalReviews,
        });

        return (
            <div
                ref={ref}
                className={cn('flex flex-col gap-1.5', className)}
                role="group"
                aria-label={ariaLabel}
                {...props}>
                {ratingsToShow.map((rating) => {
                    const reviewCount = distributionMap.get(rating) || 0;
                    return (
                        <StarRatingDistribution
                            key={rating}
                            rating={rating}
                            reviewCount={reviewCount}
                            totalReviews={totalReviews}
                            selectedRating={selectedRating}
                            onRatingClick={onRatingClick}
                        />
                    );
                })}
            </div>
        );
    }
);

StarRatingDistributions.displayName = 'StarRatingDistributions';
