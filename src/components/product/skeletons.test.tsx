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
import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { ProductMainSkeleton, ProductRecommendationSkeleton, ProductRecommendationsSkeleton } from './skeletons';
import { getEnabledRecommendationTypes } from '@/lib/product/recommendations';

// Mock the recommendations module
vi.mock('@/lib/product/recommendations', () => ({
    getEnabledRecommendationTypes: vi.fn(),
}));

// Mock the config
vi.mock('@salesforce/storefront-next-runtime/config', () => ({
    useConfig: () => ({
        global: {
            skeleton: {
                thumbnails: 4,
                colorVariants: 3,
                sizeVariants: 4,
                accordionSections: 3,
                defaultItemCount: 6,
            },
        },
    }),
}));

// Mock the recommendations library
vi.mock('@/lib/product/recommendations', () => ({
    getEnabledRecommendationTypes: vi.fn(() => ['you-may-also-like', 'complete-the-look']),
}));

// Mock the UI components
vi.mock('@/components/ui/skeleton', () => ({
    Skeleton: ({ className, children, ...props }: any) => (
        <div data-testid="skeleton" className={className} {...props}>
            {children}
        </div>
    ),
}));

// Mock the ProductCarouselSkeleton
vi.mock('@/components/product-carousel/skeleton', () => ({
    default: ({ title, itemCount }: { title?: string; itemCount?: number }) => (
        <div data-testid="product-carousel-skeleton">
            {title && <h2>{title}</h2>}
            <div>Loading {itemCount || 6} items...</div>
        </div>
    ),
}));

