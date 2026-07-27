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
import { vi, test, describe, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { ShopperSearch } from '@/scapi';
import { mockAltSiteObject } from '@/test-utils/config';
import RefinePrice from './index';

vi.mock('@salesforce/storefront-next-runtime/site-context', async (importOriginal) => {
    const actual = await importOriginal<object>();
    return {
        ...actual,
        useSite: vi.fn(() => ({
            site: { id: mockAltSiteObject.id, defaultLocale: mockAltSiteObject.defaultLocale },
            language: mockAltSiteObject.defaultLocale,
            currency: mockAltSiteObject.defaultCurrency,
        })),
    };
});

const mockToggleFilter = vi.fn();
const mockResult = {
    hits: [
        { productId: '1', price: 25.99 },
        { productId: '2', price: 499.99 },
    ],
} as ShopperSearch.schemas['ProductSearchResult'];

const renderComponent = (url = '/') => {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: (
                    <RefinePrice
                        values={[]}
                        attributeId="price"
                        isFilterSelected={vi.fn()}
                        toggleFilter={mockToggleFilter}
                        result={mockResult}
                    />
                ),
            },
        ],
        {
            initialEntries: [url],
        }
    );
    return { ...render(<RouterProvider router={router} />), router };
};

describe('RefinePrice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('applies price filter correctly', async () => {
        const user = userEvent.setup();
        renderComponent();

        await user.type(screen.getByPlaceholderText('Min'), '50');
        await user.type(screen.getByPlaceholderText('Max'), '200');
        await user.keyboard('{Enter}');

        expect(mockToggleFilter).toHaveBeenCalledWith('price', '(50..200)');
    });

    test('shows validation error for invalid price', async () => {
        const user = userEvent.setup();
        renderComponent();

        await user.type(screen.getByPlaceholderText('Min'), '600'); // > max product price

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Min')).toHaveClass('text-destructive');
        });
    });

    test('populates from URL', () => {
        renderComponent('/?refine=price%3D%2850..200%29');

        expect(screen.getByPlaceholderText('Min')).toHaveValue(50);
        expect(screen.getByPlaceholderText('Max')).toHaveValue(200);
    });

    test('shows validation error when max price is too low', async () => {
        const user = userEvent.setup();
        renderComponent();

        await user.type(screen.getByPlaceholderText('Max'), '10'); // < min product price

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Max')).toHaveClass('text-destructive');
        });
    });

    test('shows validation error when min > max', async () => {
        const user = userEvent.setup();
        renderComponent();

        await user.type(screen.getByPlaceholderText('Min'), '200');
        await user.type(screen.getByPlaceholderText('Max'), '100');

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Min')).toHaveClass('text-destructive');
            expect(screen.getByPlaceholderText('Max')).toHaveClass('text-destructive');
        });
    });

    test('does not apply filter when validation fails', async () => {
        const user = userEvent.setup();
        renderComponent();

        await user.type(screen.getByPlaceholderText('Min'), '600'); // Invalid
        await user.keyboard('{Enter}');

        expect(mockToggleFilter).not.toHaveBeenCalled();
    });
});
