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
import { forwardRef, type HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { StarIcon } from './star-icon';

export interface StarRatingDistributionProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Star rating value (1-5)
     */
    rating: number;
    /**
     * Number of reviews for this rating
     */
    reviewCount: number;
    /**
     * Total number of reviews (for percentage calculation)
     */
    totalReviews: number;
    /**
     * Currently selected rating filter (for highlight state)
     */
    selectedRating?: number | null;
    /**
     * Called when the row is clicked to filter by this rating
     */
    onRatingClick?: (rating: number) => void;
}

/**
 * StarRatingDistribution component displays a single rating distribution row
 * with star label, icon, percentage bar, and review count
 */
export const StarRatingDistribution = forwardRef<HTMLElement, StarRatingDistributionProps>(
    ({ rating, reviewCount, totalReviews, selectedRating, onRatingClick, className, ...props }, ref) => {
        const { t } = useTranslation();

        // Calculate percentage (for bar width only; aria-label uses count to match visual)
        const percentage = totalReviews > 0 ? (reviewCount / totalReviews) * 100 : 0;

        // Accessible label: rating and count out of total (matches visual display per WCAG 1.3.1)
        const ariaLabel = t('product:rating.distributionAriaLabel', {
            rating,
            count: reviewCount,
            totalReviews,
        });

        const isSelected = selectedRating === rating;
        const isClickable = onRatingClick != null;

        const rowClassName = cn(
            'flex items-center gap-2 text-sm py-1 px-1 -mx-1',
            isClickable && 'cursor-pointer hover:bg-brand-gray-200'
        );

        const content = (
            <>
                {/* Star rating label */}
                <span className="w-3 text-right text-muted-foreground" aria-hidden="true">
                    {rating}
                </span>

                {/* Star icon */}
                <StarIcon opacity={1} filled={true} className="w-4 h-4 shrink-0" aria-hidden="true" />

                {/* Percentage bar: light blue when selected, grey otherwise; yellow fill on top */}
                <div
                    className={cn(
                        'flex-1 min-w-0 h-2 rounded-full overflow-hidden shrink-0',
                        isSelected ? 'bg-info-foreground' : 'bg-brand-gray-300'
                    )}
                    aria-hidden="true">
                    <div className="bg-rating h-full transition-all duration-300" style={{ width: `${percentage}%` }} />
                </div>

                {/* Review count (per UX) */}
                <span className="w-6 text-right text-muted-foreground tabular-nums shrink-0" aria-hidden="true">
                    {reviewCount}
                </span>
            </>
        );

        if (isClickable) {
            return (
                <button
                    ref={ref as unknown as React.Ref<HTMLButtonElement>}
                    type="button"
                    className={cn(rowClassName, className)}
                    onClick={() => onRatingClick?.(rating)}
                    aria-label={ariaLabel}
                    aria-pressed={isSelected}
                    {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
                    {content}
                </button>
            );
        }

        return (
            <div
                ref={ref as unknown as React.Ref<HTMLDivElement>}
                className={cn(rowClassName, className)}
                aria-label={ariaLabel}
                {...props}>
                {content}
            </div>
        );
    }
);

StarRatingDistribution.displayName = 'StarRatingDistribution';
