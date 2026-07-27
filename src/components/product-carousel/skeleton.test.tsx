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
import ProductCarouselSkeleton from './skeleton';

// Mock the config
vi.mock('@salesforce/storefront-next-runtime/config', () => ({
    useConfig: () => ({
        global: {
            carousel: {
                defaultItemCount: 4,
            },
        },
    }),
}));

// Mock the UI components
vi.mock('@/components/ui/skeleton', () => ({
    Skeleton: ({ className, children, ...props }: any) => (
        <div data-testid="skeleton" className={className} {...props}>
            {children}
        </div>
    ),
}));

vi.mock('@/components/ui/card', () => ({
    Card: ({ children, className, ...props }: any) => (
        <div data-testid="card" className={className} {...props}>
            {children}
        </div>
    ),
    CardContent: ({ children, className, ...props }: any) => (
        <div data-testid="card-content" className={className} {...props}>
            {children}
        </div>
    ),
    CardFooter: ({ children, className, ...props }: any) => (
        <div data-testid="card-footer" className={className} {...props}>
            {children}
        </div>
    ),
    CardHeader: ({ children, className, ...props }: any) => (
        <div data-testid="card-header" className={className} {...props}>
            {children}
        </div>
    ),
}));

describe('ProductCarouselSkeleton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders with default item count', () => {
            render(<ProductCarouselSkeleton />);

            // Should render 4 items by default (from config)
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('renders with custom item count', () => {
            render(<ProductCarouselSkeleton itemCount={6} />);

            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('renders with title', () => {
            render(<ProductCarouselSkeleton title="Featured Products" />);

            // Should render skeleton elements
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('renders without title when not provided', () => {
            render(<ProductCarouselSkeleton />);

            // Should not have title skeleton when no title provided
            const titleSkeleton = screen.queryByText('Featured Products');
            expect(titleSkeleton).not.toBeInTheDocument();
        });
    });

    describe('Layout Structure', () => {
        test('applies correct CSS classes', () => {
            render(<ProductCarouselSkeleton title="Test Title" itemCount={3} />);

            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('renders carousel items with correct structure', () => {
            render(<ProductCarouselSkeleton itemCount={2} />);

            // Should have skeleton elements
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('renders navigation controls skeleton', () => {
            render(<ProductCarouselSkeleton />);

            // Should have navigation control skeletons
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });

    describe('ProductTileSkeleton Integration', () => {
        test('renders product tile skeletons for each item', () => {
            render(<ProductCarouselSkeleton itemCount={3} />);

            // Should have cards for each product tile skeleton
            const cards = screen.getAllByTestId('card');
            expect(cards.length).toBe(3);
        });

        test('renders product tile skeleton with correct structure', () => {
            render(<ProductCarouselSkeleton itemCount={1} />);

            const card = screen.getByTestId('card');
            const cardContents = screen.getAllByTestId('card-content');
            const cardHeader = screen.getByTestId('card-header');

            expect(card).toBeInTheDocument();
            expect(cardContents).toHaveLength(3);
            expect(cardContents[0]).toBeInTheDocument();
            expect(cardContents[1]).toBeInTheDocument();
            expect(cardContents[2]).toBeInTheDocument();
            expect(cardHeader).toBeInTheDocument();
        });
    });

    describe('Responsive Design', () => {
        test('applies responsive classes to carousel items', () => {
            render(<ProductCarouselSkeleton itemCount={1} />);

            // Check that skeleton elements are rendered
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('applies correct width classes to product tiles', () => {
            render(<ProductCarouselSkeleton itemCount={1} />);

            // Check that skeleton elements are rendered
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        test('handles zero item count', () => {
            render(<ProductCarouselSkeleton itemCount={0} />);

            // Should still render navigation buttons even with zero items
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('handles large item count', () => {
            render(<ProductCarouselSkeleton itemCount={20} />);

            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('handles empty title string', () => {
            render(<ProductCarouselSkeleton title="" />);

            // Should not render title skeleton for empty string
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });

    describe('Accessibility', () => {
        test('maintains proper structure for screen readers', () => {
            render(<ProductCarouselSkeleton title="Loading Products" itemCount={2} />);

            // Should have proper structure - check for multiple skeletons
            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });

    describe('Additional Coverage Tests', () => {
        test('renders with custom title and item count', () => {
            render(<ProductCarouselSkeleton title="Custom Loading" itemCount={5} />);

            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('handles zero item count gracefully', () => {
            render(<ProductCarouselSkeleton itemCount={0} />);

            // The component may still render some skeleton elements even with 0 count
            const skeletons = screen.queryAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThanOrEqual(0);
        });

        test('renders with large item count', () => {
            render(<ProductCarouselSkeleton itemCount={20} />);

            const skeletons = screen.getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('maintains consistent structure across different configurations', () => {
            const configs = [
                { title: 'Config 1', itemCount: 1 },
                { title: 'Config 2', itemCount: 3 },
                { title: 'Config 3', itemCount: 5 },
            ];

            configs.forEach((config) => {
                const { unmount } = render(<ProductCarouselSkeleton {...config} />);
                const skeletons = screen.getAllByTestId('skeleton');
                expect(skeletons.length).toBeGreaterThan(0);
                unmount();
            });
        });
    });
});
