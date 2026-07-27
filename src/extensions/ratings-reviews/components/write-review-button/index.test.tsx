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

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type React from 'react';
import WriteReviewButton from './index';
import type { WriteReviewFormData } from '@/extensions/ratings-reviews/lib/api/reviews.server';

const mockFormConfig: WriteReviewFormData = {
    title: 'Write a Review',
    overallRating: { label: 'Overall Rating', required: true, placeholder: 'Select' },
    reviewTitle: { label: 'Review Title', placeholder: 'Summarize', maxCharacters: 250 },
    reviewBody: { label: 'Your Review', placeholder: 'Your thoughts', minCharacters: 50, maxCharacters: 2000 },
    recommend: { label: 'Recommend?', yesLabel: 'Yes', noLabel: 'No' },
    addPhotos: { label: 'Add Photos', hint: 'Click to upload', accept: 'PNG, JPG', maxSize: '5MB' },
    termsText: 'Terms apply.',
    cancelLabel: 'Cancel',
    submitLabel: 'Submit Review',
};

vi.mock('@/components/info-modal', () => ({
    default: ({
        open,
        onOpenChange,
        data,
    }: {
        open: boolean;
        onOpenChange: (open: boolean) => void;
        data?: { type: string; formConfig?: WriteReviewFormData };
    }) => {
        if (!open) return null;
        return (
            <div role="dialog" data-testid="info-modal">
                <span data-testid="modal-type">{data?.type ?? 'none'}</span>
                {data?.formConfig && <span data-testid="modal-title">{data.formConfig.title}</span>}
                <button type="button" onClick={() => onOpenChange(false)}>
                    Close
                </button>
            </div>
        );
    },
}));

vi.mock('@/providers/product-context', () => ({
    useProduct: () => ({ id: 'product-123' }),
}));
vi.mock('@/hooks/use-require-auth', () => ({
    useRequireAuth: (fn: (...args: unknown[]) => Promise<unknown>) => fn,
}));

const renderWithRouter = (component: React.ReactElement) => {
    const router = createMemoryRouter([{ path: '/', element: component }]);
    return render(<RouterProvider router={router} />);
};

describe('WriteReviewButton', () => {
    it('renders a button with data-testid write-review-button', () => {
        renderWithRouter(<WriteReviewButton formConfig={mockFormConfig} />);
        expect(screen.getByTestId('write-review-button')).toBeInTheDocument();
    });

    it('shows button label from formConfig', () => {
        renderWithRouter(<WriteReviewButton formConfig={mockFormConfig} />);
        expect(screen.getByRole('button', { name: 'Write a Review' })).toBeInTheDocument();
    });

    it('opens modal when button is clicked', async () => {
        const user = userEvent.setup();
        renderWithRouter(<WriteReviewButton formConfig={mockFormConfig} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Write a Review' }));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
        expect(screen.getByTestId('modal-type')).toHaveTextContent('write-review');
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Write a Review');
    });

    it('closes modal when Close is clicked', async () => {
        const user = userEvent.setup();
        renderWithRouter(<WriteReviewButton formConfig={mockFormConfig} />);
        await user.click(screen.getByRole('button', { name: 'Write a Review' }));
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
        await user.click(screen.getByRole('button', { name: 'Close' }));
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    it('falls back to translated label when formConfig is omitted', () => {
        renderWithRouter(<WriteReviewButton />);
        const button = screen.getByTestId('write-review-button');
        expect(button).toBeInTheDocument();
        expect(button.textContent?.length).toBeGreaterThan(0);
    });
});
