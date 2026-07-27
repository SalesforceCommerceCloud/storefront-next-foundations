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
import { useEffect, useMemo } from 'react';
import { useNavigation, useSearchParams } from 'react-router';
import type { ShopperProducts } from '@/scapi';
import { useSelectedVariations } from '@/hooks/product/use-selected-variations';

interface UseCurrentVariantProps {
    product: ShopperProducts.schemas['Product'];
    isChildProduct?: boolean;
    /**
     * Optional override forwarded to {@link useSelectedVariations}. Modal contexts pass their
     * local selection state here to avoid reading from / writing to the page URL.
     */
    selectionsOverride?: Record<string, string>;
}

/**
 * Determines the current product variant based on selected variation attributes and URL parameters.
 * Automatically syncs the variant selection with URL query parameters for shareable product links.
 *
 * @example Basic usage in ProductView
 * ```tsx
 * function ProductView({ product }) {
 *   const currentVariant = useCurrentVariant({ product });
 *
 *   return (
 *     <div>
 *       {currentVariant && (
 *         <p>Selected: {currentVariant.productId}</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @param props - Configuration object
 * @param props.product - Product with variants array
 * @param props.isChildProduct - If true, prevents URL updates (useful for product sets/bundles)
 * @returns The matching variant object or undefined if no exact match is found
 */
export function useCurrentVariant({ product, isChildProduct = false, selectionsOverride }: UseCurrentVariantProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigation = useNavigation();

    // Use useSelectedVariations to get URL-aware selected attributes (or override-driven in modal usage)
    const selectedAttributes = useSelectedVariations({ product, isChildProduct, selectionsOverride });

    const variants = useMemo(() => product?.variants ?? [], [product]);

    // Find current variant based on selected attributes or URL param
    const currentVariant = useMemo(() => {
        const potentialVariants = variants.filter(
            ({ variationValues }) =>
                variationValues &&
                Object.keys(selectedAttributes).every((key) => {
                    return variationValues[key] === selectedAttributes[key];
                })
        );
        // If there's only 1 match, then we have narrowed down the true variant (meaning all of the variation attributes have been selected)
        return potentialVariants.length === 1 ? potentialVariants[0] : undefined;
    }, [selectedAttributes, variants]);

    // Update URL when variant changes. Skip when an override is supplied (modal usage) so swatch
    // changes there don't pollute the page URL or trigger route revalidation.
    //
    // The navigation.state === 'idle' guard avoids a race during the swatch click: while the
    // NavLink's nav to ?color=<new> is in flight, useSelectedVariations has already flipped
    // optimistically, so currentVariant points at the new variant — but searchParams is still
    // the canonical (old) URL. Building a new URL from that snapshot and calling setSearchParams
    // would supersede the in-flight nav with one that strips the user's color choice. Defer the
    // pid sync until the navigation has settled and searchParams reflects the new URL.
    useEffect(() => {
        if (
            navigation.state === 'idle' &&
            product?.id &&
            currentVariant &&
            currentVariant.productId !== product.id &&
            !isChildProduct &&
            !selectionsOverride
        ) {
            const currentPid = searchParams.get('pid');
            // Only set pid if it's not already set to the correct value
            if (currentPid !== currentVariant.productId) {
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.set('pid', currentVariant.productId);
                setSearchParams(newSearchParams, { replace: true, preventScrollReset: true });
            }
        }
    }, [currentVariant, product, searchParams, setSearchParams, isChildProduct, selectionsOverride, navigation.state]);

    return currentVariant;
}
