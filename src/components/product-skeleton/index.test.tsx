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
import { describe, expect, test } from 'vitest';
import ProductContentSkeleton from './index';

describe('ProductContentSkeleton', () => {
    test('renders product skeleton component', () => {
        render(<ProductContentSkeleton />);

        expect(screen.getByTestId('product-skeleton')).toBeInTheDocument();
    });

    test('renders image gallery skeleton', () => {
        render(<ProductContentSkeleton />);

        expect(screen.getByTestId('image-gallery-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('main-image-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('thumbnails-skeleton')).toBeInTheDocument();
    });

    test('renders product info skeleton', () => {
        render(<ProductContentSkeleton />);

        expect(screen.getByTestId('product-info-skeleton')).toBeInTheDocument();
    });

    test('renders price skeleton', () => {
        render(<ProductContentSkeleton />);

        expect(screen.getByTestId('price-skeleton')).toBeInTheDocument();
    });

    test('renders variants skeleton', () => {
        render(<ProductContentSkeleton />);

        expect(screen.getByTestId('variants-skeleton')).toBeInTheDocument();
    });

    test('renders quantity skeleton', () => {
        render(<ProductContentSkeleton />);

        expect(screen.getByTestId('quantity-skeleton')).toBeInTheDocument();
    });

    test('renders desktop title skeleton', () => {
        render(<ProductContentSkeleton />);

        expect(screen.getByTestId('desktop-title-skeleton')).toBeInTheDocument();
    });

    test('renders product features skeleton', () => {
        render(<ProductContentSkeleton />);

        expect(screen.getByTestId('features-skeleton')).toBeInTheDocument();
    });

    test('renders inventory skeleton', () => {
        render(<ProductContentSkeleton />);

        expect(screen.getByTestId('inventory-skeleton')).toBeInTheDocument();
    });

    test('renders delivery options skeleton', () => {
        render(<ProductContentSkeleton />);

        expect(screen.getByTestId('delivery-options-skeleton')).toBeInTheDocument();
    });

    test('renders cart actions skeleton with add to cart and secondary buttons', () => {
        render(<ProductContentSkeleton />);

        expect(screen.getByTestId('cart-actions-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('add-to-cart-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('wishlist-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('share-skeleton')).toBeInTheDocument();
    });

    test('renders 5 thumbnail skeletons in image gallery', () => {
        render(<ProductContentSkeleton />);

        const thumbnailsContainer = screen.getByTestId('thumbnails-skeleton');
        const thumbnails = thumbnailsContainer.querySelectorAll('div');
        expect(thumbnails).toHaveLength(5);
    });
});
