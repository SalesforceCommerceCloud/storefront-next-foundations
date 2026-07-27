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
import { MemoryRouter, useRouteError } from 'react-router';
import { ApiError } from '@/scapi';
import { NormalizedApiError } from '@/lib/api/normalized-api-error';
import { WishlistLoadError } from './wishlist-load-error';

vi.mock('react-router', async () => {
    const actual = await vi.importActual<typeof import('react-router')>('react-router');
    return {
        ...actual,
        useRouteError: vi.fn(),
    };
});

vi.mock('@/components/link', async () => {
    const { Link: RouterLink } = await vi.importActual<typeof import('react-router')>('react-router');
    return { Link: RouterLink };
});

const renderWith = (routeError: unknown, retryHref = '/account/wishlist') => {
    vi.mocked(useRouteError).mockReturnValue(routeError);
    return render(
        <MemoryRouter>
            <WishlistLoadError retryHref={retryHref} />
        </MemoryRouter>
    );
};

describe('WishlistLoadError', () => {
    let originalEnvDev: boolean;

    beforeEach(() => {
        originalEnvDev = import.meta.env.DEV;
        vi.clearAllMocks();
    });

    afterEach(() => {
        import.meta.env.DEV = originalEnvDev;
    });

    test('renders the translated error message and retry link to the registered wishlist', () => {
        renderWith(new NormalizedApiError(new Error('boom')));

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText("We couldn't load your wishlist. Please try again.")).toBeInTheDocument();
        const retryLink = screen.getByRole('link', { name: 'Try again' });
        expect(retryLink).toHaveAttribute('href', '/account/wishlist');
    });

    test('honors a different retryHref so the same component can serve guest and registered routes', () => {
        renderWith(new NormalizedApiError(new Error('boom')), '/wishlist');

        const retryLink = screen.getByRole('link', { name: 'Try again' });
        expect(retryLink).toHaveAttribute('href', '/wishlist');
    });

    test('shows DEV-only status and message when error is a NormalizedApiError', () => {
        import.meta.env.DEV = true;
        const apiError = new ApiError({
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers(),
            body: { type: 'unavailable', title: 'Unavailable', detail: 'Wishlist service down' },
            rawBody: JSON.stringify({ detail: 'Wishlist service down' }),
            url: 'https://api.example.com/customers/cust-1/product-lists',
            method: 'GET',
        });
        renderWith(new NormalizedApiError(apiError));

        expect(screen.getByText('503')).toBeInTheDocument();
        expect(screen.getByText('Wishlist service down')).toBeInTheDocument();
    });

    test('hides DEV details when route error is not a NormalizedApiError', () => {
        import.meta.env.DEV = true;
        renderWith(new Error('plain boom'));

        expect(screen.queryByText(/^[1-5]\d{2}$/)).not.toBeInTheDocument();
        expect(screen.queryByText('plain boom')).not.toBeInTheDocument();
        expect(screen.getByText("We couldn't load your wishlist. Please try again.")).toBeInTheDocument();
    });
});
