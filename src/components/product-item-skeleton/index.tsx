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

// React
import type { ReactElement } from 'react';

// Components
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Props for the ProductItemSkeleton component
 */
interface ProductItemSkeletonProps {
    className?: string;
}

/**
 * Product item skeleton component that displays loading state for product items
 *
 * This component provides:
 * - Product image skeleton placeholder
 * - Product name and attributes skeleton
 * - Price skeleton with responsive layout
 * - Consistent styling with actual ProductItem component
 * - Optimized for overlay usage
 *
 * @param props - Component props
 * @returns JSX element with product item skeleton
 */
export function ProductItemSkeleton({ className }: ProductItemSkeletonProps): ReactElement {
    return (
        <div className={`${className || ''}`}>
            <div className="flex items-start">
                {/* Product Image Skeleton */}
                <Skeleton className="flex-shrink-0 w-16 sm:w-20 h-16 sm:h-20 mr-4 sm:mr-6 rounded-ui" />

                {/* Product Details Skeleton */}
                <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                        {/* Product Name Skeleton - matches Typography h3 variant */}
                        <Skeleton className="h-6 w-3/4" />

                        {/* Attributes Skeleton - matches the space-y-1 structure */}
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-1/3" />
                        </div>

                        {/* Mobile Price Skeleton */}
                        <div className="sm:hidden mt-2">
                            <Skeleton className="h-4 w-20" />
                        </div>

                        {/* Quantity Selector and Actions Skeleton */}
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-24" />
                            <Skeleton className="h-6 w-16" />
                        </div>
                    </div>
                </div>

                {/* Desktop Price Skeleton */}
                <div className="hidden sm:block ml-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                    </div>
                </div>
            </div>
        </div>
    );
}
