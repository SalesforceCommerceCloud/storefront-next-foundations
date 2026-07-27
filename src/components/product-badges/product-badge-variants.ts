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
import { cva, type VariantProps } from 'class-variance-authority';

// Product Badge Variants
//
// Structural variants (productBadgesVariants): Container layout and positioning
// Semantic variants (productBadgeSemanticVariants): Color schemes for product states
// Used by ProductBadge wrapper component and src/config/product-badges.ts
const productBadgesVariants = cva('absolute top-2 left-2 z-10 flex flex-row gap-1 pointer-events-none', {
    variants: {
        variant: {
            default: '',
            compact: 'gap-0.5',
            stacked: 'flex-col gap-0.5',
        },
        size: {
            sm: 'gap-0.5',
            md: 'gap-1',
            lg: 'gap-1.5',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'md',
    },
});

// Custom semantic variants for product badges
// These define the color schemes for different product states and are used
// by the ProductBadge wrapper component to apply semantic styling:
// - success: Green styling for "New" products
// - warning: Dark pill with light text for "Sale" and "Best Seller" products (per Figma);
//   uses scoped --product-badge-promo-* tokens defined in theme/tokens/components.css
// - info: Blue styling for "Exclusive" products
export const productBadgeSemanticVariants = {
    success: 'border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90',
    warning:
        'border-transparent bg-product-badge-promo-bg text-product-badge-promo-foreground [a&]:hover:bg-product-badge-promo-bg/90',
    info: 'border-transparent bg-info text-info-foreground [a&]:hover:bg-info/90',
} as const;

export { productBadgesVariants };
export type ProductBadgesVariantsProps = VariantProps<typeof productBadgesVariants>;
