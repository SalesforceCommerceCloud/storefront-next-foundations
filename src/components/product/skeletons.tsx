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
import ProductCarouselSkeleton from '@/components/product-carousel/skeleton';
import { getEnabledRecommendationTypes } from '@/lib/product/recommendations';
import { useConfig } from '@salesforce/storefront-next-runtime/config';

/**
 * Main product section skeleton component
 * Includes mobile title, ProductView, and accordion sections
 */
export function ProductMainSkeleton() {
    const config = useConfig();
    return (
        <>
            {/* Mobile Product Title - shown on mobile only */}
            <div className="block md:hidden space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
            </div>

            {/* Product View Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Product Images */}
                <div className="space-y-4">
                    <Skeleton className="aspect-square w-full" />
                    <div className="flex space-x-2">
                        {Array.from({ length: config.global.skeleton.thumbnails }, (_, index) => (
                            <Skeleton key={`thumb-${index}`} className="aspect-square w-16 h-16" />
                        ))}
                    </div>
                </div>

                {/* Product Info */}
                <div className="space-y-6">
                    {/* Desktop Title */}
                    <div className="hidden md:block space-y-4">
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-4 w-24" />
                    </div>

                    {/* Variant Selection */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-16" />
                            <div className="flex space-x-2">
                                {Array.from({ length: config.global.skeleton.colorVariants }, (_, index) => (
                                    <Skeleton key={`color-${index}`} className="w-8 h-8 rounded-full" />
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-12" />
                            <div className="flex space-x-2">
                                {Array.from({ length: config.global.skeleton.sizeVariants }, (_, index) => (
                                    <Skeleton key={`size-${index}`} className="w-12 h-10" />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Quantity and Add to Cart */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <Skeleton className="h-10 w-24" />
                            <Skeleton className="h-10 flex-1" />
                        </div>
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            </div>

            {/* Product Information Accordion */}
            <div className="mt-16 space-y-4">
                {Array.from({ length: config.global.skeleton.accordionSections }, (_, index) => (
                    <div key={`accordion-${index}`} className="rounded-ui border p-4">
                        <Skeleton className="h-6 w-48" />
                    </div>
                ))}
            </div>
        </>
    );
}

/**
 * Single recommendation carousel skeleton
 *
 * Use this when you need:
 * - Custom control over title and item count
 * - Testing or custom scenarios
 * - One-off recommendation displays
 * - Manual specification of skeleton appearance
 *
 * @example
 * // Custom recommendation with specific item count
 * <ProductRecommendationSkeleton title="Staff Picks" itemCount={4} />
 *
 * // Generic recommendation with default count
 * <ProductRecommendationSkeleton />
 */
export function ProductRecommendationSkeleton({
    title,
    itemCount,
    className,
}: {
    title?: string;
    itemCount?: number;
    className?: string;
}) {
    const config = useConfig();
    const defaultItemCount = itemCount ?? config.global.skeleton.defaultItemCount;
    return <ProductCarouselSkeleton title={title} itemCount={defaultItemCount} className={className} />;
}

/**
 * Multiple recommendation carousels skeleton
 *
 * Use this for standard product pages where you want:
 * - Automatic synchronization with recommendation configuration
 * - Correct item counts matching API limits (from storefront config)
 * - Proper titles from the configuration
 * - Zero maintenance when recommendation config changes
 *
 * This component reads the enabled recommendations from the config and creates
 * skeleton carousels that exactly match what the real data will look like.
 *
 * @param count - Optional override for number of recommendation skeletons.
 *                If not provided, uses the actual number of enabled recommendations.
 *
 * @example
 * // Standard usage - automatically matches enabled recommendations
 * <ProductRecommendationsSkeleton />
 *
 * // Override count (useful for testing or special cases)
 * <ProductRecommendationsSkeleton count={3} />
 */
export function ProductRecommendationsSkeleton({ count }: { count?: number }) {
    const config = useConfig();
    const actualCount = count ?? getEnabledRecommendationTypes(config).length;

    return (
        <>
            {Array.from({ length: actualCount }, (_, index) => {
                // Use default limit for skeleton items
                const itemCount = config.global.skeleton.defaultItemCount;

                return (
                    <ProductRecommendationSkeleton
                        key={`rec-skeleton-${index}`}
                        title={undefined} // Let the skeleton component handle the title
                        itemCount={itemCount}
                    />
                );
            })}
        </>
    );
}
