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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type React from 'react';
import { WriteReviewModalContent } from './write-review-modal-content';
import type { WriteReviewFormData } from '@/extensions/ratings-reviews/lib/api/reviews.server';
import { resourceRoutes } from '@/route-paths';

vi.mock('@/extensions/ratings-reviews/providers/product-reviews-context', () => ({
    useProductReviews: () => ({
        productId: 'test-product-123',
        reviewsSummary: null,
        reviewsSummaryLoading: false,
        reviews: [],
        reviewsLoading: false,
        loadReviewsIfNeeded: () => {},
        aiSummary: '',
        addReviewOptimistic: () => {},
        removeReviewOptimistic: () => {},
        expandReviews: () => {},
        registerExpand: () => {},
        registerOnExpanded: () => {},
        triggerOnExpanded: () => {},
    }),
}));

const mockFormConfig: WriteReviewFormData = {
    title: 'Write a Review',
    overallRating: { label: 'Overall Rating', required: true, placeholder: 'Select' },
    reviewTitle: { label: 'Review Title', placeholder: 'Summarize your experience', maxCharacters: 250 },
    reviewBody: { label: 'Your Review', placeholder: 'What did you think?', minCharacters: 50, maxCharacters: 2000 },
    recommend: { label: 'Would you recommend?', yesLabel: 'Yes', noLabel: 'No' },
    addPhotos: {
        label: 'Add Photos (Optional)',
        hint: 'Click to upload',
        accept: 'PNG, JPG',
        maxSize: '5MB',
    },
    termsText: 'By submitting you agree to our terms.',
    cancelLabel: 'Cancel',
    submitLabel: 'Submit Review',
};

const renderWithRouter = (component: React.ReactElement) => {
    const router = createMemoryRouter([
        { path: '/', element: component },
        {
            path: resourceRoutes.addReview,
            action: () => ({
                success: true,
                review: { id: 'review-1', authorName: 'Shopper 0001' },
            }),
        },
    ]);
    return render(<RouterProvider router={router} />);
};

describe('WriteReviewModalContent', () => {
    const defaultProps = {
        formConfig: mockFormConfig,
        onClose: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns null when formConfig is undefined', () => {
        renderWithRouter(<WriteReviewModalContent onClose={vi.fn()} formConfig={undefined} />);
        expect(screen.queryByRole('form')).not.toBeInTheDocument();
        expect(screen.queryByText('Overall Rating')).not.toBeInTheDocument();
    });

    it('renders form with labels from formConfig', () => {
        renderWithRouter(<WriteReviewModalContent {...defaultProps} />);
        expect(screen.getByText('Overall Rating')).toBeInTheDocument();
        expect(screen.getByText('Review Title')).toBeInTheDocument();
        expect(screen.getByLabelText(/Your Review/)).toBeInTheDocument();
        expect(screen.getByText('Would you recommend?')).toBeInTheDocument();
        expect(screen.getByText('Add Photos (Optional)')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Submit Review' })).toBeInTheDocument();
        expect(screen.getByText('By submitting you agree to our terms.')).toBeInTheDocument();
    });

    it('calls onClose when Cancel is clicked', async () => {
        const user = userEvent.setup();
        renderWithRouter(<WriteReviewModalContent {...defaultProps} />);
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('shows rating validation when submit without selecting rating', async () => {
        const user = userEvent.setup();
        renderWithRouter(<WriteReviewModalContent {...defaultProps} />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Submit Review' }));
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('Please select a rating');
        expect(screen.getByRole('alert')).toHaveTextContent('Please fix the following:');
    });

    it('calls onClose after fetcher resolves with success', async () => {
        const user = userEvent.setup();
        renderWithRouter(<WriteReviewModalContent {...defaultProps} />);
        const oneStar = screen.getByRole('radio', { name: '1 out of 5 stars' });
        await user.click(oneStar);
        await user.type(screen.getByPlaceholderText('What did you think?'), 'A'.repeat(50));
        await user.click(screen.getByRole('button', { name: 'Submit Review' }));
        await waitFor(() => expect(defaultProps.onClose).toHaveBeenCalledTimes(1));
    });

    it('calls onAfterSubmit before onClose on successful submit', async () => {
        const user = userEvent.setup();
        const onAfterSubmit = vi.fn();
        const onClose = vi.fn();
        renderWithRouter(<WriteReviewModalContent {...defaultProps} onClose={onClose} onAfterSubmit={onAfterSubmit} />);
        const oneStar = screen.getByRole('radio', { name: '1 out of 5 stars' });
        await user.click(oneStar);
        await user.type(screen.getByPlaceholderText('What did you think?'), 'A'.repeat(50));
        await user.click(screen.getByRole('button', { name: 'Submit Review' }));
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
        expect(onAfterSubmit).toHaveBeenCalledTimes(1);
        expect(onAfterSubmit.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
    });

    it('shows review validation when body is under min characters', async () => {
        const user = userEvent.setup();
        renderWithRouter(<WriteReviewModalContent {...defaultProps} />);
        await user.click(screen.getByRole('radio', { name: '1 out of 5 stars' }));
        await user.type(screen.getByPlaceholderText('What did you think?'), 'Too short');
        await user.click(screen.getByRole('button', { name: 'Submit Review' }));
        expect(screen.getByRole('alert')).toHaveTextContent(/at least 50 characters/);
    });

    it('shows title validation when title exceeds max characters', async () => {
        const configWithShortTitleMax: WriteReviewFormData = {
            ...mockFormConfig,
            reviewTitle: { ...mockFormConfig.reviewTitle, maxCharacters: 5 },
        };
        const user = userEvent.setup();
        renderWithRouter(<WriteReviewModalContent {...defaultProps} formConfig={configWithShortTitleMax} />);
        await user.click(screen.getByRole('radio', { name: '1 out of 5 stars' }));
        fireEvent.input(screen.getByLabelText('Review Title'), { target: { value: '123456' } });
        await user.type(screen.getByPlaceholderText('What did you think?'), 'A'.repeat(50));
        await user.click(screen.getByRole('button', { name: 'Submit Review' }));
        expect(screen.getByRole('alert')).toHaveTextContent(/no more than 5 characters/);
    });

    it('shows review validation when body exceeds max characters', async () => {
        const configWithSmallMax: WriteReviewFormData = {
            ...mockFormConfig,
            reviewBody: { ...mockFormConfig.reviewBody, minCharacters: 1, maxCharacters: 10 },
        };
        const user = userEvent.setup();
        renderWithRouter(<WriteReviewModalContent {...defaultProps} formConfig={configWithSmallMax} />);
        await user.click(screen.getByRole('radio', { name: '1 out of 5 stars' }));
        fireEvent.input(screen.getByPlaceholderText('What did you think?'), { target: { value: '12345678901' } });
        await user.click(screen.getByRole('button', { name: 'Submit Review' }));
        expect(screen.getByRole('alert')).toHaveTextContent(/no more than 10 characters/);
    });

    it('renders recommend Yes/No options', () => {
        renderWithRouter(<WriteReviewModalContent {...defaultProps} />);
        expect(screen.getByRole('radio', { name: 'Yes' })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'No' })).toBeInTheDocument();
    });
});
