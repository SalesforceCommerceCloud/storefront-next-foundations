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
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

const { t } = getTranslation();

// Testing libraries
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test } from 'vitest';
// Commerce SDK
import type { ShopperProducts } from '@/scapi';
// React Router
import { createMemoryRouter, RouterProvider } from 'react-router';
// Components
import ProductAccordion from './product-accordion';

// @sfdc-extension-block-start SFDC_EXT_RATINGS_REVIEWS
vi.mock('@/extensions/ratings-reviews/providers/product-reviews-context', () => ({
    useProductReviews: () => ({
        reviewsSummary: null,
        reviewsSummaryLoading: false,
        reviews: [],
        reviewsLoading: false,
        loadReviewsIfNeeded: () => {},
        aiSummary: '',
        addReviewOptimistic: () => {},
        removeReviewOptimistic: () => {},
        expandReviews: () => {},
        registerExpand: () => {},
    }),
}));
// @sfdc-extension-block-end SFDC_EXT_RATINGS_REVIEWS

const renderProductAccordion = (props: React.ComponentProps<typeof ProductAccordion>) => {
    // Using createMemoryRouter in framework mode is fine
    // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
    // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
    const router = createMemoryRouter(
        [
            {
                path: '/product/:productId',
                element: <ProductAccordion {...props} />,
            },
        ],
        { initialEntries: ['/product/test-product'] }
    );
    return render(<RouterProvider router={router} />);
};

