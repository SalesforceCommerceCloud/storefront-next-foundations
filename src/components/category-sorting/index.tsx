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
import { type ReactElement, useCallback, useId, useMemo } from 'react';
import { useLocation, useNavigation } from 'react-router';
import { useNavigate } from '@/hooks/use-navigate';

import type { ShopperSearch } from '@/scapi';

import { NativeSelect } from '@/components/ui/native-select';
import { PRODUCT_SEARCH_QUERY_PARAMS } from '@/lib/query-params';

/**
 * CategorySorting Component
 *
 * Renders a dropdown select control that allows users to sort product search results
 * by different criteria (e.g., brand, price, name, etc.). The component updates
 * the URL parameters when a new sorting option is selected, triggering a page navigation
 * to refresh the results with the new sort order.
 *
 * @param props - Component props
 * @param props.result - Product search result object from Salesforce Commerce Cloud
 * @param props.result.sortingOptions - Array of available sorting options with id and label
 * @param props.result.selectedSortingOption - Currently selected sorting option ID
 *
 * @returns A select dropdown for sorting options, or null if no sorting options are available
 *
 * @example
 * ```tsx
 * <CategorySorting result={productSearchResult} />
 * ```
 *
 * Features:
 * - Uses native select component with consistent UI styling
 * - Generates unique IDs to support multiple instances on the same page
 * - Automatically updates URL parameters (sort, offset) when selection changes
 * - Accessible with proper label-select association
 */
export default function CategorySorting({
    result,
}: {
    result: ShopperSearch.schemas['ProductSearchResult'];
}): ReactElement | null {
    const navigate = useNavigate();
    const location = useLocation();
    const navigation = useNavigation();
    const isPending = navigation.state !== 'idle';
    const selectId = useId();

    /**
     * Optimistic sorting option derived from the in-flight navigation target.
     *
     * While a navigation is pending, `navigation.location` holds the target location, allowing us to read the
     * intended sort param immediately. Once the navigation settles, we fall back to the server-provided value.
     */
    const effectiveSortingOption = navigation.location
        ? new URLSearchParams(navigation.location.search).get(PRODUCT_SEARCH_QUERY_PARAMS.SORT) ||
          result.selectedSortingOption
        : result.selectedSortingOption;

    const sortingOptions = useMemo(() => result?.sortingOptions || [], [result?.sortingOptions]);

    const navigatePage = useCallback(
        (sort: string) => {
            const params = new URLSearchParams(location.search);
            params.set(PRODUCT_SEARCH_QUERY_PARAMS.SORT, sort);
            params.set(PRODUCT_SEARCH_QUERY_PARAMS.OFFSET, '0');
            void navigate({
                ...location,
                search: `?${params.toString()}`,
            });
        },
        [location, navigate]
    );

    // Return null if no sorting options available
    if (sortingOptions.length === 0) {
        return null;
    }

    return (
        <div
            className={`flex items-center space-x-2${isPending ? ' pointer-events-none opacity-50 transition-opacity' : ''}`}>
            <label htmlFor={selectId} className="text-sm text-muted-foreground">
                Sort by:
            </label>
            <NativeSelect
                id={selectId}
                value={effectiveSortingOption || ''}
                onChange={(e) => void navigatePage(e.target.value)}>
                {sortingOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.label}
                    </option>
                ))}
            </NativeSelect>
        </div>
    );
}
