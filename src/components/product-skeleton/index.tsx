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
import { Skeleton } from '@/components/ui/skeleton';

/**
 * ProductContentSkeleton component provides a loading state placeholder for the product content area.
 *
 * This skeleton component mimics the layout of the ProductContent component including:
 * - Two-column layout with image gallery and product info
 *
 * Used to improve perceived performance while product data is being fetched
 * from the commerce API, providing visual feedback to users during loading states.
 * @returns A skeleton layout matching the ProductContent structure
 */
export default function ProductContentSkeleton() {
    return (
        <div className="space-y-8" data-testid="product-skeleton">
            {/* Main Product Layout - matches ProductView grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-12">
                {/* Left Column - Image Gallery skeleton */}
                <div className="order-1">
                    <ImageGallerySkeleton />
                </div>

                {/* Right Column - Product Info skeleton */}
                <div className="order-2">
                    <ProductInfoSkeleton />
                </div>
            </div>
        </div>
    );
}

/**
 * ImageGallerySkeleton component provides a loading state for the product image gallery.
 *
 * Renders skeleton placeholders for:
 * - Main product image (square aspect ratio)
 * - Thumbnail navigation images
 * @returns A skeleton layout for the product image gallery
 */
function ImageGallerySkeleton() {
    return (
        <div className="space-y-4" data-testid="image-gallery-skeleton">
            {/* Main product image */}
            <Skeleton className="aspect-square w-full" data-testid="main-image-skeleton" />

            {/* Thumbnail images */}
            <div className="flex space-x-2 overflow-x-auto" data-testid="thumbnails-skeleton">
                <Skeleton className="h-16 w-16 flex-shrink-0" />
                <Skeleton className="h-16 w-16 flex-shrink-0" />
                <Skeleton className="h-16 w-16 flex-shrink-0" />
                <Skeleton className="h-16 w-16 flex-shrink-0" />
                <Skeleton className="h-16 w-16 flex-shrink-0" />
            </div>
        </div>
    );
}

/**
 * ProductInfoSkeleton component provides a loading state for the product information section.
 *
 * Renders skeleton placeholders for:
 * - Product title and description (desktop only)
 * - Price information
 * - Product variant options (size, color, etc.)
 * - Quantity selector
 * - Add to cart and wishlist buttons
 * - Product features list
 * @returns A skeleton layout for the product information panel
 */
function ProductInfoSkeleton() {
    return (
        <div className="grid gap-4" data-testid="product-info-skeleton">
            {/* Product Title */}
            <div data-testid="desktop-title-skeleton">
                <Skeleton className="h-9 w-3/4 mb-2" />
                <Skeleton className="h-5 w-full mb-1" />
                <Skeleton className="h-5 w-2/3" />
            </div>

            {/* Price */}
            <div data-testid="price-skeleton">
                <Skeleton className="h-7 w-24" />
            </div>

            {/* Inventory Status Message */}
            <div data-testid="inventory-skeleton">
                <Skeleton className="h-5 w-32" />
            </div>

            {/* Product options/variants (Swatch Groups) */}
            <div className="space-y-4" data-testid="variants-skeleton">
                <div>
                    <Skeleton className="h-5 w-20 mb-2" />
                    <div className="flex space-x-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                </div>

                <div>
                    <Skeleton className="h-5 w-16 mb-2" />
                    <div className="flex space-x-2">
                        <Skeleton className="h-10 w-14" />
                        <Skeleton className="h-10 w-14" />
                        <Skeleton className="h-10 w-14" />
                    </div>
                </div>
            </div>

            {/* Quantity selector */}
            <div data-testid="quantity-skeleton">
                <Skeleton className="h-5 w-20 mb-2" />
                <Skeleton className="h-10 w-24" />
            </div>

            {/* Delivery Options (BOPIS) */}
            <div className="mt-6" data-testid="delivery-options-skeleton">
                <Skeleton className="h-5 w-32 mb-3" />
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>

            {/* Product features */}
            <div className="space-y-2" data-testid="features-skeleton">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
            </div>

            {/* Cart Actions */}
            <div className="mt-6" data-testid="cart-actions-skeleton">
                {/* Add to cart button */}
                <div className="flex flex-col gap-3">
                    <Skeleton className="h-12 w-full" data-testid="add-to-cart-skeleton" />

                    {/* Wishlist + Share buttons (2-column grid) */}
                    <div className="grid grid-cols-2 gap-3">
                        <Skeleton className="h-12 w-full" data-testid="wishlist-skeleton" />
                        <Skeleton className="h-12 w-full" data-testid="share-skeleton" />
                    </div>
                </div>
            </div>
        </div>
    );
}
