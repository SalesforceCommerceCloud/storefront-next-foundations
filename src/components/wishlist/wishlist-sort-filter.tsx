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
import { type ReactElement, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { NativeSelect } from '@/components/ui/native-select';

export type WishlistSortOption = 'recently-added' | 'name-asc' | 'price-low' | 'price-high';
export type WishlistFilterOption = 'all' | 'in-stock' | 'out-of-stock' | 'on-sale';

interface WishlistSortFilterProps {
    sortValue: WishlistSortOption;
    filterValue: WishlistFilterOption;
    onSortChange: (value: WishlistSortOption) => void;
    onFilterChange: (value: WishlistFilterOption) => void;
}

/**
 * WishlistSortFilter — Sort and filter controls for the wishlist page.
 *
 * All sorting and filtering is performed client-side since the API does not support it.
 * Renders two NativeSelect dropdowns: one for sort order, one for stock/sale filter.
 */
export function WishlistSortFilter({
    sortValue,
    filterValue,
    onSortChange,
    onFilterChange,
}: WishlistSortFilterProps): ReactElement {
    const { t } = useTranslation('account');
    const sortId = useId();
    const filterId = useId();

    return (
        <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
                <label htmlFor={sortId} className="text-sm text-muted-foreground whitespace-nowrap">
                    {t('wishlist.sortBy')}
                </label>
                <NativeSelect
                    id={sortId}
                    value={sortValue}
                    onChange={(e) => onSortChange(e.target.value as WishlistSortOption)}>
                    <option value="recently-added">{t('wishlist.sort.recentlyAdded')}</option>
                    <option value="name-asc">{t('wishlist.sort.nameAZ')}</option>
                    <option value="price-low">{t('wishlist.sort.priceLow')}</option>
                    <option value="price-high">{t('wishlist.sort.priceHigh')}</option>
                </NativeSelect>
            </div>

            <div className="flex items-center gap-2">
                <label htmlFor={filterId} className="text-sm text-muted-foreground whitespace-nowrap">
                    {t('wishlist.filterBy')}
                </label>
                <NativeSelect
                    id={filterId}
                    value={filterValue}
                    onChange={(e) => onFilterChange(e.target.value as WishlistFilterOption)}>
                    <option value="all">{t('wishlist.filter.all')}</option>
                    <option value="in-stock">{t('wishlist.filter.inStock')}</option>
                    <option value="out-of-stock">{t('wishlist.filter.outOfStock')}</option>
                    <option value="on-sale">{t('wishlist.filter.onSale')}</option>
                </NativeSelect>
            </div>
        </div>
    );
}

export default WishlistSortFilter;
