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
import { vi, test, describe, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { DecoratedVariationAttributeValue } from '@/lib/product/product-utils';
import { ProductTileSwatches } from './swatches';
import { ConfigWrapper, mockBuildConfig, mockLocale, mockSiteObject } from '@/test-utils/config';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';

const mockSite = {
    ...mockSiteObject,
    alias: mockBuildConfig.app.siteAliasMap?.[mockSiteObject.id] ?? undefined,
};

// toImageUrl returns the raw image link in tests; mock it to avoid config dependency inside swatches
vi.mock('@/lib/images/dynamic-image', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/images/dynamic-image')>();
    return {
        ...actual,
        toImageUrl: vi.fn(({ image }: { image: { link: string } }) => image.link),
    };
});

const colorValues: DecoratedVariationAttributeValue[] = [
    {
        value: 'navy',
        name: 'Navy',
        href: '/product/test?color=navy',
        swatch: { link: 'https://example.com/navy.jpg', disBaseLink: 'https://example.com/navy.jpg' },
    },
    {
        value: 'red',
        name: 'Red',
        href: '/product/test?color=red',
        swatch: { link: 'https://example.com/red.jpg', disBaseLink: 'https://example.com/red.jpg' },
    },
    {
        value: 'blue',
        name: 'Blue',
        href: '/product/test?color=blue',
    },
    {
        value: 'black',
        name: 'Black',
        href: '/product/test?color=black',
    },
];

interface RenderOptions {
    selectedAttributeValue?: string | null;
    onSwatchHover?: (value: string) => void;
    onSwatchClick?: () => void;
    productName?: string;
    totalColorCount?: number;
    maxSwatches?: number;
    colorValues?: DecoratedVariationAttributeValue[];
    productHref?: string;
}

const renderSwatches = ({
    selectedAttributeValue = null,
    onSwatchHover = vi.fn(),
    onSwatchClick = vi.fn(),
    productName = 'Test Product',
    totalColorCount = colorValues.length,
    maxSwatches = 2,
    colorValues: values = colorValues.slice(0, 2),
    productHref = '/product/test',
}: RenderOptions = {}) => {
    const router = createMemoryRouter(
        [
            {
                path: '/test',
                element: (
                    <ProductTileSwatches
                        colorValues={values}
                        selectedAttributeValue={selectedAttributeValue}
                        onSwatchHover={onSwatchHover}
                        onSwatchClick={onSwatchClick}
                        productName={productName}
                        totalColorCount={totalColorCount}
                        maxSwatches={maxSwatches}
                        productHref={productHref}
                    />
                ),
            },
            { path: '*', element: <div>navigated</div> },
        ],
        { initialEntries: ['/test'] }
    );
    return render(
        <ConfigWrapper>
            <SiteProvider
                site={mockSite}
                locale={mockLocale}
                language={mockSite.defaultLocale}
                currency={mockSite.defaultCurrency}>
                <RouterProvider router={router} />
            </SiteProvider>
        </ConfigWrapper>
    );
};

