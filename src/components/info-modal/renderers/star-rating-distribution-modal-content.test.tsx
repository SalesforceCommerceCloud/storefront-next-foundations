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
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { StarRatingDistributionModalContent } from './star-rating-distribution-modal-content';
import type { RatingDistributionData } from '../types';

const defaultDistributions: RatingDistributionData[] = [
    { rating: 5, count: 120 },
    { rating: 4, count: 50 },
    { rating: 3, count: 20 },
    { rating: 2, count: 8 },
    { rating: 1, count: 2 },
];

describe('StarRatingDistributionModalContent', () => {
    it('renders without crashing', () => {
        const { container } = render(
            <StarRatingDistributionModalContent rating={4.8} reviewCount={200} distributions={defaultDistributions} />
        );
        expect(container).toBeInTheDocument();
    });

    it('renders star rating with correct label', () => {
        render(
            <StarRatingDistributionModalContent rating={4.8} reviewCount={200} distributions={defaultDistributions} />
        );

        // Check that the right label is displayed (full format)
        expect(screen.getByText('4.8 out of 5')).toBeInTheDocument();
    });

    it('renders review count label', () => {
        render(
            <StarRatingDistributionModalContent rating={4.8} reviewCount={200} distributions={defaultDistributions} />
        );

        // Check that review count label is displayed
        expect(screen.getByText('Based on 200 reviews')).toBeInTheDocument();
    });

    it('renders all star rating components', () => {
        const { container } = render(
            <StarRatingDistributionModalContent rating={4.8} reviewCount={200} distributions={defaultDistributions} />
        );

        // Check that stars are rendered (should have stars from both StarRating and StarRatingDistributions)
        const stars = container.querySelectorAll('svg');
        expect(stars.length).toBeGreaterThan(5);
    });

    it('renders rating distributions', () => {
        render(
            <StarRatingDistributionModalContent rating={4.8} reviewCount={200} distributions={defaultDistributions} />
        );

        // Check that distribution counts are displayed (StarRatingDistributions shows count per rating)
        expect(screen.getByText('120')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('handles empty distributions', () => {
        render(<StarRatingDistributionModalContent rating={0} reviewCount={0} distributions={[]} />);

        // Check that component still renders
        expect(screen.getByText('0 out of 5')).toBeInTheDocument();
        expect(screen.getByText('Based on 0 reviews')).toBeInTheDocument();
    });

    it('handles different rating values', () => {
        render(
            <StarRatingDistributionModalContent
                rating={3.5}
                reviewCount={150}
                distributions={[
                    { rating: 5, count: 30 },
                    { rating: 4, count: 40 },
                    { rating: 3, count: 35 },
                    { rating: 2, count: 25 },
                    { rating: 1, count: 20 },
                ]}
            />
        );

        expect(screen.getByText('3.5 out of 5')).toBeInTheDocument();
        expect(screen.getByText('Based on 150 reviews')).toBeInTheDocument();
    });

    it('uses RatingOnRatingModal style configuration', () => {
        const { container } = render(
            <StarRatingDistributionModalContent rating={4.8} reviewCount={200} distributions={defaultDistributions} />
        );

        // Verify the right label position is used (label should appear next to stars)
        const ratingLabel = screen.getByText('4.8 out of 5');
        expect(ratingLabel).toBeInTheDocument();

        // Verify review count label is present
        const reviewCountLabel = screen.getByText('Based on 200 reviews');
        expect(reviewCountLabel).toBeInTheDocument();

        // Verify stars are rendered with correct size (sm - 12px / w-3 h-3)
        const stars = container.querySelectorAll('svg.w-3.h-3');
        expect(stars.length).toBeGreaterThan(0);
    });

    it('calls onSeeReviewsClick when button is clicked', async () => {
        const user = userEvent.setup();
        const mockOnClick = vi.fn();

        render(
            <StarRatingDistributionModalContent
                rating={4.8}
                reviewCount={200}
                distributions={defaultDistributions}
                onSeeReviewsClick={mockOnClick}
            />
        );

        const button = screen.getByText('See customer reviews >');
        expect(button).toBeInTheDocument();

        await user.click(button);
        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('does not render See Reviews button when onSeeReviewsClick is not provided', () => {
        render(
            <StarRatingDistributionModalContent rating={4.8} reviewCount={200} distributions={defaultDistributions} />
        );

        const button = screen.queryByText('See customer reviews >');
        expect(button).not.toBeInTheDocument();
    });
});
