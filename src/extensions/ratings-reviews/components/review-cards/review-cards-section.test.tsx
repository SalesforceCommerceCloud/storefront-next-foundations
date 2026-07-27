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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewCardsSection from './review-cards-section';
import type { ReviewItem } from '@/extensions/ratings-reviews/lib/api/reviews.server';

const mockReview1: ReviewItem = {
    id: 'r1',
    authorName: 'Alice',
    verifiedPurchase: true,
    date: 'Jan 2025',
    rating: 5,
    headline: 'Great',
    body: 'Body one.',
    helpfulCount: 0,
};
const mockLoadReviewsIfNeeded = vi.fn();
const mockUseProductReviews = vi.fn();
vi.mock('@/providers/product-context', () => ({
    useProduct: () => ({ id: 'product-123' }),
}));
vi.mock('@/extensions/ratings-reviews/providers/product-reviews-context', () => ({
    useProductReviews: (...args: unknown[]) => mockUseProductReviews(...args),
}));

// Avoid image resolution in section's child ReviewCard
vi.mock('./review-card-images', () => ({
    REVIEW_CARD_IMAGES: {},
}));
vi.mock('@/hooks/use-require-auth', () => ({
    useRequireAuth: (fn: (...args: unknown[]) => Promise<unknown>) => fn,
}));

const defaultReviewsContext = {
    reviewsSummary: null,
    reviewsSummaryLoading: false,
    reviews: [] as ReviewItem[],
    reviewsLoading: false,
    loadReviewsIfNeeded: mockLoadReviewsIfNeeded,
    aiSummary: '',
    addReview: vi.fn(),
    expandReviews: vi.fn(),
    registerExpand: vi.fn(),
};

