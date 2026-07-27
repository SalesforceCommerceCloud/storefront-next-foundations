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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewCard } from './review-card';
import type { ReviewItem } from '@/extensions/ratings-reviews/lib/api/reviews.server';

vi.mock('./review-card-images', () => ({
    REVIEW_CARD_IMAGES: {
        '/images/black-cube-photo.svg': '/images/black-cube-photo.svg',
    },
}));

const minimalReview: ReviewItem = {
    id: 'rev-1',
    authorName: 'Jane D.',
    verifiedPurchase: false,
    date: 'January 2025',
    rating: 5,
    headline: 'Great product',
    body: 'Short body text.',
    helpfulCount: 0,
};

const reviewWithVerified: ReviewItem = {
    ...minimalReview,
    id: 'rev-2',
    authorName: 'Alexandra P.',
    verifiedPurchase: true,
};

const reviewWithLongBody: ReviewItem = {
    ...minimalReview,
    id: 'rev-3',
    body: 'A'.repeat(500),
};

const reviewWithPhotos: ReviewItem = {
    ...minimalReview,
    id: 'rev-4',
    photos: [{ url: '/images/black-cube-photo.svg', alt: 'Review photo' }],
    reportLabel: 'Report',
};

describe('ReviewCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders author name, headline, body, stars and date', () => {
        render(<ReviewCard review={minimalReview} />);
        expect(screen.getByText('Jane D.')).toBeInTheDocument();
        expect(screen.getByText('Great product')).toBeInTheDocument();
        expect(screen.getByText('Short body text.')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: '5 out of 5 stars' })).toBeInTheDocument();
        expect(screen.getByText('January 2025')).toBeInTheDocument();
    });

    it('renders verified purchase badge when verifiedPurchase is true', () => {
        render(<ReviewCard review={reviewWithVerified} />);
        expect(screen.getByText('Verified Purchase')).toBeInTheDocument();
    });

    it('does not render verified badge when verifiedPurchase is false', () => {
        render(<ReviewCard review={minimalReview} />);
        expect(screen.queryByText('Verified Purchase')).not.toBeInTheDocument();
    });

    it('shows Read more for long body and toggles to Read less on click', async () => {
        const user = userEvent.setup();
        render(<ReviewCard review={reviewWithLongBody} />);
        const readMore = screen.getByTestId('review-read-more');
        expect(readMore).toHaveTextContent('Read More');
        await user.click(readMore);
        expect(screen.getByTestId('review-read-less')).toHaveTextContent('Read Less');
        await user.click(screen.getByTestId('review-read-less'));
        expect(screen.getByTestId('review-read-more')).toHaveTextContent('Read More');
    });

    it('increments helpful count when Helpful is clicked', async () => {
        const user = userEvent.setup();
        render(<ReviewCard review={minimalReview} />);
        const helpful = screen.getByTestId('review-helpful');
        expect(helpful).toHaveTextContent('Helpful');
        await user.click(helpful);
        expect(helpful).toHaveTextContent(/1/);
        await user.click(helpful);
        expect(helpful).toHaveTextContent(/2/);
    });

    it('renders photos when present', () => {
        render(<ReviewCard review={reviewWithPhotos} />);
        const img = screen.getByRole('img', { name: 'Review photo' });
        expect(img).toBeInTheDocument();
    });

    it('opens lightbox when photo is clicked and closes on close button', async () => {
        const user = userEvent.setup();
        render(<ReviewCard review={reviewWithPhotos} />);
        const photoButton = screen.getByRole('button', { name: 'Review photo' });
        await user.click(photoButton);
        expect(screen.getByRole('dialog', { name: 'Review photo' })).toBeInTheDocument();
        const close = screen.getByRole('button', { name: 'Close' });
        await user.click(close);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders report button when reportLabel is provided', () => {
        render(<ReviewCard review={reviewWithPhotos} />);
        expect(screen.getByTestId('review-report')).toHaveTextContent('Report');
    });

    it('renders location when provided', () => {
        const withLocation: ReviewItem = { ...minimalReview, location: 'Boston, MA' };
        render(<ReviewCard review={withLocation} />);
        expect(screen.getByText(/January 2025 • Boston, MA/)).toBeInTheDocument();
    });

    it('has accessible article with headline id', () => {
        render(<ReviewCard review={minimalReview} />);
        const article = screen.getByRole('article', { name: 'Great product' });
        expect(article).toHaveAttribute('aria-labelledby', 'review-headline-rev-1');
        expect(document.getElementById('review-headline-rev-1')).toHaveTextContent('Great product');
    });
});
