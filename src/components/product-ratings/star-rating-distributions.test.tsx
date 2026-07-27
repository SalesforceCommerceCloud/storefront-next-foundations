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
import { StarRatingDistributions } from './star-rating-distributions';

describe('StarRatingDistributions', () => {
    const mockDistributions = [
        { rating: 5, count: 100 },
        { rating: 4, count: 50 },
        { rating: 3, count: 25 },
        { rating: 2, count: 15 },
        { rating: 1, count: 10 },
    ];

    it('renders all star ratings from 5 to 1', () => {
        render(<StarRatingDistributions distributions={mockDistributions} />);
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders review counts for each rating', () => {
        render(<StarRatingDistributions distributions={mockDistributions} />);
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('fills in missing ratings with zero count', () => {
        const sparseDistributions = [
            { rating: 5, count: 100 },
            { rating: 1, count: 10 },
        ];
        render(<StarRatingDistributions distributions={sparseDistributions} />);

        // Should still render all 5 distributions (no onRatingClick so rows are non-focusable divs)
        expect(screen.getByLabelText(/5 stars/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/4 stars/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/3 stars/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/2 stars/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/1 stars/i)).toBeInTheDocument();
    });

    it('renders in correct order (5 to 1)', () => {
        const { container } = render(<StarRatingDistributions distributions={mockDistributions} />);
        const ratings = container.querySelectorAll('span[class*="text-right"]');
        const ratingLabels = Array.from(ratings)
            .filter((span) => span.textContent && ['1', '2', '3', '4', '5'].includes(span.textContent))
            .map((span) => span.textContent);

        expect(ratingLabels).toEqual(['5', '4', '3', '2', '1']);
    });

    it('has role="group" for accessibility', () => {
        const { container } = render(<StarRatingDistributions distributions={mockDistributions} />);
        expect(container.firstChild).toHaveAttribute('role', 'group');
    });

    it('has accessible aria-label for the group', () => {
        render(<StarRatingDistributions distributions={mockDistributions} />);
        const group = screen.getByRole('group', { name: /star rating distribution.*200.*total reviews/i });
        expect(group).toBeInTheDocument();
    });

    it('when onRatingClick is not provided, child distributions are not focusable (no keyboard trap per WCAG 2.1.1)', () => {
        const { container } = render(<StarRatingDistributions distributions={mockDistributions} />);
        const focusableByTabindex = container.querySelectorAll('[tabindex="0"]');
        expect(focusableByTabindex).toHaveLength(0);
    });

    it('when onRatingClick is provided, child distributions are focusable buttons', () => {
        const { container } = render(
            <StarRatingDistributions distributions={mockDistributions} onRatingClick={() => {}} />
        );
        const buttons = container.querySelectorAll('button');
        expect(buttons).toHaveLength(5);
    });

    it('applies custom className', () => {
        const { container } = render(
            <StarRatingDistributions distributions={mockDistributions} className="custom-class" />
        );
        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders star icons with correct size', () => {
        const { container } = render(<StarRatingDistributions distributions={mockDistributions} />);
        const starIcons = container.querySelectorAll('svg');
        starIcons.forEach((icon) => {
            expect(icon).toHaveClass('w-4', 'h-4');
        });
    });

    it('handles empty distributions array', () => {
        render(<StarRatingDistributions distributions={[]} />);

        // Should still render all ratings with 0 count
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });
});
