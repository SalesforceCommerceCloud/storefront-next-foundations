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
import { useCallback, useMemo } from 'react';
import type { ShopperSearch } from '@/scapi';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { BadgeDetail } from '@/types/config';

interface UseProductBadgesProps {
    product: ShopperSearch.schemas['ProductSearchHit'];
    badgeDetails?: BadgeDetail[];
    maxBadges?: number;
}

export const useProductBadges = ({ product, badgeDetails, maxBadges = 3 }: UseProductBadgesProps) => {
    const config = useConfig();
    const defaultBadgeDetails = badgeDetails || config.global.badges;
    // Helper function to check if a property should show a badge
    const shouldShowBadge = useCallback((value: unknown): boolean => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            return value === 'true' || value === '1' || value.toLowerCase() === 'yes';
        }
        if (typeof value === 'number') return value === 1;
        return false;
    }, []);

    const badges = useMemo(() => {
        if (!product) return [];

        const activeBadges: BadgeDetail[] = [];

        // Check representedProduct properties (where c_isSale is located)
        if (product.representedProduct) {
            defaultBadgeDetails.forEach((badge) => {
                const propertyValue = (product.representedProduct as Record<string, unknown>)[badge.propertyName];
                if (shouldShowBadge(propertyValue)) {
                    activeBadges.push(badge);
                }
            });
        }

        // Check custom properties as fallback
        if (product.customProperties && Array.isArray(product.customProperties)) {
            defaultBadgeDetails.forEach((badge) => {
                // Skip if badge already found in representedProduct
                if (activeBadges.find((b) => b.propertyName === badge.propertyName)) {
                    return;
                }

                const customProp = (product.customProperties as Array<{ id?: string; value?: unknown }>)?.find(
                    (prop: { id?: string; value?: unknown }) =>
                        prop.id === badge.propertyName || prop.id?.toLowerCase() === badge.propertyName.toLowerCase()
                );

                if (customProp && shouldShowBadge(customProp.value)) {
                    activeBadges.push(badge);
                }
            });
        }

        // Check promotions for sale badge (if not already found)
        if (product.promotions && (product.promotions as unknown as Array<unknown>).length > 0) {
            const saleBadge = defaultBadgeDetails.find((badge) => badge.propertyName === 'c_isSale');
            if (saleBadge && !activeBadges.find((badge) => badge.propertyName === 'c_isSale')) {
                activeBadges.push(saleBadge);
            }
        }

        // Check if product is out of stock
        if (product.inStock === false) {
            const outOfStockBadge = defaultBadgeDetails.find((badge) => badge.propertyName === 'c_isOutOfStock');
            if (outOfStockBadge && !activeBadges.find((badge) => badge.propertyName === 'c_isOutOfStock')) {
                activeBadges.push(outOfStockBadge);
            }
        }

        // Sort by priority (higher priority first)
        return activeBadges.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, maxBadges);
    }, [product, defaultBadgeDetails, maxBadges, shouldShowBadge]);

    return {
        badges,
        hasBadges: badges.length > 0,
    };
};
