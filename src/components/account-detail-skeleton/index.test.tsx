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
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { AccountDetailSkeleton } from './index';

describe('AccountDetailSkeleton', () => {
    describe('Component Rendering', () => {
        test('should render without errors', () => {
            const { container } = render(<AccountDetailSkeleton />);

            expect(container.firstChild).toBeInTheDocument();
        });

        test('should have correct container classes', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const mainContainer = container.querySelector('.space-y-5');
            expect(mainContainer).toBeInTheDocument();
        });

        test('should render page header skeleton', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const titleSkeleton = container.querySelector('.h-6.w-40');
            expect(titleSkeleton).toBeInTheDocument();
        });
    });

    describe('Page Header Card', () => {
        test('should render page header card', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const cards = container.querySelectorAll('[data-slot="card"]');
            // First card is the page header card
            expect(cards.length).toBeGreaterThanOrEqual(1);
        });

        test('should render page title and subtitle skeletons', () => {
            const { container } = render(<AccountDetailSkeleton />);

            // Page title skeleton
            expect(container.querySelector('.h-6.w-40')).toBeInTheDocument();
            // Page subtitle skeleton
            expect(container.querySelector('.h-4.w-64')).toBeInTheDocument();
        });
    });

    describe('Profile Card', () => {
        test('should render profile card', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const cards = container.querySelectorAll('[data-slot="card"]');
            // Should have header, profile, and password cards
            expect(cards.length).toBeGreaterThanOrEqual(2);
        });

        test('should have correct card styling', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const card = container.querySelector('.border-border');
            expect(card).toBeInTheDocument();
        });

        test('should render card content', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const cardContents = container.querySelectorAll('[data-slot="card-content"]');
            expect(cardContents.length).toBeGreaterThanOrEqual(1);
        });

        test('should render card header skeleton with separator', () => {
            const { container } = render(<AccountDetailSkeleton />);

            // Personal Information header (w-40)
            const headerSkeleton = container.querySelector('.h-6.w-40');
            expect(headerSkeleton).toBeInTheDocument();

            // Header separator
            const separator = container.querySelector('.border-b.border-border');
            expect(separator).toBeInTheDocument();
        });

        test('should render 4 profile field skeletons in 2-column grid', () => {
            const { container } = render(<AccountDetailSkeleton />);

            // Each profile field has 2 skeletons (label + value)
            const labelSkeletons = container.querySelectorAll('.h-4.w-20');
            const valueSkeletons = container.querySelectorAll('.h-4.w-28');

            expect(labelSkeletons.length).toBeGreaterThanOrEqual(4);
            expect(valueSkeletons.length).toBeGreaterThanOrEqual(4);
        });

        test('should have correct 2-column grid layout for profile fields', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const gridContainer = container.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2');
            expect(gridContainer).toBeInTheDocument();
        });
    });

    describe('Password Card', () => {
        test('should render password card', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const cards = container.querySelectorAll('[data-slot="card"]');
            // Should have header, profile, and password cards
            expect(cards.length).toBeGreaterThanOrEqual(3);
        });

        test('should render password card header skeleton', () => {
            const { container } = render(<AccountDetailSkeleton />);

            // Password & Security header (w-36)
            const passwordHeader = container.querySelectorAll('.h-5.w-36');
            expect(passwordHeader.length).toBeGreaterThanOrEqual(1);
        });

        test('should render password field with inline button skeleton', () => {
            const { container } = render(<AccountDetailSkeleton />);

            // Password label skeleton
            const passwordLabel = container.querySelector('.h-4.w-16');
            expect(passwordLabel).toBeInTheDocument();

            // Change Password button skeleton
            const buttonSkeleton = container.querySelector('.h-8.w-32');
            expect(buttonSkeleton).toBeInTheDocument();
        });

        test('should have flex layout for password field and button', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const flexContainer = container.querySelector('.flex.items-center.justify-between');
            expect(flexContainer).toBeInTheDocument();
        });
    });

    describe('Layout Structure', () => {
        test('should have correct spacing', () => {
            const { container } = render(<AccountDetailSkeleton />);

            expect(container.querySelector('.space-y-5')).toBeInTheDocument();
            expect(container.querySelector('.gap-6')).toBeInTheDocument();
        });

        test('should have correct padding', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const paddedElements = container.querySelectorAll('.p-6');
            expect(paddedElements.length).toBeGreaterThanOrEqual(2);
        });

        test('should render skeleton elements', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const skeletons = container.querySelectorAll('.animate-pulse');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('should have correct margin classes', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const mbElements = container.querySelectorAll('.mb-6');
            expect(mbElements.length).toBeGreaterThan(0);
        });
    });

    describe('Responsive Design', () => {
        test('should have responsive grid classes', () => {
            const { container } = render(<AccountDetailSkeleton />);

            expect(container.querySelector('.grid-cols-1.sm\\:grid-cols-2')).toBeInTheDocument();
        });

        test('should adapt to different screen sizes', () => {
            const { container } = render(<AccountDetailSkeleton />);

            // Check that responsive classes exist
            const responsiveGrid = container.querySelector('.sm\\:grid-cols-2');
            expect(responsiveGrid).toBeInTheDocument();
        });
    });

    describe('Card Structure', () => {
        test('should render three cards (header, profile, password)', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const cards = container.querySelectorAll('[data-slot="card"]');
            expect(cards.length).toBe(3);
        });

        test('should have cards with border styling', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const borderedCards = container.querySelectorAll('.border-border');
            expect(borderedCards.length).toBeGreaterThanOrEqual(3);
        });

        test('should have card content with padding', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const cardContents = container.querySelectorAll('[data-slot="card-content"]');
            // Should have 3 card contents (header + profile + password)
            expect(cardContents.length).toBe(3);
        });
    });

    describe('Header Separators', () => {
        test('should render separators after card headers', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const separators = container.querySelectorAll('.border-b.border-border');
            // Profile and Password cards should have separators
            expect(separators.length).toBe(2);
        });

        test('should have correct padding below headers', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const paddedHeaders = container.querySelectorAll('.pb-4');
            expect(paddedHeaders.length).toBe(2);
        });
    });

    describe('Consistent Rendering', () => {
        test('should render consistently across multiple renders', () => {
            const { container, rerender } = render(<AccountDetailSkeleton />);

            const initialSkeletons = container.querySelectorAll('.animate-pulse');

            rerender(<AccountDetailSkeleton />);

            const newSkeletons = container.querySelectorAll('.animate-pulse');
            expect(newSkeletons.length).toBe(initialSkeletons.length);
        });

        test('should not change card count on re-render', () => {
            const { container, rerender } = render(<AccountDetailSkeleton />);

            const initialCards = container.querySelectorAll('[data-slot="card"]');

            rerender(<AccountDetailSkeleton />);

            const newCards = container.querySelectorAll('[data-slot="card"]');
            expect(newCards.length).toBe(initialCards.length);
        });
    });

    describe('Skeleton Sizes', () => {
        test('should render various skeleton sizes', () => {
            const { container } = render(<AccountDetailSkeleton />);

            // Page title skeleton
            expect(container.querySelector('.h-6.w-40')).toBeInTheDocument();

            // Page subtitle skeleton
            expect(container.querySelector('.h-4.w-64')).toBeInTheDocument();

            // Card header skeletons
            expect(container.querySelector('.h-5.w-40')).toBeInTheDocument(); // Personal Information
            expect(container.querySelector('.h-5.w-36')).toBeInTheDocument(); // Password & Security

            // Card description skeletons
            expect(container.querySelector('.h-4.w-56')).toBeInTheDocument();

            // Field label skeletons
            expect(container.querySelector('.h-4.w-20')).toBeInTheDocument();
            expect(container.querySelector('.h-4.w-16')).toBeInTheDocument();

            // Field value skeletons
            expect(container.querySelector('.h-4.w-28')).toBeInTheDocument();

            // Button skeleton
            expect(container.querySelector('.h-8.w-32')).toBeInTheDocument();
        });
    });
});
