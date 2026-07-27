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
import type { ComponentProps } from 'react';
import type { ShopperSearch } from '@/scapi';
import { cn } from '@/lib/utils';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { BadgeDetail } from '@/types/config';
import {
    productBadgesVariants,
    productBadgeSemanticVariants,
    type ProductBadgesVariantsProps,
} from './product-badge-variants';
import { Badge } from '@/components/ui/badge';
import { getProductBadges } from '@/lib/product/product-badges';

/**
 * Product Badge Component - Wrapper around core Badge with semantic styling
 *
 * This component reuses the core Badge component and applies semantic color styling
 * through custom className. It maintains the same API as the core Badge but adds
 * product-specific semantic variants (success, warning, info).
 *
 * @example
 * <ProductBadge variant="success">New</ProductBadge>
 * <ProductBadge variant="warning">Sale</ProductBadge>
 * <ProductBadge variant="info">Exclusive</ProductBadge>
 */
interface ProductBadgeProps extends Omit<ComponentProps<typeof Badge>, 'variant'> {
    variant?: 'success' | 'warning' | 'info' | 'default' | 'secondary' | 'destructive' | 'outline';
}

function ProductBadge({ variant = 'default', className, ...props }: ProductBadgeProps) {
    // Map semantic variants to their CSS classes
    const semanticClasses = {
        success: productBadgeSemanticVariants.success,
        warning: productBadgeSemanticVariants.warning,
        info: productBadgeSemanticVariants.info,
    };

    // Use semantic styling for product variants, fall back to core Badge for others
    const isSemanticVariant = variant === 'success' || variant === 'warning' || variant === 'info';
    const badgeVariant = isSemanticVariant ? 'default' : variant;
    const semanticClass = isSemanticVariant ? semanticClasses[variant] : '';

    return <Badge variant={badgeVariant} className={cn(semanticClass, className)} {...props} />;
}

/**
 * Product Badges Container Component
 *
 * Renders a collection of product badges based on product properties and configuration.
 * This component automatically determines which badges to show based on:
 * - Product properties (c_isNew, c_isSale, etc.)
 * - Custom properties
 * - Promotions
 * - Stock status
 *
 * Badge styling is determined by the color mapping in src/config/product-badges.ts,
 * which maps color names to semantic variants (success, warning, info, etc.).
 * Uses the ProductBadge wrapper component for semantic styling.
 *
 * @example
 * <ProductBadges product={product} maxBadges={3} />
 */
interface ProductBadgesProps extends ComponentProps<'div'>, ProductBadgesVariantsProps {
    product: ShopperSearch.schemas['ProductSearchHit'];
    badgeDetails?: BadgeDetail[];
    maxBadges?: number;
    'aria-label'?: string;
}

const ProductBadges = ({
    className,
    product,
    badgeDetails,
    maxBadges = 3,
    variant,
    size,
    'aria-label': ariaLabel,
    ...props
}: ProductBadgesProps) => {
    const config = useConfig();
    // Use runtime config if badgeDetails not provided
    const finalBadgeDetails = badgeDetails ?? config.global.badges;

    const { badges, hasBadges } = getProductBadges({
        product,
        badgeDetails: finalBadgeDetails,
        maxBadges,
    });

    if (!hasBadges) {
        return null;
    }

    // Simple color to variant mapping
    const getBadgeVariant = (color: string) => {
        switch (color) {
            case 'green':
                return 'success';
            case 'blue':
                return 'info';
            case 'yellow':
            case 'orange':
            case 'red':
            case 'purple':
            case 'pink':
                return 'warning';
            default:
                return 'info';
        }
    };

    const defaultAriaLabel = `Product badges: ${badges.map((b) => b.label).join(', ')}`;

    return (
        <div
            className={cn(productBadgesVariants({ variant, size }), className)}
            aria-label={ariaLabel || defaultAriaLabel}
            role="group"
            {...props}>
            {badges.map((badge) => (
                <ProductBadge
                    key={badge.propertyName}
                    variant={getBadgeVariant(badge.color)}
                    role="status"
                    aria-label={`${badge.label} product`}>
                    {badge.label}
                </ProductBadge>
            ))}
        </div>
    );
};

export { ProductBadges, ProductBadge };
