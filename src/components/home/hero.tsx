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
/**
 * Hero skeleton component that displays loading placeholders for hero carousel sections.
 * This component matches the dimensions and structure of the HeroCarousel component.
 *
 * @returns JSX element representing the hero carousel skeleton layout
 */
export default function HeroSkeleton() {
    return (
        <div className="relative w-full min-h-[300px] max-h-[70vh] overflow-hidden bg-muted animate-pulse">
            {/* Background image skeleton */}
            <div className="w-full h-full min-h-[300px] bg-muted" />

            {/* Dark overlay skeleton */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent z-[5]" />

            {/* Content skeleton */}
            <div className="absolute inset-0 z-10 flex items-center">
                <div className="container mx-auto section-container">
                    <div className="max-w-2xl">
                        {/* Title skeleton */}
                        <div className="h-8 sm:h-10 md:h-12 lg:h-16 bg-white/20 w-3/4 rounded-ui mb-3 sm:mb-4 md:mb-6" />

                        {/* Subtitle skeleton */}
                        <div className="h-4 sm:h-5 md:h-6 lg:h-8 bg-white/15 w-1/2 rounded-ui mb-4 sm:mb-6 md:mb-8" />

                        {/* CTA button skeleton */}
                        <div className="h-10 sm:h-12 md:h-14 lg:h-16 bg-white/25 w-32 sm:w-36 md:w-40 lg:w-44 rounded-ui" />
                    </div>
                </div>
            </div>

            {/* Navigation dots skeleton */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-white/50" />
                <div className="w-3 h-3 rounded-full bg-white/30" />
                <div className="w-3 h-3 rounded-full bg-white/30" />
            </div>

            {/* Navigation buttons skeleton */}
            <div className="absolute bottom-6 right-6 z-20 hidden md:flex items-center space-x-2">
                <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30" />
                <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30" />
            </div>
        </div>
    );
}
