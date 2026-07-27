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

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WishlistSortFilter } from './wishlist-sort-filter';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

const { t } = getTranslation();

// Mock react-i18next using the same pattern as other wishlist tests
vi.mock('react-i18next', () => ({
    useTranslation: (namespace?: string | string[]) => ({
        t: (key: string, options?: Record<string, unknown>) => {
            const ns = Array.isArray(namespace) ? namespace[0] : namespace;
            if (ns && !key.includes(':')) {
                return t(`${ns}:${key}`, options);
            }
            return t(key, options);
        },
        i18n: { language: 'en-GB' },
    }),
}));

const defaultProps = {
    sortValue: 'recently-added' as const,
    filterValue: 'all' as const,
    onSortChange: vi.fn(),
    onFilterChange: vi.fn(),
};

describe('WishlistSortFilter', () => {
    describe('rendering', () => {
        test('renders the sort label', () => {
            render(<WishlistSortFilter {...defaultProps} />);
            expect(screen.getByText(t('account:wishlist.sortBy'))).toBeInTheDocument();
        });

        test('renders the filter label', () => {
            render(<WishlistSortFilter {...defaultProps} />);
            expect(screen.getByText(t('account:wishlist.filterBy'))).toBeInTheDocument();
        });

        test('renders all four sort options', () => {
            render(<WishlistSortFilter {...defaultProps} />);
            expect(screen.getByRole('option', { name: t('account:wishlist.sort.recentlyAdded') })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: t('account:wishlist.sort.nameAZ') })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: t('account:wishlist.sort.priceLow') })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: t('account:wishlist.sort.priceHigh') })).toBeInTheDocument();
        });

        test('renders all four filter options', () => {
            render(<WishlistSortFilter {...defaultProps} />);
            expect(screen.getByRole('option', { name: t('account:wishlist.filter.all') })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: t('account:wishlist.filter.inStock') })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: t('account:wishlist.filter.outOfStock') })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: t('account:wishlist.filter.onSale') })).toBeInTheDocument();
        });

        test('reflects the current sort value as selected', () => {
            render(<WishlistSortFilter {...defaultProps} sortValue="price-low" />);
            const selects = screen.getAllByRole('combobox');
            // First combobox is the sort select
            expect(selects[0]).toHaveValue('price-low');
        });

        test('reflects the current filter value as selected', () => {
            render(<WishlistSortFilter {...defaultProps} filterValue="in-stock" />);
            const selects = screen.getAllByRole('combobox');
            // Second combobox is the filter select
            expect(selects[1]).toHaveValue('in-stock');
        });
    });

    describe('interactions', () => {
        test('calls onSortChange with the new sort value when sort selection changes', () => {
            const onSortChange = vi.fn();
            render(<WishlistSortFilter {...defaultProps} onSortChange={onSortChange} />);

            const selects = screen.getAllByRole('combobox');
            fireEvent.change(selects[0], { target: { value: 'name-asc' } });

            expect(onSortChange).toHaveBeenCalledWith('name-asc');
        });

        test('calls onSortChange with price-low when that option is selected', () => {
            const onSortChange = vi.fn();
            render(<WishlistSortFilter {...defaultProps} onSortChange={onSortChange} />);

            const selects = screen.getAllByRole('combobox');
            fireEvent.change(selects[0], { target: { value: 'price-low' } });

            expect(onSortChange).toHaveBeenCalledWith('price-low');
        });

        test('calls onSortChange with price-high when that option is selected', () => {
            const onSortChange = vi.fn();
            render(<WishlistSortFilter {...defaultProps} onSortChange={onSortChange} />);

            const selects = screen.getAllByRole('combobox');
            fireEvent.change(selects[0], { target: { value: 'price-high' } });

            expect(onSortChange).toHaveBeenCalledWith('price-high');
        });

        test('calls onFilterChange with the new filter value when filter selection changes', () => {
            const onFilterChange = vi.fn();
            render(<WishlistSortFilter {...defaultProps} onFilterChange={onFilterChange} />);

            const selects = screen.getAllByRole('combobox');
            fireEvent.change(selects[1], { target: { value: 'out-of-stock' } });

            expect(onFilterChange).toHaveBeenCalledWith('out-of-stock');
        });

        test('calls onFilterChange with on-sale when that option is selected', () => {
            const onFilterChange = vi.fn();
            render(<WishlistSortFilter {...defaultProps} onFilterChange={onFilterChange} />);

            const selects = screen.getAllByRole('combobox');
            fireEvent.change(selects[1], { target: { value: 'on-sale' } });

            expect(onFilterChange).toHaveBeenCalledWith('on-sale');
        });

        test('does not call onFilterChange when sort changes', () => {
            const onFilterChange = vi.fn();
            render(<WishlistSortFilter {...defaultProps} onFilterChange={onFilterChange} />);

            const selects = screen.getAllByRole('combobox');
            fireEvent.change(selects[0], { target: { value: 'name-asc' } });

            expect(onFilterChange).not.toHaveBeenCalled();
        });

        test('does not call onSortChange when filter changes', () => {
            const onSortChange = vi.fn();
            render(<WishlistSortFilter {...defaultProps} onSortChange={onSortChange} />);

            const selects = screen.getAllByRole('combobox');
            fireEvent.change(selects[1], { target: { value: 'in-stock' } });

            expect(onSortChange).not.toHaveBeenCalled();
        });
    });
});
