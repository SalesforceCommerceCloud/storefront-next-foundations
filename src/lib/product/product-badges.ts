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
import type { ShopperSearch } from '@/scapi';
import type { BadgeDetail } from '@/types/config';

interface GetProductBadgesProps {
    product: ShopperSearch.schemas['ProductSearchHit'];
    badgeDetails: BadgeDetail[];
    maxBadges?: number;
}

/**
 * Static utility function to determine which product badges should be displayed.
 *
 * NOTE: badgeDetails must be provided from runtime config (use useConfig() in components)
 *
 * @param props - Configuration for badge determination
 * @returns Object containing badges array and hasBadges boolean
 */
export const getProductBadges = ({ product, badgeDetails, maxBadges = 3 }: GetProductBadgesProps) => {
    if (!product) return { badges: [], hasBadges: false };

    const activeBadges: BadgeDetail[] = [];

    // Check representedProduct properties (where c_isSale is located)
    if (product.representedProduct) {
        badgeDetails.forEach((badge) => {
            const propertyValue = (product.representedProduct as Record<string, unknown>)[badge.propertyName];
            if (shouldShowBadge(propertyValue)) {
                activeBadges.push(badge);
            }
        });
    }

    // Check custom properties as fallback
    const customProperties = product.customProperties as Array<{ id?: string; value?: unknown }> | undefined;
    if (customProperties && Array.isArray(customProperties)) {
        badgeDetails.forEach((badge) => {
            // Skip if badge already found in representedProduct
            if (activeBadges.find((b) => b.propertyName === badge.propertyName)) {
                return;
            }

            const customProp = customProperties.find(
                (prop) => prop.id === badge.propertyName || prop.id?.toLowerCase() === badge.propertyName.toLowerCase()
            );

            if (customProp && shouldShowBadge(customProp.value)) {
                activeBadges.push(badge);
            }
        });
    }

    // Check promotions for sale badge (if not already found)
    const promotions = product.promotions as Array<unknown> | undefined;
    if (promotions && promotions.length > 0) {
        const saleBadge = badgeDetails.find((badge) => badge.propertyName === 'c_isSale');
        if (saleBadge && !activeBadges.find((badge) => badge.propertyName === 'c_isSale')) {
            activeBadges.push(saleBadge);
        }
    }

    // Check if product is out of stock
    if (product.inStock === false) {
        const outOfStockBadge = badgeDetails.find((badge) => badge.propertyName === 'c_isOutOfStock');
        if (outOfStockBadge && !activeBadges.find((badge) => badge.propertyName === 'c_isOutOfStock')) {
            activeBadges.push(outOfStockBadge);
        }
    }

    // Sort by priority (higher priority first)
    const badges = activeBadges.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, maxBadges);

    return {
        badges,
        hasBadges: badges.length > 0,
    };
};

// Helper function to check if a property should show a badge
const shouldShowBadge = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        return value === 'true' || value === '1' || value.toLowerCase() === 'yes';
    }
    if (typeof value === 'number') return value === 1;
    return false;
};
