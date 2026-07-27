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
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import ActiveFilters from './index';
import type { ShopperSearch } from '@/scapi';

const mockNavigate = vi.fn();

vi.mock('@/hooks/use-navigate', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('@/extensions/store-locator/providers/store-locator', () => ({
    useStoreLocator: () => null,
}));

const createProductSearchResult = (): ShopperSearch.schemas['ProductSearchResult'] => ({
    hits: [],
    limit: 24,
    offset: 0,
    total: 100,
    query: '',
    searchPhraseSuggestions: {
        suggestedTerms: [],
    },
    sortingOptions: [],
    refinements: [
        {
            attributeId: 'cgid',
            label: 'Category',
            values: [{ value: 'womens-outfits', label: 'Outfits', hitCount: 10 }],
        },
        {
            attributeId: 'c_refinementColor',
            label: 'Color',
            values: [{ value: 'Black', label: 'Black', hitCount: 8 }],
        },
    ],
});

const renderComponent = (initialEntry: string) => {
    const router = createMemoryRouter(
        [
            {
                path: '*',
                element: <ActiveFilters result={createProductSearchResult()} />,
            },
        ],
        { initialEntries: [initialEntry] }
    );
    return render(<RouterProvider router={router} />);
};

describe('ActiveFilters on category pages', () => {
    beforeEach(() => {
        mockNavigate.mockReset();
    });

    test('hides cgid quick filters from applied filters list', () => {
        renderComponent('/category/womens-clothing?refine=cgid%3Dwomens-outfits&refine=c_refinementColor%3DBlack');

        expect(screen.getByRole('button', { name: /Black/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Outfits/i })).not.toBeInTheDocument();
    });

    test('clear all still removes all refine params including cgid', async () => {
        const user = userEvent.setup();
        renderComponent('/category/womens-clothing?refine=cgid%3Dwomens-outfits&refine=c_refinementColor%3DBlack');

        await user.click(screen.getByRole('button', { name: /clear all/i }));

        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({
                search: expect.stringContaining('offset=0'),
            })
        );
        const firstCallArg = mockNavigate.mock.calls[0]?.[0] as { search?: string };
        expect(firstCallArg.search).not.toContain('refine=');
    });
});
