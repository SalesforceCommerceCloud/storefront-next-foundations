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
/** @sfdc-extension-file SFDC_EXT_SHIPPING_DELIVERY */
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ShopperProducts } from '@/scapi';
import type { ProductPageData } from './_app.product.$productId';

vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>();
    return { ...actual, useRouteLoaderData: () => ({ nonce: undefined }) };
});
vi.mock('@/components/product-view', () => ({ default: () => <div data-testid="product-view" /> }));
vi.mock('@/components/product-view/child-products', () => ({ default: () => null }));
vi.mock('@/components/product-recommendations', () => ({ default: () => null }));
vi.mock('@/components/category-breadcrumbs', () => ({ default: () => null }));
vi.mock('@/components/category-breadcrumbs/skeleton', () => ({ CategoryBreadcrumbsSkeleton: () => null }));
vi.mock('@/components/region', () => ({ Region: () => null }));
vi.mock('@/components/json-ld', () => ({ JsonLd: () => null }));
vi.mock('@/components/seo-meta', () => ({ SeoMeta: () => null }));
vi.mock('@/providers/product-context', () => ({ ProductProvider: ({ children }: any) => children }));
vi.mock('@/providers/product-view', () => ({ default: ({ children }: any) => children }));
vi.mock('@/targets/ui-target', () => ({ UITarget: () => null }));
vi.mock('@/hooks/use-analytics', () => ({ useAnalytics: () => ({ trackViewProduct: vi.fn() }) }));
vi.mock('@/lib/product/product-utils', () => ({ isProductSet: () => false, isProductBundle: () => false }));
// @sfdc-extension-block-start SFDC_EXT_RATINGS_REVIEWS
vi.mock('@/extensions/ratings-reviews/providers/product-reviews-context', () => ({
    ProductReviewsProvider: ({ children }: any) => children,
}));
vi.mock('@/extensions/ratings-reviews/context/write-review-form-context', () => ({
    WriteReviewFormProvider: ({ children }: any) => children,
    useWriteReviewForm: () => null,
}));
// @sfdc-extension-block-end SFDC_EXT_RATINGS_REVIEWS
// @sfdc-extension-block-start SFDC_EXT_PRODUCT_CONTENT
vi.mock('@/extensions/product-content/context/product-content-data-context', () => ({
    ProductContentDataProvider: ({ children }: any) => children,
}));
// @sfdc-extension-block-end SFDC_EXT_PRODUCT_CONTENT
// @sfdc-extension-block-start SFDC_EXT_BNPL
vi.mock('@/extensions/bnpl/context/bnpl-context', () => ({ BnplProvider: ({ children }: any) => children }));
// @sfdc-extension-block-end SFDC_EXT_BNPL
// @sfdc-extension-block-start SFDC_EXT_BOPIS
vi.mock('@/extensions/bopis/context/pickup-context', () => ({ default: ({ children }: any) => children }));
// @sfdc-extension-block-end SFDC_EXT_BOPIS
// @sfdc-extension-block-start SFDC_EXT_SHIPPING_DELIVERY
vi.mock('@/extensions/shipping-delivery/context/shipping-delivery-context', () => ({
    ShippingDeliveryProvider: ({ children, productId }: any) => (
        <div data-testid="shipping-delivery-provider" data-product-id={productId}>
            {children}
        </div>
    ),
}));
// @sfdc-extension-block-end SFDC_EXT_SHIPPING_DELIVERY

describe('Foundations product detail route', () => {
    // @sfdc-extension-block-start SFDC_EXT_SHIPPING_DELIVERY
    test('passes the product ID to the delivery provider', async () => {
        const { default: ProductPage } = await import('./_app.product.$productId');
        const product = {
            id: 'foundations-product',
            name: 'Foundations Product',
        } as ShopperProducts.schemas['Product'];
        const loaderData: ProductPageData = {
            product,
            page: Promise.resolve({ id: 'pdp', typeId: 'page', aspectTypeId: 'pdp', regions: [] }),
            pageKey: product.id,
            pageUrl: '/product/foundations-product',
            productSchema: Promise.resolve(null),
            // @sfdc-extension-block-start SFDC_EXT_BNPL
            bnplMessage: Promise.resolve({ paymentCount: 4, amountPerPayment: 0 }),
            bnplLearnMore: Promise.resolve({
                paymentSchedule: { amountPerPayment: 0, totalAmount: 0, schedule: [] },
                howItWorks: [],
                disclosures: '',
            }),
            // @sfdc-extension-block-end SFDC_EXT_BNPL
            // @sfdc-extension-block-start SFDC_EXT_RATINGS_REVIEWS
            reviewsSummary: {
                totalCount: 0,
                averageRating: 0,
                distribution: { oneStar: 0, twoStars: 0, threeStars: 0, fourStars: 0, fiveStars: 0 },
                basedOnLabel: '',
            },
            reviewsList: Promise.resolve({
                heading: '',
                subtitle: '',
                writeReviewButtonLabel: '',
                summary: {
                    averageRating: 0,
                    totalCount: 0,
                    basedOnLabel: '',
                    distribution: { oneStar: 0, twoStars: 0, threeStars: 0, fourStars: 0, fiveStars: 0 },
                },
                searchPlaceholder: '',
                sortOptions: [],
                reviews: [],
            }),
            writeReviewForm: Promise.resolve({
                title: '',
                overallRating: { label: '', required: true, placeholder: '' },
                reviewTitle: { label: '', placeholder: '', maxCharacters: 0 },
                reviewBody: { label: '', placeholder: '', minCharacters: 0, maxCharacters: 0 },
                recommend: { label: '', yesLabel: '', noLabel: '' },
                addPhotos: { label: '', hint: '', accept: '', maxSize: '' },
                termsText: '',
                cancelLabel: '',
                submitLabel: '',
            }),
            // @sfdc-extension-block-end SFDC_EXT_RATINGS_REVIEWS
            // @sfdc-extension-block-start SFDC_EXT_PRODUCT_CONTENT
            returnsWarranty: Promise.resolve({
                title: '',
                description: '',
                returnsPolicy: { heading: '', intro: '', conditions: [], howToReturn: [] },
                warranty: { heading: '', intro: '', whatsCovered: [], whatsNotCovered: [], claimsProcess: '' },
                exchanges: { heading: '', intro: '', process: '' },
            }),
            pdpCollapsibles: Promise.resolve([]),
            // @sfdc-extension-block-end SFDC_EXT_PRODUCT_CONTENT
        };

        render(<ProductPage loaderData={loaderData} />);

        expect(screen.getByTestId('shipping-delivery-provider')).toHaveAttribute(
            'data-product-id',
            'foundations-product'
        );
    });
    // @sfdc-extension-block-end SFDC_EXT_SHIPPING_DELIVERY
});
