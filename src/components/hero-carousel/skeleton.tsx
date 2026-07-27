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
 * HeroCarouselSkeleton component provides a loading state placeholder for hero carousels.
 *
 * This skeleton component mimics the layout of a hero carousel including:
 * - Full-width hero image area
 * - Content overlay with title and subtitle skeletons
 * - CTA button skeleton
 * - Navigation dots skeleton
 * - Navigation controls skeleton
 *
 * Used to improve perceived performance while hero carousel data is being fetched,
 * providing visual feedback to users during loading states.
 *
 * @param props - The component props
 * @param props.slideCount - Number of slides to show in dots (default: 3)
 * @param props.showDots - Whether to show navigation dots skeleton (default: true)
 * @param props.showNavigation - Whether to show navigation controls skeleton (default: true)
 *
 * @returns JSX element representing the hero carousel skeleton layout
 *
 * @example
 * ```tsx
 * // Basic usage with default settings
 * <HeroCarouselSkeleton />
 *
 * // Usage with custom slide count
 * <HeroCarouselSkeleton slideCount={5} />
 *
 * // Usage without navigation elements
 * <HeroCarouselSkeleton showDots={false} showNavigation={false} />
 * ```
 *
 * @since 1.0.0
 */
export default function HeroCarouselSkeleton({
    slideCount = 3,
    showDots = true,
    showNavigation = true,
}: {
    slideCount?: number;
    showDots?: boolean;
    showNavigation?: boolean;
}) {
    return (
        <div className="relative w-full overflow-hidden animate-pulse h-[400px] md:h-[500px] lg:h-[600px]">
            {/* Hero image skeleton */}
            <div className="relative w-full h-full overflow-hidden">
                <Skeleton className="absolute inset-0 w-full h-full" />

                {/* Dark overlay for better contrast - matches actual component */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent z-[5]" />

                {/* Content overlay skeleton */}
                <div className="absolute inset-0 z-10 flex items-center">
                    <div className="section-container w-full">
                        <div className="max-w-xl flex flex-col">
                            {/* Title skeleton - matches h1 with mb-3 sm:mb-4 md:mb-6 */}
                            <Skeleton className="h-6 sm:h-8 md:h-9 lg:h-10 w-3/4 bg-white/20 mb-3 sm:mb-4 md:mb-6" />

                            {/* Subtitle skeleton - matches p with mb-4 sm:mb-6 md:mb-8 */}
                            <Skeleton className="h-4 sm:h-5 md:h-6 lg:h-7 w-full bg-white/15 mb-4 sm:mb-6 md:mb-8" />

                            {/* CTA button skeleton */}
                            <Skeleton className="h-10 sm:h-12 md:h-14 lg:h-16 w-32 sm:w-36 md:w-40 lg:w-44 bg-white/25" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation dots skeleton - horizontal bars */}
            {showDots && slideCount > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
                    {Array.from({ length: slideCount }, (_, index) => (
                        <Skeleton
                            key={`dot-skeleton-${index}`}
                            className={`h-2 bg-white/30 ${index === 0 ? 'w-8' : 'w-2'}`}
                        />
                    ))}
                </div>
            )}

            {/* Navigation controls skeleton - square buttons */}
            {showNavigation && slideCount > 1 && (
                <div className="absolute bottom-6 right-6 z-30 flex gap-2">
                    <Skeleton className="w-12 h-12 bg-white/20" />
                    <Skeleton className="w-12 h-12 bg-white/20" />
                </div>
            )}

            {/* Screen reader text skeleton */}
            <div className="sr-only">
                <Skeleton className="h-4 w-32 bg-transparent" />
            </div>
        </div>
    );
}