describe('ReviewCardsSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseProductReviews.mockReturnValue(defaultReviewsContext);
    });

    it('shows no reviews message when context has no reviews', async () => {
        mockUseProductReviews.mockReturnValue({ ...defaultReviewsContext, reviews: [] });
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByText('No reviews for this product.')).toBeInTheDocument();
        });
    });

    it('shows no reviews message when context has empty reviews', async () => {
        mockUseProductReviews.mockReturnValue({ ...defaultReviewsContext, reviews: [] });
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByText('No reviews for this product.')).toBeInTheDocument();
        });
    });

    it('fetches and displays reviews with showing X–Y of Z and pagination', async () => {
        const sevenReviews: ReviewItem[] = Array.from({ length: 7 }, (_, i) => ({
            ...mockReview1,
            id: `r${i}`,
            authorName: `User ${i}`,
            headline: `Headline ${i}`,
        }));
        mockUseProductReviews.mockReturnValue({ ...defaultReviewsContext, reviews: sevenReviews });
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByText(/Showing 1-5 of 7 reviews/)).toBeInTheDocument();
        });
        expect(screen.getByText('User 0')).toBeInTheDocument();
        expect(screen.getByText('Headline 0')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument();
    });

    it('navigates to page 2 and updates showing range', async () => {
        const sixReviews: ReviewItem[] = Array.from({ length: 6 }, (_, i) => ({
            ...mockReview1,
            id: `r${i}`,
            authorName: `User ${i}`,
            headline: `Headline ${i}`,
        }));
        mockUseProductReviews.mockReturnValue({ ...defaultReviewsContext, reviews: sixReviews });
        const user = userEvent.setup();
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByText(/Showing 1-5 of 6 reviews/)).toBeInTheDocument();
        });
        await user.click(screen.getByRole('button', { name: 'Page 2' }));
        await waitFor(() => {
            expect(screen.getByText(/Showing 6-6 of 6 reviews/)).toBeInTheDocument();
        });
        expect(screen.getByText('User 5')).toBeInTheDocument();
    });

    it('displays reviews from context when provided', async () => {
        mockUseProductReviews.mockReturnValue({ ...defaultReviewsContext, reviews: [mockReview1] });
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByText(/Showing 1-1 of 1 reviews/)).toBeInTheDocument();
        });
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Great')).toBeInTheDocument();
    });

    it('filters by star rating when a rating chip is clicked', async () => {
        const fiveStar = { ...mockReview1, id: 'r1', rating: 5, authorName: 'Alice', headline: 'Five' };
        const fourStar = { ...mockReview1, id: 'r2', rating: 4, authorName: 'Bob', headline: 'Four' };
        mockUseProductReviews.mockReturnValue({
            ...defaultReviewsContext,
            reviews: [
                fiveStar,
                fourStar,
                { ...mockReview1, id: 'r3', rating: 5, authorName: 'Carol', headline: 'Also five' },
            ],
        });
        const user = userEvent.setup();
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByText(/Showing 1-3 of 3 reviews/)).toBeInTheDocument();
        });
        await user.click(screen.getByRole('button', { name: 'Filter by 5 stars' }));
        await waitFor(() => {
            expect(screen.getByText(/Showing 1-2 of 2 reviews/)).toBeInTheDocument();
        });
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Carol')).toBeInTheDocument();
        expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });

    it('filters by search keyword', async () => {
        const reviews: ReviewItem[] = [
            { ...mockReview1, id: 'r1', authorName: 'Alice', headline: 'Great product', body: 'Loved it.' },
            { ...mockReview1, id: 'r2', authorName: 'Bob', headline: 'Okay', body: 'Not bad.' },
        ];
        mockUseProductReviews.mockReturnValue({ ...defaultReviewsContext, reviews });
        const user = userEvent.setup();
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByText(/Showing 1-2 of 2 reviews/)).toBeInTheDocument();
        });
        await user.type(screen.getByPlaceholderText('Search reviews...'), 'Great');
        await waitFor(
            () => {
                expect(screen.getByText(/Showing 1-1 of 1 reviews/)).toBeInTheDocument();
            },
            { timeout: 2000 }
        );
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });

    it('filters by with photos when photo chip is clicked', async () => {
        const withPhotos1 = {
            ...mockReview1,
            id: 'r1',
            authorName: 'Alice',
            photos: [{ url: '/img1.svg', alt: 'Photo 1' }],
        };
        const withPhotos2 = {
            ...mockReview1,
            id: 'r2',
            authorName: 'Bob',
            photos: [{ url: '/img2.svg', alt: 'Photo 2' }],
        };
        const noPhotos = { ...mockReview1, id: 'r3', authorName: 'Carol', photos: undefined };
        mockUseProductReviews.mockReturnValue({
            ...defaultReviewsContext,
            reviews: [withPhotos1, withPhotos2, noPhotos],
        });
        const user = userEvent.setup();
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByText(/Showing 1-3 of 3 reviews/)).toBeInTheDocument();
        });
        await user.click(screen.getByRole('button', { name: /With Photos \(2\)/ }));
        await waitFor(() => {
            expect(screen.getByText(/Showing 1-2 of 2 reviews/)).toBeInTheDocument();
        });
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.queryByText('Carol')).not.toBeInTheDocument();
    });

    it('shows filter by, search input, and sort dropdown when reviews exist', async () => {
        mockUseProductReviews.mockReturnValue({ ...defaultReviewsContext, reviews: [mockReview1] });
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByText('Filter by:')).toBeInTheDocument();
        });
        expect(screen.getByPlaceholderText('Search reviews...')).toBeInTheDocument();
        const sortSelect = screen.getByRole('combobox', { name: 'Sort:' });
        expect(sortSelect).toBeInTheDocument();
        expect(sortSelect).toHaveValue('most-recent');
    });

    it('shows no reviews match filters when filters return zero results', async () => {
        mockUseProductReviews.mockReturnValue({ ...defaultReviewsContext, reviews: [mockReview1] });
        const user = userEvent.setup();
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByText(/Showing 1-1 of 1 reviews/)).toBeInTheDocument();
        });
        await user.click(screen.getByRole('button', { name: 'Filter by 4 stars' }));
        await waitFor(
            () => {
                expect(screen.getByText('No reviews match your filters.')).toBeInTheDocument();
            },
            { timeout: 2000 }
        );
    });

    it('sort dropdown has four options', async () => {
        mockUseProductReviews.mockReturnValue({ ...defaultReviewsContext, reviews: [mockReview1] });
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByRole('combobox', { name: 'Sort:' })).toBeInTheDocument();
        });
        const options = screen.getAllByRole('option');
        const labels = options.map((o) => o.textContent);
        expect(labels).toContain('Most Recent');
        expect(labels).toContain('Highest Rated');
        expect(labels).toContain('Lowest Rated');
        expect(labels).toContain('Most Helpful');
        expect(options).toHaveLength(4);
    });
});