describe('ProductAccordion', () => {
    const basicProduct: ShopperProducts.schemas['Product'] = {
        id: 'test-product',
        name: 'Test Product',
        shortDescription: 'Test short description',
    };

    const detailedProduct: ShopperProducts.schemas['Product'] = {
        id: 'detailed-product',
        name: 'Detailed Product',
        shortDescription: 'Short description',
        longDescription: 'This is a detailed long description of the product.',
        brand: 'Test Brand',
        manufacturerName: 'Test Manufacturer',
        manufacturerSku: 'TEST-SKU-123',
        type: { item: true },
    };

    describe('basic rendering', () => {
        test('should render accordion with all sections', () => {
            renderProductAccordion({ product: basicProduct });

            expect(screen.getByText(t('product:productDetails'))).toBeInTheDocument();
            expect(screen.getByText(t('product:sizeAndFit'))).toBeInTheDocument();
            expect(screen.getByText(t('product:shippingAndReturns'))).toBeInTheDocument();
        });

        test('should render all accordion triggers with correct text', () => {
            renderProductAccordion({ product: basicProduct });

            const triggers = screen.getAllByRole('button', { expanded: false });
            expect(triggers.length).toBeGreaterThanOrEqual(3); // Product Details, Size & Fit, Shipping & Returns

            expect(screen.getByText(t('product:productDetails'))).toBeInTheDocument();
            expect(screen.getByText(t('product:sizeAndFit'))).toBeInTheDocument();
            expect(screen.getByText(t('product:shippingAndReturns'))).toBeInTheDocument();
        });

        test('should render care instructions section for item type products', () => {
            renderProductAccordion({ product: detailedProduct });

            expect(screen.getByText(t('product:careInstructions'))).toBeInTheDocument();
        });

        test('should not render care instructions section for non-item products', () => {
            const nonItemProduct = { ...basicProduct, type: { set: true } };
            renderProductAccordion({ product: nonItemProduct });

            expect(screen.queryByText(t('product:careInstructions'))).not.toBeInTheDocument();
        });
    });

    describe('product details section', () => {
        test('should display long description when available', async () => {
            const user = userEvent.setup();
            renderProductAccordion({ product: detailedProduct });

            // Open the Product Details accordion
            await user.click(screen.getByText(t('product:productDetails')));

            expect(screen.getByText('This is a detailed long description of the product.')).toBeInTheDocument();
        });

        test('should fallback to short description when long description is not available', async () => {
            const user = userEvent.setup();
            renderProductAccordion({ product: basicProduct });

            // Open the Product Details accordion
            await user.click(screen.getByText(t('product:productDetails')));

            expect(screen.getByText('Test short description')).toBeInTheDocument();
        });

        test('should show default message when no description is available', async () => {
            const user = userEvent.setup();
            const productWithoutDescription = {
                ...basicProduct,
                shortDescription: undefined,
                longDescription: undefined,
            };
            renderProductAccordion({ product: productWithoutDescription });

            // Open the Product Details accordion
            await user.click(screen.getByText(t('product:productDetails')));

            expect(screen.getByText(t('product:noDetailedDescription'))).toBeInTheDocument();
        });

        test('should display brand information when available', async () => {
            const user = userEvent.setup();
            renderProductAccordion({ product: detailedProduct });

            // Open the Product Details accordion
            await user.click(screen.getByText(t('product:productDetails')));

            expect(screen.getByText(t('product:brand'))).toBeInTheDocument();
            expect(screen.getByText('Test Brand')).toBeInTheDocument();
        });

        test('should display manufacturer information when available', async () => {
            const user = userEvent.setup();
            renderProductAccordion({ product: detailedProduct });

            // Open the Product Details accordion
            await user.click(screen.getByText(t('product:productDetails')));

            expect(screen.getByText(t('product:manufacturer'))).toBeInTheDocument();
            expect(screen.getByText('Test Manufacturer')).toBeInTheDocument();
        });

        test('should display SKU information when available', async () => {
            const user = userEvent.setup();
            renderProductAccordion({ product: detailedProduct });

            // Open the Product Details accordion
            await user.click(screen.getByText(t('product:productDetails')));

            expect(screen.getByText(t('product:sku'))).toBeInTheDocument();
            expect(screen.getByText('TEST-SKU-123')).toBeInTheDocument();
        });

        test('should not display missing brand, manufacturer, or SKU', async () => {
            const user = userEvent.setup();
            renderProductAccordion({ product: basicProduct });

            // Open the Product Details accordion
            await user.click(screen.getByText(t('product:productDetails')));

            expect(screen.queryByText(t('product:brand'))).not.toBeInTheDocument();
            expect(screen.queryByText(t('product:manufacturer'))).not.toBeInTheDocument();
            expect(screen.queryByText(t('product:sku'))).not.toBeInTheDocument();
        });
    });

    describe('size and fit section', () => {
        test('should display coming soon message', async () => {
            const user = userEvent.setup();
            renderProductAccordion({ product: basicProduct });

            // Open the Size & Fit accordion
            await user.click(screen.getByText(t('product:sizeAndFit')));

            expect(screen.getByText(t('product:sizeAndFitComingSoon'))).toBeInTheDocument();
        });
    });

    describe('shipping and returns section', () => {
        test('should display all shipping and return policies', async () => {
            const user = userEvent.setup();
            renderProductAccordion({ product: basicProduct });

            // Open the Shipping & Returns accordion
            await user.click(screen.getByText(t('product:shippingAndReturns')));

            expect(screen.getByText(t('product:freeShipping'))).toBeInTheDocument();
            expect(screen.getByText(t('product:standardShipping'))).toBeInTheDocument();
            expect(screen.getByText(t('product:expressShipping'))).toBeInTheDocument();
            expect(screen.getByText(t('product:returns'))).toBeInTheDocument();
        });
    });

    describe('care instructions section', () => {
        test('should display coming soon message for item products', async () => {
            const user = userEvent.setup();
            renderProductAccordion({ product: detailedProduct });

            // Open the Care Instructions accordion
            await user.click(screen.getByText(t('product:careInstructions')));

            expect(screen.getByText(t('product:careInstructionsComingSoon'))).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        test('should handle product without type property', () => {
            const productWithoutType = { ...basicProduct, type: undefined };
            renderProductAccordion({ product: productWithoutType });

            expect(screen.queryByText(t('product:careInstructions'))).not.toBeInTheDocument();
        });

        test('should handle product with empty type object', () => {
            const productWithEmptyType = { ...basicProduct, type: {} };
            renderProductAccordion({ product: productWithEmptyType });

            expect(screen.queryByText(t('product:careInstructions'))).not.toBeInTheDocument();
        });

        test('should handle product with null values', async () => {
            const user = userEvent.setup();
            const productWithNulls = {
                ...basicProduct,
                brand: undefined,
                manufacturerName: undefined,
                manufacturerSku: undefined,
                longDescription: undefined,
            };
            renderProductAccordion({ product: productWithNulls });

            // Open the Product Details accordion
            await user.click(screen.getByText(t('product:productDetails')));

            expect(screen.queryByText(t('product:brand'))).not.toBeInTheDocument();
            expect(screen.queryByText(t('product:manufacturer'))).not.toBeInTheDocument();
            expect(screen.queryByText(t('product:sku'))).not.toBeInTheDocument();
        });

        test('should handle empty strings for product attributes', async () => {
            const user = userEvent.setup();
            const productWithEmptyStrings = {
                ...basicProduct,
                brand: '',
                manufacturerName: '',
                manufacturerSku: '',
                longDescription: '',
                shortDescription: '',
            };
            renderProductAccordion({ product: productWithEmptyStrings });

            // Open the Product Details accordion
            await user.click(screen.getByText(t('product:productDetails')));

            expect(screen.getByText(t('product:noDetailedDescription'))).toBeInTheDocument();
        });
    });
});
