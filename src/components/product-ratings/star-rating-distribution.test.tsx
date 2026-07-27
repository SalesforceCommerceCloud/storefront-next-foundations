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
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StarRatingDistribution } from './star-rating-distribution';

describe('StarRatingDistribution', () => {
    it('renders star rating label', () => {
        render(<StarRatingDistribution rating={5} reviewCount={100} totalReviews={200} />);
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders review count label', () => {
        render(<StarRatingDistribution rating={4} reviewCount={50} totalReviews={200} />);
        expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('calculates percentage correctly', () => {
        const { container } = render(<StarRatingDistribution rating={5} reviewCount={100} totalReviews={200} />);
        const progressBarFill = container.querySelector('.bg-rating');
        expect(progressBarFill).toHaveStyle({ width: '50%' });
    });

    it('handles zero total reviews', () => {
        const { container } = render(<StarRatingDistribution rating={5} reviewCount={0} totalReviews={0} />);
        const progressBarFill = container.querySelector('.bg-rating');
        expect(progressBarFill).toHaveStyle({ width: '0%' });
    });

    it('renders with correct star icon size', () => {
        const { container } = render(<StarRatingDistribution rating={5} reviewCount={100} totalReviews={200} />);
        const starIcon = container.querySelector('svg');
        expect(starIcon).toHaveClass('w-4', 'h-4');
    });

    it('is not focusable when non-clickable (no keyboard trap per WCAG 2.1.1)', () => {
        const { container } = render(<StarRatingDistribution rating={5} reviewCount={100} totalReviews={200} />);
        expect(container.firstChild).not.toHaveAttribute('tabindex');
    });

    it('has accessible aria-label with count and total (matches visual; WCAG 1.3.1)', () => {
        render(<StarRatingDistribution rating={5} reviewCount={100} totalReviews={200} />);
        const distribution = screen.getByLabelText(/5 stars.*100.*200.*reviews/i);
        expect(distribution).toBeInTheDocument();
    });

    it('marks visual elements as aria-hidden', () => {
        const { container } = render(<StarRatingDistribution rating={5} reviewCount={100} totalReviews={200} />);
        const ariaHiddenElements = container.querySelectorAll('[aria-hidden="true"]');
        // Should have: rating label, star icon, progress bar container, review count label
        expect(ariaHiddenElements.length).toBeGreaterThanOrEqual(4);
    });

    it('applies custom className', () => {
        const { container } = render(
            <StarRatingDistribution rating={5} reviewCount={100} totalReviews={200} className="custom-class" />
        );
        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('displays review count when all reviews have same rating', () => {
        render(<StarRatingDistribution rating={5} reviewCount={200} totalReviews={200} />);
        expect(screen.getByText('200')).toBeInTheDocument();
    });

    it('displays 0 when no reviews for that rating', () => {
        render(<StarRatingDistribution rating={1} reviewCount={0} totalReviews={200} />);
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('displays review count for very small percentages', () => {
        render(<StarRatingDistribution rating={1} reviewCount={2} totalReviews={200} />);
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('progress bar width reflects percentage', () => {
        // 75/200 = 37.5%
        const { container } = render(<StarRatingDistribution rating={4} reviewCount={75} totalReviews={200} />);
        const progressBarFill = container.querySelector('.bg-rating');
        expect(progressBarFill).toHaveStyle({ width: '37.5%' });
    });

    it('review count label has fixed width for alignment', () => {
        render(<StarRatingDistribution rating={5} reviewCount={100} totalReviews={200} />);
        const countLabel = screen.getByText('100');
        expect(countLabel).toHaveClass('w-6');
    });

    it('uses tabular numbers for consistent digit width', () => {
        render(<StarRatingDistribution rating={5} reviewCount={100} totalReviews={200} />);
        const countLabel = screen.getByText('100');
        expect(countLabel).toHaveClass('tabular-nums');
    });
});
