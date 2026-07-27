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
import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import type { ShopperSearch } from '@/scapi';
import PriceRangeInput from '@/components/price-range-input';
import DefaultRefinement from '../refine-default';
import type { RefinementProps } from '../types';

export default function RefinePrice({
    values,
    attributeId,
    isFilterSelected,
    toggleFilter,
    result,
}: RefinementProps & {
    result?: ShopperSearch.schemas['ProductSearchResult'];
}): ReactElement {
    const location = useLocation();
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');

    // Populate inputs from URL on mount/location change
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const refines = params.getAll('refine');

        // Find price refinement in URL
        const priceRefine = refines.find((refine) => refine.startsWith('price='));
        if (priceRefine) {
            // Extract price range from format: price=(min..max)
            const match = priceRefine.match(/price=\(([^.]*)\.\.([^)]*)\)/);
            if (match) {
                const urlMin = match[1] || '';
                const urlMax = match[2] || '';
                setMinPrice(urlMin);
                setMaxPrice(urlMax);
            }
        } else {
            // Clear inputs if no price filter in URL
            setMinPrice('');
            setMaxPrice('');
        }
    }, [location.search]);

    // Get price limits from products for validation
    const { minAllowed, maxAllowed } = useMemo(() => {
        if (!result?.hits?.length) return { minAllowed: undefined, maxAllowed: undefined };
        const prices = result.hits
            .map((product) => product.price)
            .filter((price): price is number => typeof price === 'number' && price > 0);
        if (prices.length === 0) return { minAllowed: undefined, maxAllowed: undefined };
        return {
            minAllowed: Math.min(...prices),
            maxAllowed: Math.max(...prices),
        };
    }, [result]);

    const handlePriceChange = (newMinPrice: string, newMaxPrice: string) => {
        setMinPrice(newMinPrice);
        setMaxPrice(newMaxPrice);
    };

    const handleApplyPriceFilter = () => {
        if (minPrice || maxPrice) {
            const minVal = minPrice || '0';
            const maxVal = maxPrice || '';
            const priceRangeString = `(${minVal}..${maxVal})`;
            toggleFilter(attributeId, priceRangeString);
        }
    };

    return (
        <div className="flex flex-col gap-4 mt-2">
            {/* Min/Max Price Inputs */}
            <PriceRangeInput
                minPrice={minPrice}
                maxPrice={maxPrice}
                onChange={handlePriceChange}
                onApply={handleApplyPriceFilter}
                minAllowed={minAllowed}
                maxAllowed={maxAllowed}
                showValidationErrors={true}
            />

            {/* Predefined Price Ranges */}
            {values.length > 0 && (
                <DefaultRefinement
                    values={values}
                    attributeId={attributeId}
                    isFilterSelected={isFilterSelected}
                    toggleFilter={toggleFilter}
                />
            )}
        </div>
    );
}
