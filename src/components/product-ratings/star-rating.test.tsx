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
import { describe, test, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { StarRating } from './star-rating';

// Mock react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, params?: Record<string, unknown>) => {
            // Mock translations for testing
            const translations: Record<string, string> = {
                'product:rating.starContainerAriaLabel': '{{rating}} out of {{total}} stars, {{count}} reviews',
                'product:rating.ratingOutOfTotal': '{{rating}} out of {{total}}',
                'product:rating.ratingValue': '{{rating}}',
                'product:rating.basedOnReviews': 'Based on {{count}} reviews',
                'product:rating.ratingWithCount': '{{rating}} ({{count}})',
                'product:rating.viewAllReviews': 'View all reviews',
            };
            const template = translations[key] || key;
            if (params) {
                // Simple interpolation for testing (handles {{variable}} syntax)
                return template.replace(/\{\{(\w+)\}\}/g, (_, paramKey) =>
                    String(params[paramKey] ?? `{{${paramKey}}}`)
                );
            }
            return template;
        },
    }),
}));

describe('StarRating', () => {
    describe('basic rendering', () => {
        test('renders 5 stars', () => {
            const { container } = render(<StarRating rating={4.5} reviewCount={100} />);
            const stars = container.querySelectorAll('svg');
            expect(stars.length).toBe(5);
        });

        test('renders aria-label on star container with rating and review count', () => {
            const { container } = render(<StarRating rating={4.8} reviewCount={123} />);
            const starContainer = container.querySelector('[role="group"]');
            expect(starContainer).toHaveAttribute('aria-label', '4.8 out of 5 stars, 123 reviews');
        });

        test('renders with default small star size', () => {
            const { container } = render(<StarRating rating={4.5} reviewCount={100} />);
            const firstStar = container.querySelector('svg');
            expect(firstStar).toHaveClass('w-3', 'h-3');
        });
    });

    describe('star sizes', () => {
        test('renders small stars when starSize is sm', () => {
            const { container } = render(<StarRating rating={4.5} reviewCount={100} starSize="sm" />);
            const firstStar = container.querySelector('svg');
            expect(firstStar).toHaveClass('w-3', 'h-3');
        });

        test('renders default size stars when starSize is default', () => {
            const { container } = render(<StarRating rating={4.5} reviewCount={100} starSize="default" />);
            const firstStar = container.querySelector('svg');
            expect(firstStar).toHaveClass('w-4', 'h-4');
        });

        test('renders large stars when starSize is lg', () => {
            const { container } = render(<StarRating rating={4.5} reviewCount={100} starSize="lg" />);
            const firstStar = container.querySelector('svg');
            expect(firstStar).toHaveClass('w-6', 'h-6');
        });
    });

    describe('rating values', () => {
        test('clamps rating below 0 to 0', () => {
            const { container } = render(<StarRating rating={-1} reviewCount={10} />);
            const starContainer = container.querySelector('[role="group"]');
            expect(starContainer).toHaveAttribute('aria-label', '0 out of 5 stars, 10 reviews');
        });

        test('clamps rating above 5 to 5', () => {
            const { container } = render(<StarRating rating={6} reviewCount={10} />);
            const starContainer = container.querySelector('[role="group"]');
            expect(starContainer).toHaveAttribute('aria-label', '5 out of 5 stars, 10 reviews');
        });

        test('formats whole numbers without decimal (5 instead of 5.0)', () => {
            render(<StarRating rating={5} reviewCount={100} showRatingLabel ratingLabelPosition="top" />);
            expect(screen.getByText('5 out of 5')).toBeInTheDocument();
        });

        test('formats decimal numbers with one decimal place (4.8)', () => {
            render(<StarRating rating={4.8} reviewCount={100} showRatingLabel ratingLabelPosition="top" />);
            expect(screen.getByText('4.8 out of 5')).toBeInTheDocument();
        });

        test('rounds to one decimal place (4.86 becomes 4.9)', () => {
            render(<StarRating rating={4.86} reviewCount={100} showRatingLabel ratingLabelPosition="top" />);
            expect(screen.getByText('4.9 out of 5')).toBeInTheDocument();
        });
    });

    describe('rating label', () => {
        test('does not show rating label by default', () => {
            const { container } = render(<StarRating rating={4.5} reviewCount={100} />);
            // Should not have a visible rating label (only screen reader text)
            const visibleLabels = container.querySelectorAll('.text-sm');
            expect(visibleLabels.length).toBe(0);
        });

        test('shows rating label when showRatingLabel is true', () => {
            render(<StarRating rating={4.5} reviewCount={100} showRatingLabel />);
            expect(screen.getByText('4.5 out of 5')).toBeInTheDocument();
        });

        test('shows rating label in top position by default', () => {
            render(<StarRating rating={4.5} reviewCount={100} showRatingLabel />);
            const label = screen.getByText('4.5 out of 5');
            expect(label).toBeInTheDocument();
        });

        test('shows rating label in right position when specified', () => {
            render(<StarRating rating={4.5} reviewCount={100} showRatingLabel ratingLabelPosition="right" />);
            const label = screen.getByText('4.5 out of 5');
            expect(label).toBeInTheDocument();
        });

        test('shows full format by default (X out of 5)', () => {
            render(<StarRating rating={4.5} reviewCount={100} showRatingLabel />);
            expect(screen.getByText('4.5 out of 5')).toBeInTheDocument();
        });

        test('shows short format when specified (just rating number)', () => {
            render(<StarRating rating={4.5} reviewCount={100} showRatingLabel ratingLabelFormat="short" />);
            expect(screen.getByText('4.5')).toBeInTheDocument();
            expect(screen.queryByText('out of 5')).not.toBeInTheDocument();
        });

        test('uses custom template when provided', () => {
            render(
                <StarRating rating={4.5} reviewCount={100} showRatingLabel ratingLabelTemplate="Rated {rating}/5" />
            );
            expect(screen.getByText('Rated 4.5/5')).toBeInTheDocument();
        });

        test('applies custom className to rating label', () => {
            render(
                <StarRating
                    rating={4.5}
                    reviewCount={100}
                    showRatingLabel
                    ratingLabelClassName="custom-class text-red-500"
                />
            );
            const label = screen.getByText('4.5 out of 5');
            expect(label).toHaveClass('custom-class', 'text-red-500');
        });

        test('applies default className to rating label', () => {
            render(<StarRating rating={4.5} reviewCount={100} showRatingLabel />);
            const label = screen.getByText('4.5 out of 5');
            expect(label).toHaveClass('text-xs', 'font-normal', 'leading-none', 'text-card-foreground');
        });
    });

    describe('rating link', () => {
        test('does not show rating link by default', () => {
            render(<StarRating rating={4.5} reviewCount={100} />);
            expect(screen.queryByRole('button')).not.toBeInTheDocument();
        });

        test('shows rating link when showRatingLink is true', () => {
            render(<StarRating rating={4.5} reviewCount={100} showRatingLink />);
            expect(screen.getByRole('button', { name: 'View all reviews' })).toBeInTheDocument();
            expect(screen.getByText('4.5 (100)')).toBeInTheDocument();
        });

        test('calls onRatingLinkClick when clicked', async () => {
            const user = userEvent.setup();
            const handleClick = vi.fn();
            render(<StarRating rating={4.5} reviewCount={100} showRatingLink onRatingLinkClick={handleClick} />);

            const link = screen.getByRole('button', { name: 'View all reviews' });
            await user.click(link);

            // Click triggers both hover (mouseEnter) and click events
            expect(handleClick).toHaveBeenCalledTimes(2);
        });

        test('calls onRatingLinkClick when hovered', async () => {
            const user = userEvent.setup();
            const handleHover = vi.fn();
            render(<StarRating rating={4.5} reviewCount={100} showRatingLink onRatingLinkClick={handleHover} />);

            const link = screen.getByRole('button', { name: 'View all reviews' });
            await user.hover(link);

            expect(handleHover).toHaveBeenCalledTimes(1);
        });

        test('uses custom template for rating link visual text', () => {
            render(
                <StarRating
                    rating={4.5}
                    reviewCount={100}
                    showRatingLink
                    ratingLinkTemplate="See all {count} reviews"
                />
            );
            // When custom ratingLinkTemplate is provided, aria-label matches visual text
            expect(screen.getByRole('button', { name: 'See all 100 reviews' })).toBeInTheDocument();
            expect(screen.getByText('See all 100 reviews')).toBeInTheDocument();
        });

        test('formats whole numbers without decimal in link', () => {
            render(<StarRating rating={5} reviewCount={100} showRatingLink />);
            expect(screen.getByRole('button', { name: 'View all reviews' })).toBeInTheDocument();
            expect(screen.getByText('5 (100)')).toBeInTheDocument();
        });
    });

    describe('review count label', () => {
        test('does not show review count label by default', () => {
            const { container } = render(<StarRating rating={4.5} reviewCount={100} />);
            expect(container.textContent).not.toContain('Based on 100 reviews');
        });

        test('shows review count label when showReviewCountLabel is true', () => {
            render(<StarRating rating={4.5} reviewCount={100} showReviewCountLabel />);
            expect(screen.getByText('Based on 100 reviews')).toBeInTheDocument();
        });

        test('uses custom template for review count label', () => {
            render(
                <StarRating
                    rating={4.5}
                    reviewCount={100}
                    showReviewCountLabel
                    reviewCountLabelTemplate="{count} customer reviews"
                />
            );
            expect(screen.getByText('100 customer reviews')).toBeInTheDocument();
        });

        test('applies custom className to review count label', () => {
            render(
                <StarRating
                    rating={4.5}
                    reviewCount={100}
                    showReviewCountLabel
                    reviewCountLabelClassName="custom-review-class text-blue-500"
                />
            );
            const label = screen.getByText('Based on 100 reviews');
            expect(label).toHaveClass('custom-review-class', 'text-blue-500');
        });

        test('applies default className to review count label', () => {
            render(<StarRating rating={4.5} reviewCount={100} showReviewCountLabel />);
            const label = screen.getByText('Based on 100 reviews');
            expect(label).toHaveClass('text-xs', 'text-gray-500', 'mt-2', 'mb-4');
        });
    });

    describe('combined features', () => {
        test('shows all features together', () => {
            const handleClick = vi.fn();
            render(
                <StarRating
                    rating={4.8}
                    reviewCount={342}
                    showRatingLabel
                    ratingLabelPosition="top"
                    showRatingLink
                    showReviewCountLabel
                    onRatingLinkClick={handleClick}
                />
            );

            expect(screen.getByText('4.8 out of 5')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'View all reviews' })).toBeInTheDocument();
            expect(screen.getByText('4.8 (342)')).toBeInTheDocument();
            expect(screen.getByText('Based on 342 reviews')).toBeInTheDocument();
        });

        test('works with custom templates for all labels', () => {
            render(
                <StarRating
                    rating={4.3}
                    reviewCount={156}
                    showRatingLabel
                    ratingLabelTemplate="Rated {rating}/5"
                    showRatingLink
                    ratingLinkTemplate="See all {count} reviews"
                    showReviewCountLabel
                    reviewCountLabelTemplate="{count} customer reviews"
                />
            );

            expect(screen.getByText('Rated 4.3/5')).toBeInTheDocument();
            // When custom ratingLinkTemplate is provided, aria-label matches visual text
            expect(screen.getByRole('button', { name: 'See all 156 reviews' })).toBeInTheDocument();
            expect(screen.getByText('See all 156 reviews')).toBeInTheDocument();
            expect(screen.getByText('156 customer reviews')).toBeInTheDocument();
        });
    });

    describe('custom className prop', () => {
        test('applies custom className to container', () => {
            const { container } = render(<StarRating rating={4.5} reviewCount={100} className="custom-container" />);
            const mainDiv = container.firstChild;
            expect(mainDiv).toHaveClass('custom-container');
        });

        test('preserves default container classes with custom className', () => {
            const { container } = render(<StarRating rating={4.5} reviewCount={100} className="custom-container" />);
            const mainDiv = container.firstChild;
            expect(mainDiv).toHaveClass('flex', 'flex-col', 'gap-1', 'custom-container');
        });
    });

    describe('accessibility', () => {
        test('stars are hidden from screen readers', () => {
            const { container } = render(<StarRating rating={4.5} reviewCount={100} />);
            const stars = container.querySelectorAll('svg');
            stars.forEach((star) => {
                expect(star).toHaveAttribute('aria-hidden', 'true');
            });
        });

        test('star container has role="group" for semantic meaning', () => {
            const { container } = render(<StarRating rating={4.5} reviewCount={100} />);
            const starContainer = container.querySelector('[role="group"]');
            expect(starContainer).toBeInTheDocument();
        });

        test('star container has aria-label with rating info', () => {
            const { container } = render(<StarRating rating={4.5} reviewCount={100} />);
            const starContainer = container.querySelector('[role="group"]');
            expect(starContainer).toHaveAttribute('aria-label', '4.5 out of 5 stars, 100 reviews');
        });

        test('star container is not keyboard focusable (non-interactive)', () => {
            const { container } = render(<StarRating rating={4.5} reviewCount={100} />);
            const starContainer = container.querySelector('[role="group"]');
            expect(starContainer).not.toHaveAttribute('tabIndex');
        });

        test('rating link is keyboard accessible', () => {
            render(<StarRating rating={4.5} reviewCount={100} showRatingLink />);
            const link = screen.getByRole('button', { name: 'View all reviews' });
            expect(link).toHaveAttribute('type', 'button');
        });

        test('rating link has descriptive aria-label', () => {
            render(<StarRating rating={4.5} reviewCount={100} showRatingLink />);
            const link = screen.getByRole('button', { name: 'View all reviews' });
            expect(link).toHaveAttribute('aria-label', 'View all reviews');
        });

        test('uses custom aria-label template for star container', () => {
            const { container } = render(
                <StarRating
                    rating={4.5}
                    reviewCount={100}
                    starContainerAriaLabelTemplate="{rating} de {total} estrellas, {count} reseñas"
                />
            );
            const starContainer = container.querySelector('[role="group"]');
            expect(starContainer).toHaveAttribute('aria-label', '4.5 de 5 estrellas, 100 reseñas');
        });

        test('uses custom aria-label for rating link button', () => {
            render(
                <StarRating
                    rating={4.5}
                    reviewCount={100}
                    showRatingLink
                    ratingLinkAriaLabelTemplate="Ver todas las reseñas"
                />
            );
            const link = screen.getByRole('button', { name: 'Ver todas las reseñas' });
            expect(link).toHaveAttribute('aria-label', 'Ver todas las reseñas');
        });

        test('uses custom totalStars in aria-label', () => {
            const { container } = render(<StarRating rating={4.5} reviewCount={100} totalStars={10} />);
            const starContainer = container.querySelector('[role="group"]');
            expect(starContainer).toHaveAttribute('aria-label', '4.5 out of 10 stars, 100 reviews');
        });
    });

    describe('edge cases', () => {
        test('handles 0 rating', () => {
            render(<StarRating rating={0} reviewCount={0} showRatingLabel />);
            expect(screen.getByText('0 out of 5')).toBeInTheDocument();
        });

        test('handles 0 review count', () => {
            render(<StarRating rating={4.5} reviewCount={0} showReviewCountLabel />);
            expect(screen.getByText('Based on 0 reviews')).toBeInTheDocument();
        });

        test('handles very large review counts', () => {
            render(<StarRating rating={4.5} reviewCount={999999} showRatingLink />);
            expect(screen.getByRole('button', { name: 'View all reviews' })).toBeInTheDocument();
            expect(screen.getByText('4.5 (999999)')).toBeInTheDocument();
        });

        test('handles decimal ratings near boundaries', () => {
            render(<StarRating rating={0.1} reviewCount={1} showRatingLabel ratingLabelFormat="short" />);
            expect(screen.getByText('0.1')).toBeInTheDocument();
        });

        test('handles rating of exactly 5', () => {
            render(<StarRating rating={5.0} reviewCount={100} showRatingLabel ratingLabelFormat="short" />);
            expect(screen.getByText('5')).toBeInTheDocument();
        });
    });

    describe('template placeholders', () => {
        test('handles missing placeholders gracefully', () => {
            render(<StarRating rating={4.5} reviewCount={100} showRatingLabel ratingLabelTemplate="Fixed text" />);
            expect(screen.getByText('Fixed text')).toBeInTheDocument();
        });

        test('leaves unknown placeholders unchanged', () => {
            render(
                <StarRating
                    rating={4.5}
                    reviewCount={100}
                    showRatingLabel
                    ratingLabelTemplate="Rating: {rating}, Unknown: {unknown}"
                />
            );
            expect(screen.getByText('Rating: 4.5, Unknown: {unknown}')).toBeInTheDocument();
        });
    });

    describe('starClassName prop', () => {
        test('applies starClassName to each star SVG', () => {
            const { container } = render(<StarRating rating={3} reviewCount={10} starClassName="text-foreground" />);
            // Use getAttribute('class') because SVGElement.className is SVGAnimatedString, not a plain string
            const stars = container.querySelectorAll('[role="group"] svg');
            expect(stars.length).toBeGreaterThan(0);
            stars.forEach((star) => {
                expect(star.getAttribute('class')).toContain('text-foreground');
            });
        });

        test('merges starClassName with the size class', () => {
            const { container } = render(
                <StarRating rating={3} reviewCount={10} starSize="lg" starClassName="custom-color" />
            );
            const firstStar = container.querySelector('[role="group"] svg');
            expect(firstStar?.getAttribute('class')).toContain('custom-color');
        });
    });

    describe('ratingLinkClassName prop', () => {
        test('applies ratingLinkClassName to the rating link button', () => {
            render(
                <StarRating
                    rating={4}
                    reviewCount={50}
                    showRatingLink
                    ratingLinkClassName="text-xs text-muted-foreground"
                />
            );
            const linkButton = screen.getByRole('button');
            expect(linkButton.className).toContain('text-xs');
            expect(linkButton.className).toContain('text-muted-foreground');
        });

        test('always preserves focus/cursor classes alongside ratingLinkClassName', () => {
            render(<StarRating rating={4} reviewCount={50} showRatingLink ratingLinkClassName="custom-class" />);
            const linkButton = screen.getByRole('button');
            expect(linkButton.className).toContain('cursor-pointer');
            expect(linkButton.className).toContain('custom-class');
        });

        test('uses default ratingLinkClassName when prop is omitted', () => {
            render(<StarRating rating={4} reviewCount={50} showRatingLink />);
            const linkButton = screen.getByRole('button');
            expect(linkButton.className).toContain('text-muted-foreground');
            expect(linkButton.className).toContain('underline');
        });
    });
});
