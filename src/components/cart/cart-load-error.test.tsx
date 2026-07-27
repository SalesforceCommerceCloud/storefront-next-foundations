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
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useAsyncError } from 'react-router';
import { ApiError } from '@/scapi';
import { NormalizedApiError } from '@/lib/api/normalized-api-error';
import { CartLoadError } from './cart-load-error';

vi.mock('react-router', async () => {
    const actual = await vi.importActual<typeof import('react-router')>('react-router');
    return {
        ...actual,
        useAsyncError: vi.fn(),
    };
});

vi.mock('@/components/link', async () => {
    const { Link: RouterLink } = await vi.importActual<typeof import('react-router')>('react-router');
    return { Link: RouterLink };
});

const renderWith = (asyncError: unknown) => {
    vi.mocked(useAsyncError).mockReturnValue(asyncError);
    return render(
        <MemoryRouter>
            <CartLoadError />
        </MemoryRouter>
    );
};

describe('CartLoadError', () => {
    let originalEnvDev: boolean;

    beforeEach(() => {
        originalEnvDev = import.meta.env.DEV;
        vi.clearAllMocks();
    });

    afterEach(() => {
        import.meta.env.DEV = originalEnvDev;
    });

    test('renders the translated error message and retry link', () => {
        renderWith(new NormalizedApiError(new Error('boom')));

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText("We couldn't load your cart. Please try again.")).toBeInTheDocument();
        const retryLink = screen.getByRole('link', { name: 'Retry' });
        expect(retryLink).toHaveAttribute('href', '/cart');
    });

    test('shows DEV-only status and message when error is a NormalizedApiError', () => {
        import.meta.env.DEV = true;
        const apiError = new ApiError({
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers(),
            body: { type: 'unavailable', title: 'Unavailable', detail: 'Basket service down' },
            rawBody: JSON.stringify({ detail: 'Basket service down' }),
            url: 'https://api.example.com/baskets',
            method: 'GET',
        });
        renderWith(new NormalizedApiError(apiError));

        expect(screen.getByText('503')).toBeInTheDocument();
        expect(screen.getByText('Basket service down')).toBeInTheDocument();
    });

    test('hides DEV details block when async error is not a NormalizedApiError', () => {
        import.meta.env.DEV = true;
        renderWith(new Error('plain boom'));

        // No status digits and no error message echo — the conditional block is gone
        expect(screen.queryByText(/^[1-5]\d{2}$/)).not.toBeInTheDocument();
        expect(screen.queryByText('plain boom')).not.toBeInTheDocument();
        // But the user-facing message is still there
        expect(screen.getByText("We couldn't load your cart. Please try again.")).toBeInTheDocument();
    });
});
