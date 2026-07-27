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
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router';
import SearchSuggestionsPopup from './suggestions-grid';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { getSitePrefix, mockConfig, mockLocale, mockSiteObject } from '@/test-utils/config';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';

const mockSite = mockSiteObject;

// Mock DynamicImage component
vi.mock('@/components/dynamic-image', () => ({
    DynamicImage: ({ src, alt, imageProps, loading }: any) => (
        <img src={src} alt={alt} loading={loading} {...imageProps} />
    ),
}));

vi.mock('lucide-react', () => ({
    ImageOff: ({ className }: any) => <svg data-testid="image-off-icon" className={className} />,
}));

vi.mock('@/hooks/use-analytics', () => ({
    useAnalytics: () => ({
        trackClickSearchSuggestion: vi.fn(),
    }),
}));

const renderWithRouter = (ui: React.ReactElement) => {
    return render(
        <ConfigProvider config={mockConfig}>
            <SiteProvider
                site={mockSite}
                locale={mockLocale}
                language={mockSiteObject.defaultLocale}
                currency={mockSiteObject.defaultCurrency}>
                <BrowserRouter>{ui}</BrowserRouter>
            </SiteProvider>
        </ConfigProvider>
    );
};

describe('SearchSuggestionsPopup Component', () => {
    const mockSuggestions = [
        {
            name: 'iPhone 15 Pro',
            link: '/product/iphone-15-pro',
            image: 'https://example.com/iphone15.jpg',
            price: 1099,
        },
        {
            name: 'Samsung Galaxy S24',
            link: '/product/samsung-galaxy-s24',
            image: 'https://example.com/galaxy-s24.jpg',
            price: 899,
        },
        { name: 'Product Without Image', link: '/product/no-image', price: 299 },
        { name: 'Product Without Price', link: '/product/no-price', image: 'https://example.com/no-price.jpg' },
    ];

    it('should render nothing when suggestions are empty, null, or undefined', () => {
        const { container: emptyContainer } = renderWithRouter(<SearchSuggestionsPopup suggestions={[]} />);
        expect(emptyContainer.querySelector('[data-testid="sf-horizontal-product-suggestions"]')).toBeNull();

        const { container: nullContainer } = renderWithRouter(<SearchSuggestionsPopup suggestions={null as any} />);
        expect(nullContainer.querySelector('[data-testid="sf-horizontal-product-suggestions"]')).toBeNull();

        const { container: undefinedContainer } = renderWithRouter(<SearchSuggestionsPopup suggestions={undefined} />);
        expect(undefinedContainer.querySelector('[data-testid="sf-horizontal-product-suggestions"]')).toBeNull();
    });

    it('should render suggestions with correct structure and content', () => {
        renderWithRouter(<SearchSuggestionsPopup suggestions={mockSuggestions} />);

        expect(screen.getByTestId('sf-horizontal-product-suggestions')).toBeInTheDocument();
        expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
        expect(screen.getByText('Samsung Galaxy S24')).toBeInTheDocument();

        const productTiles = screen.getAllByTestId('product-tile');
        expect(productTiles).toHaveLength(4);
        expect(productTiles[0]).toHaveAttribute('href', `${getSitePrefix()}/product/iphone-15-pro`);
    });

    it('should render images when provided and fallback when missing', () => {
        const { container } = renderWithRouter(<SearchSuggestionsPopup suggestions={mockSuggestions} />);

        // Product suggestion images are informative and use suggestion name alt text.
        const images = container.querySelectorAll('img');
        expect(images).toHaveLength(3); // Only 3 products have images

        expect(images[0]).toHaveAttribute('src', 'https://example.com/iphone15.jpg[?sw={width}]');
        expect(images[0]).toHaveAttribute('alt', 'iPhone 15 Pro');
        expect(images[0]).toHaveAttribute('loading', 'eager');

        // Check fallback for missing image
        expect(screen.getByText('No image available')).toBeInTheDocument();
        expect(screen.getByTestId('image-off-icon')).toBeInTheDocument();
    });

    it('should render prices when provided and not render when missing or zero', () => {
        renderWithRouter(<SearchSuggestionsPopup suggestions={mockSuggestions} />);

        // formatCurrency uses Intl.NumberFormat which adds thousand separators
        expect(screen.getByText('£1,099.00')).toBeInTheDocument();
        expect(screen.getByText('£899.00')).toBeInTheDocument();
        expect(screen.getByText('£299.00')).toBeInTheDocument();

        // Product without price should not show price
        const productWithoutPrice = screen.getByText('Product Without Price');
        const parentDiv = productWithoutPrice.closest('.w-full');
        expect(parentDiv?.textContent).not.toMatch(/£\d+/);

        // Test zero price
        const { container } = renderWithRouter(
            <SearchSuggestionsPopup suggestions={[{ name: 'Free Product', link: '/product/free', price: 0 }]} />
        );
        expect(container.textContent).not.toMatch(/£0/);
    });

    it('should handle click with and without closeAndNavigate callback', () => {
        const mockCallback = vi.fn();
        const { rerender } = renderWithRouter(
            <SearchSuggestionsPopup suggestions={mockSuggestions} closeAndNavigate={mockCallback} />
        );

        fireEvent.mouseDown(screen.getByText('iPhone 15 Pro'));
        expect(mockCallback).toHaveBeenCalledWith('/product/iphone-15-pro');

        // Should not crash without callback
        rerender(
            <ConfigProvider config={mockConfig}>
                <SiteProvider
                    site={mockSite}
                    locale={mockLocale}
                    language={mockSiteObject.defaultLocale}
                    currency={mockSiteObject.defaultCurrency}>
                    <BrowserRouter>
                        <SearchSuggestionsPopup suggestions={mockSuggestions} closeAndNavigate={undefined} />
                    </BrowserRouter>
                </SiteProvider>
            </ConfigProvider>
        );
        expect(() => fireEvent.click(screen.getByText('Samsung Galaxy S24'))).not.toThrow();
    });

    it('should handle edge cases with empty strings and mixed data', () => {
        const edgeCaseSuggestions = [
            { name: '', link: '/product/empty-name', price: 0 },
            { name: 'Valid Product', link: '', image: '', price: null as any },
        ];

        renderWithRouter(<SearchSuggestionsPopup suggestions={edgeCaseSuggestions} />);

        expect(screen.getByTestId('sf-horizontal-product-suggestions')).toBeInTheDocument();
        expect(screen.getByText('Valid Product')).toBeInTheDocument();
        expect(screen.queryByText('£0')).not.toBeInTheDocument();
    });
});