describe('ProductTileSwatches', () => {
    test('renders a container with an accessible label for available colors', () => {
        renderSwatches();
        // Locale-agnostic: en-GB uses "colours", en-US uses "colors"; both match /colou?rs/i.
        expect(screen.getByRole('group', { name: /available colou?rs/i })).toBeInTheDocument();
    });

    test('renders one swatch link per colorValue', () => {
        renderSwatches({ colorValues: colorValues.slice(0, 2), maxSwatches: 2, totalColorCount: 2 });
        expect(screen.getAllByRole('link')).toHaveLength(2);
    });

    test('renders accessible label per swatch combining product name and colour name', () => {
        renderSwatches();
        expect(screen.getByRole('link', { name: /view test product in navy/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /view test product in red/i })).toBeInTheDocument();
    });

    test('marks the selected swatch with aria-current="true" and leaves others without it', () => {
        renderSwatches({ selectedAttributeValue: 'red', totalColorCount: 2 });
        const navySwatch = screen.getByRole('link', { name: /view test product in navy/i });
        const redSwatch = screen.getByRole('link', { name: /view test product in red/i });
        expect(navySwatch).not.toHaveAttribute('aria-current');
        expect(redSwatch).toHaveAttribute('aria-current', 'true');
        expect(screen.getAllByRole('link')).toHaveLength(2);
    });

    test('shows overflow indicator when totalColorCount exceeds maxSwatches', () => {
        // 4 total colours, showing 2 → overflow = 2
        renderSwatches({
            colorValues: colorValues.slice(0, 2),
            maxSwatches: 2,
            totalColorCount: 4,
        });
        expect(screen.getByTitle('+2 more')).toBeInTheDocument();
    });

    test('does not show overflow indicator when all swatches fit', () => {
        renderSwatches({
            colorValues: colorValues.slice(0, 4),
            maxSwatches: 4,
            totalColorCount: 4,
        });
        expect(screen.queryByTitle(/^\+\d+/)).not.toBeInTheDocument();
    });

    test('calls onSwatchHover with the colour value when mouse enters a swatch', async () => {
        const onSwatchHover = vi.fn();
        const user = userEvent.setup();
        renderSwatches({ onSwatchHover });

        const navySwatch = screen.getByRole('link', { name: /view test product in navy/i });
        await user.hover(navySwatch);

        expect(onSwatchHover).toHaveBeenCalledWith('navy');
    });

    test('calls onSwatchClick when a swatch is clicked', async () => {
        const onSwatchClick = vi.fn();
        const user = userEvent.setup();
        renderSwatches({ onSwatchClick });

        const navySwatch = screen.getByRole('link', { name: /view test product in navy/i });
        await user.click(navySwatch);

        expect(onSwatchClick).toHaveBeenCalled();
    });

    test('renders swatch image when swatch data is provided', () => {
        renderSwatches();
        const navySwatch = screen.getByRole('link', { name: /view test product in navy/i });
        const img = navySwatch.querySelector('img');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/navy.jpg');
    });

    test('does not render swatch image when swatch is absent', () => {
        renderSwatches({
            colorValues: [{ value: 'blue', name: 'Blue', href: '/product/test?color=blue' }],
            totalColorCount: 1,
            maxSwatches: 1,
        });
        const blueSwatch = screen.getByRole('link', { name: /view test product in blue/i });
        expect(blueSwatch.querySelector('img')).not.toBeInTheDocument();
    });

    test('renders an empty component when colorValues is empty', () => {
        renderSwatches({ colorValues: [], totalColorCount: 0, maxSwatches: 5 });
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    test('caps overflow indicator display count at 99', () => {
        renderSwatches({
            colorValues: colorValues.slice(0, 2),
            maxSwatches: 2,
            totalColorCount: 200,
        });
        // overflowCount = 200 - 2 = 198, capped to 99
        expect(screen.getByTitle('+99 more')).toBeInTheDocument();
    });

    test('overflow indicator is a link pointing to productHref', () => {
        renderSwatches({
            colorValues: colorValues.slice(0, 2),
            maxSwatches: 2,
            totalColorCount: 4,
            productHref: '/product/my-product',
        });
        const overflowLink = screen.getByTitle('+2 more');
        expect(overflowLink.tagName).toBe('A');
        const siteAlias = mockSite.alias ?? mockSite.id;
        expect(overflowLink).toHaveAttribute('href', `/${siteAlias}/${mockSite.defaultLocale}/product/my-product`);
    });

    test('overflow indicator has an accessible label with product name and total count', () => {
        renderSwatches({
            colorValues: colorValues.slice(0, 2),
            maxSwatches: 2,
            totalColorCount: 5,
            productName: 'Blue Shirt',
        });
        // Locale-agnostic across en-US ("colors") and en-GB ("colours")
        expect(screen.getByRole('link', { name: /view all 5 colou?rs for blue shirt/i })).toBeInTheDocument();
    });

    test('overflow indicator fires onSwatchClick on click', async () => {
        const onSwatchClick = vi.fn();
        const user = userEvent.setup();
        renderSwatches({
            colorValues: colorValues.slice(0, 2),
            maxSwatches: 2,
            totalColorCount: 4,
            onSwatchClick,
        });
        const overflowLink = screen.getByTitle('+2 more');
        await user.click(overflowLink);
        expect(onSwatchClick).toHaveBeenCalledTimes(1);
    });
});