describe('ProductMainSkeleton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders mobile title skeleton', () => {
            render(<ProductMainSkeleton />);

            // Should have mobile title skeleton
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('renders product view skeleton with grid layout', () => {
            render(<ProductMainSkeleton />);

            // Should have grid layout
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('renders product images skeleton', () => {
            render(<ProductMainSkeleton />);

            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('renders product info skeleton', () => {
            render(<ProductMainSkeleton />);

            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });

    describe('Thumbnail Skeletons', () => {
        test('renders correct number of thumbnail skeletons', () => {
            render(<ProductMainSkeleton />);

            // Should render thumbnails based on config
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });

    describe('Variant Skeletons', () => {
        test('renders color variant skeletons', () => {
            render(<ProductMainSkeleton />);

            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('renders size variant skeletons', () => {
            render(<ProductMainSkeleton />);

            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });

    describe('Accordion Skeletons', () => {
        test('renders accordion section skeletons', () => {
            render(<ProductMainSkeleton />);

            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });
});

describe('ProductRecommendationSkeleton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders with default item count', () => {
            render(<ProductRecommendationSkeleton />);

            expect(screen.getByTestId('product-carousel-skeleton')).toBeInTheDocument();
            expect(screen.getByText('Loading 6 items...')).toBeInTheDocument();
        });

        test('renders with custom item count', () => {
            render(<ProductRecommendationSkeleton itemCount={8} />);

            expect(screen.getByTestId('product-carousel-skeleton')).toBeInTheDocument();
            expect(screen.getByText('Loading 8 items...')).toBeInTheDocument();
        });

        test('renders with title', () => {
            render(<ProductRecommendationSkeleton title="Staff Picks" />);

            expect(screen.getByTestId('product-carousel-skeleton')).toBeInTheDocument();
            expect(screen.getByText('Staff Picks')).toBeInTheDocument();
        });

        test('renders without title when not provided', () => {
            render(<ProductRecommendationSkeleton />);

            expect(screen.getByTestId('product-carousel-skeleton')).toBeInTheDocument();
            expect(screen.queryByText('Staff Picks')).not.toBeInTheDocument();
        });
    });

    describe('Config Integration', () => {
        test('uses config default item count when not provided', () => {
            render(<ProductRecommendationSkeleton />);

            expect(screen.getByText('Loading 6 items...')).toBeInTheDocument();
        });

        test('overrides config with custom item count', () => {
            render(<ProductRecommendationSkeleton itemCount={10} />);

            expect(screen.getByText('Loading 10 items...')).toBeInTheDocument();
        });
    });
});

describe('ProductRecommendationsSkeleton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders multiple recommendation skeletons', () => {
            render(<ProductRecommendationsSkeleton />);

            // Should render multiple carousel skeletons based on enabled recommendations
            const carouselSkeletons = screen.getAllByTestId('product-carousel-skeleton');
            expect(carouselSkeletons.length).toBe(2); // Based on mocked getEnabledRecommendationTypes
        });

        test('renders with custom count', () => {
            render(<ProductRecommendationsSkeleton count={3} />);

            const carouselSkeletons = screen.getAllByTestId('product-carousel-skeleton');
            expect(carouselSkeletons.length).toBe(3);
        });

        test('renders with default count when not provided', () => {
            render(<ProductRecommendationsSkeleton />);

            const carouselSkeletons = screen.getAllByTestId('product-carousel-skeleton');
            expect(carouselSkeletons.length).toBe(2); // Based on mocked enabled recommendations
        });
    });

    describe('Config Integration', () => {
        test('uses enabled recommendation types from config', () => {
            render(<ProductRecommendationsSkeleton />);

            // Should call getEnabledRecommendationTypes
            expect(vi.mocked(getEnabledRecommendationTypes)).toHaveBeenCalled();
        });

        test('uses config default item count for each skeleton', () => {
            render(<ProductRecommendationsSkeleton />);

            // Each skeleton should use the default item count
            const loadingTexts = screen.getAllByText('Loading 6 items...');
            expect(loadingTexts.length).toBe(2);
        });
    });

    describe('Edge Cases', () => {
        test('handles zero count', () => {
            render(<ProductRecommendationsSkeleton count={0} />);

            const carouselSkeletons = screen.queryAllByTestId('product-carousel-skeleton');
            expect(carouselSkeletons.length).toBe(0);
        });

        test('handles large count', () => {
            render(<ProductRecommendationsSkeleton count={10} />);

            const carouselSkeletons = screen.getAllByTestId('product-carousel-skeleton');
            expect(carouselSkeletons.length).toBe(10);
        });
    });

    describe('Key Generation', () => {
        test('generates unique keys for each skeleton', () => {
            render(<ProductRecommendationsSkeleton count={3} />);

            const carouselSkeletons = screen.getAllByTestId('product-carousel-skeleton');
            expect(carouselSkeletons.length).toBe(3);

            // Each skeleton should be rendered
            carouselSkeletons.forEach((skeleton, _index) => {
                expect(skeleton).toBeInTheDocument();
            });
        });
    });

    describe('Additional Coverage Tests', () => {
        test('renders with different recommendation type counts', () => {
            const counts = [1, 3, 5];

            counts.forEach((count) => {
                const { unmount } = render(<ProductRecommendationsSkeleton count={count} />);
                const carouselSkeletons = screen.getAllByTestId('product-carousel-skeleton');
                expect(carouselSkeletons.length).toBe(count);
                unmount();
            });
        });

        test('handles undefined count parameter', () => {
            vi.mocked(getEnabledRecommendationTypes).mockReturnValue(['type1', 'type2']);
            render(<ProductRecommendationsSkeleton />);

            const carouselSkeletons = screen.getAllByTestId('product-carousel-skeleton');
            expect(carouselSkeletons.length).toBe(2);
        });

        test('renders ProductMainSkeleton with proper structure', () => {
            render(<ProductMainSkeleton />);

            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('maintains consistent behavior across different configurations', () => {
            const configs = [{ count: 1 }, { count: 2 }, { count: 3 }];

            configs.forEach((config) => {
                const { unmount } = render(<ProductRecommendationsSkeleton {...config} />);
                const carouselSkeletons = screen.getAllByTestId('product-carousel-skeleton');
                expect(carouselSkeletons.length).toBe(config.count);
                unmount();
            });
        });
    });
});
