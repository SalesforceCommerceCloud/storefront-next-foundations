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
 * Foundations home route test overlay.
 *
 * Route overlays replace (they do not merge), so the foundations home overlay
 * (`_app._index.tsx`) ships its own test — the canonical test asserts a 3-card
 * layout that the foundations Figma design does not have.
 *
 * The foundations home renders FOUR featured content cards across two grids:
 * the first grid mirrors the New Arrivals promo banner below it, so both grids
 * render the same Cubes + Pyramids cards. It intentionally omits the canonical
 * "Style for Real Life" text-only card (see the route overlay header). So this
 * overlay differs from the canonical test in these places:
 *
 *   1. `renders all content cards with correct count` asserts a length of 4.
 *   2. Because both grids are identical, each card title/description renders
 *      twice, so the card tests assert with `getAllByText` (length 2).
 *   3. `passes categories promise to PopularCategories component` asserts the
 *      PopularCategories mock's own heading ("Step into Elegance") rather than
 *      "Style for Real Life", which the canonical test only saw because it was
 *      the third card's title.
 *
 * Everything else mirrors the canonical test — the foundations loader and the
 * remaining static sections are structurally identical.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperExperience, ShopperProducts, ShopperSearch } from '@/scapi';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import HomePage, { type HomePageData, loader } from './_app._index';
import { createTestContext } from '@/lib/test-utils';
import { fetchPageWithComponentData } from '@/lib/page-designer/page-loader.server';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';

const { t } = getTranslation();

// Mock data
const mockSearchResult = {
    hits: [
        {
            productId: 'product-1',
            productName: 'Product 1',
            image: { alt: 'Product 1', link: '/product1.jpg' },
            price: 29.99,
            currency: 'USD',
            inventory: { ats: 10 },
            representedProduct: {
                id: 'product-1',
            },
        },
    ],
    total: 1,
    query: '',
    refinements: [],
    searchPhraseSuggestions: { suggestedTerms: [] },
    sortingOptions: [],
    start: 0,
    count: 1,
    offset: 0,
    limit: 10,
} as unknown as ShopperSearch.schemas['ProductSearchResult'];

const mockCategories: ShopperProducts.schemas['Category'][] = [
    {
        id: 'category-1',
        name: 'Category 1',
        parentCategoryId: 'root',
        image: '/category1.jpg',
    },
    {
        id: 'category-2',
        name: 'Category 2',
        parentCategoryId: 'root',
        image: '/category2.jpg',
    },
    {
        id: 'category-3',
        name: 'Category 3',
        parentCategoryId: 'root',
        image: '/category3.jpg',
    },
    {
        id: 'category-4',
        name: 'Category 4',
        parentCategoryId: 'root',
        image: '/category4.jpg',
    },
];

// Helper function to create mock Page objects
const createMockPage = (regions: any[] = []): ShopperExperience.schemas['Page'] =>
    ({
        id: 'mock-page',
        typeId: 'homepage',
        regions,
    }) as ShopperExperience.schemas['Page'];

// Mock the Region component to render the `errorElement` as fallback
vi.mock('@/components/region', () => ({
    Region: ({ errorElement }: any) => <>{errorElement}</>,
}));

// Mock the PopularCategories component
vi.mock('@/components/home/popular-categories', () => ({
    default: () => (
        <div data-testid="popular-categories">
            <h2>Step into Elegance</h2>
        </div>
    ),
}));

// Mock the ContentCard component
vi.mock('@/components/content-card', () => ({
    default: ({ title, description }: any) => (
        <div data-testid="content-card">
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    ),
}));

// Mock HeroCarousel component
vi.mock('@/components/hero-carousel', () => ({
    default: () => <div data-testid="hero-carousel">Hero Carousel</div>,
    HeroCarouselSkeleton: () => <div data-testid="hero-carousel-skeleton">Hero Carousel</div>,
}));

// Mock ProductCarousel components
vi.mock('@/components/product-carousel', () => ({
    ProductCarouselSkeleton: () => <div data-testid="product-carousel-skeleton">Product Carousel</div>,
}));

vi.mock('@/components/product-carousel/carousel', () => ({
    ProductCarouselWithData: ({ data, title }: any) => (
        <div data-testid="product-carousel">
            {title && <h2>{title}</h2>}
            {data?.hits?.length ?? 0} products
        </div>
    ),
}));

// Mock the Button component
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

// Mock the Skeleton component
vi.mock('@/components/ui/skeleton', () => ({
    Skeleton: ({ className, ...props }: any) => <div data-testid="skeleton" className={className} {...props} />,
}));

vi.mock('@/components/home/skeleton', () => ({
    default: () => <div data-testid="home-skeleton" />,
}));

// Mock react-i18next with partial mock to preserve other exports
vi.mock('react-i18next', async () => {
    const actual: any = await vi.importActual('react-i18next');
    return {
        ...actual,
        useTranslation: () => ({
            t: (key: string) => {
                // Simple translation mock that returns the translation key used in tests
                // Handle both with and without the 'home:' namespace prefix
                const normalizedKey = key.startsWith('home:') ? key.substring(5) : key;
                const translations: Record<string, string> = {
                    'hero.slide1.title': 'Geometric Elegance',
                    'hero.slide1.subtitle': 'Discover our curated selection of minimalist design pieces',
                    'hero.slide1.imageAlt': 'A minimalist geometric cube on a neutral studio backdrop',
                    'hero.slide1.ctaText': 'Explore now',
                    'featuredProducts.title': 'Featured Collection',
                    'categoryGrid.title': 'Style for Real Life',
                    'categoryGrid.shopNowButton': 'Shop Now',
                    // Both the featured-content grid and the New Arrivals promo banner
                    // render the same two-card grid (Cubes + Pyramids), so these keys
                    // back both grids.
                    'featuredContent.newArrivals.cubes.title': 'Cubes',
                    'featuredContent.newArrivals.cubes.description':
                        'Discover our curated collection of sculptural forms designed for the modern space.',
                    'featuredContent.newArrivals.cubes.imageAlt':
                        'A trio of minimalist geometric cubes on a neutral studio backdrop',
                    'featuredContent.newArrivals.cubes.ctaText': 'Shop new arrivals',
                    'featuredContent.newArrivals.cubes.ctaAriaLabel': 'Shop new arrivals: cubes',
                    'featuredContent.newArrivals.pyramids.title': 'Pyramids',
                    'featuredContent.newArrivals.pyramids.description':
                        'Bold geometry and clean lines — statement forms that anchor a contemporary space.',
                    'featuredContent.newArrivals.pyramids.imageAlt':
                        'A minimalist white pyramid on a neutral studio backdrop',
                    'featuredContent.newArrivals.pyramids.ctaText': 'Shop new arrivals',
                    'featuredContent.newArrivals.pyramids.ctaAriaLabel': 'Shop new arrivals: pyramids',
                };
                return translations[normalizedKey] || key;
            },
            i18n: {
                language: 'en-US',
                changeLanguage: vi.fn(),
            },
        }),
    };
});

// Mock decorators and utilities
vi.mock('@/lib/decorators/page-type', () => ({
    PageType: () => (target: any) => target,
}));

vi.mock('@/lib/decorators/region-definition', () => ({
    RegionDefinition: () => (target: any) => target,
    getRegionDefinition: vi.fn(() => ({ id: 'headerbanner' })),
}));

vi.mock('@/lib/page-designer/page-loader.server', () => ({
    fetchPageWithComponentData: vi.fn(),
}));

vi.mock('@/lib/api/search.server', () => ({
    fetchSearchProducts: vi.fn(() => Promise.resolve(mockSearchResult)),
}));

vi.mock('@/lib/api/categories.server', () => ({
    fetchCategories: vi.fn(() => Promise.resolve(mockCategories)),
}));

vi.mock('@salesforce/storefront-next-runtime/config', async (importOriginal) => {
    const actual = await importOriginal<object>();
    return {
        ...actual,
        getConfig: vi.fn(),
    };
});

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    })),
}));

vi.mock('@/middlewares/auth.server', () => ({
    getAuth: vi.fn(() => ({ customerId: null })),
}));

const renderComponent = (loaderDataOverrides?: Partial<HomePageData>) => {
    const defaultData: HomePageData = {
        page: Promise.resolve({
            ...createMockPage([]),
            componentData: {},
        }),
        searchResult: Promise.resolve(mockSearchResult),
        categories: Promise.resolve(mockCategories),

        pageUrl: 'http://localhost/',
        ogImageUrl: 'http://localhost/__ASSET_MOCK__',
    };
    const data = { ...defaultData, ...loaderDataOverrides };
    return render(<HomePage loaderData={data} />);
};

describe('HomePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Reset mock implementations for loader tests
        vi.mocked(fetchPageWithComponentData).mockResolvedValue({
            ...createMockPage([]),
            componentData: {},
        });
        vi.mocked(getConfig).mockReturnValue({ pages: { home: { featuredProductsCount: 8 } } } as AppConfig);
    });

    describe('Basic Rendering', () => {
        const renderingTests = [
            {
                description: 'renders featured content cards',
                assertion: () => {
                    // Both grids render the same cards, so each title appears twice.
                    expect(screen.getAllByText(t('home:featuredContent.newArrivals.cubes.title'))).toHaveLength(2);
                    expect(screen.getAllByText(t('home:featuredContent.newArrivals.pyramids.title'))).toHaveLength(2);
                },
            },
        ];

        test.each(renderingTests)('$description', ({ assertion }) => {
            renderComponent();
            assertion();
        });

        test('renders popular categories section', async () => {
            renderComponent();
            await waitFor(() => {
                expect(screen.getByTestId('popular-categories')).toBeInTheDocument();
            });
        });

        test('renders without header banner region when no regions available', () => {
            renderComponent();

            // Should not render region when no regions are available
            expect(screen.queryByTestId('region')).not.toBeInTheDocument();
            // But should still render other sections
            expect(screen.getAllByText(t('home:featuredContent.newArrivals.cubes.title'))).toHaveLength(2);
        });

        test('renders header banner region when headerbanner region is provided', async () => {
            const headerBannerRegion = {
                id: 'headerbanner',
                components: [
                    { id: 'hero-1', typeId: 'hero' },
                    { id: 'banner-1', typeId: 'banner' },
                ],
            };

            // Create a promise with the resolved value attached for the mock
            const pagePromise = Promise.resolve({
                ...createMockPage([headerBannerRegion]),
                componentData: {},
            });
            (pagePromise as any)._resolvedValue = {
                ...createMockPage([headerBannerRegion]),
                componentData: {},
            };

            renderComponent({
                page: pagePromise,
            });

            // Region mock always renders the error element, so check for that fallback content
            expect(screen.getByTestId('hero-carousel')).toBeInTheDocument();
            await waitFor(() => {
                expect(screen.getByTestId('product-carousel')).toBeInTheDocument();
            });
            // Should still render other sections
            expect(screen.getAllByText(t('home:featuredContent.newArrivals.cubes.title'))).toHaveLength(2);
        });
    });

    describe('Popular Categories Section', () => {
        test('renders popular categories component', async () => {
            renderComponent();
            await waitFor(() => {
                expect(screen.getByTestId('popular-categories')).toBeInTheDocument();
            });
        });

        test('passes categories promise to PopularCategories component', async () => {
            renderComponent();
            await waitFor(() => {
                expect(screen.getByTestId('popular-categories')).toBeInTheDocument();
                expect(screen.getByText('Step into Elegance')).toBeInTheDocument();
            });
        });
    });

    describe('Featured Content Cards Section', () => {
        // Assert against the copy the component renders (the react-i18next mock
        // above), not getTranslation()'s base bundle — the latter resolves to the
        // active brand's merged locales, which differ when a brand overlay is active.
        // Both grids (featured content + New Arrivals promo banner) render the same
        // Cubes + Pyramids cards, so each title/description appears exactly twice.
        const contentCardTests = [
            {
                description: 'renders cubes content card',
                title: 'Cubes',
                content: 'Discover our curated collection of sculptural forms designed for the modern space.',
            },
            {
                description: 'renders pyramids content card',
                title: 'Pyramids',
                content: 'Bold geometry and clean lines — statement forms that anchor a contemporary space.',
            },
        ];

        test.each(contentCardTests)('$description', ({ title, content }) => {
            renderComponent();
            expect(screen.getAllByText(title)).toHaveLength(2);
            expect(screen.getAllByText(content)).toHaveLength(2);
        });

        test('renders all content cards with correct count', () => {
            renderComponent();
            const contentCards = screen.getAllByTestId('content-card');
            // Two identical two-card grids: the featured-content grid and the New
            // Arrivals promo banner, each rendering Cubes + Pyramids. The "Style for
            // Real Life" category rail is a carousel, not a content card.
            expect(contentCards).toHaveLength(4);
        });
    });

    describe('Error Handling', () => {
        test('handles page promise rejection gracefully', () => {
            renderComponent();
            // Should still render other sections
            expect(screen.getAllByText(t('home:featuredContent.newArrivals.cubes.title'))).toHaveLength(2);
        });

        test('handles page promise rejection', () => {
            const rejectedPromise = Promise.reject(new Error('Page failed'));
            rejectedPromise.catch(() => {}); // Prevent unhandled promise rejection

            renderComponent({
                page: rejectedPromise,
            });

            // Should still render other sections
            expect(screen.getAllByText(t('home:featuredContent.newArrivals.cubes.title'))).toHaveLength(2);
        });
    });

    describe('Layout and Styling', () => {
        const layoutTests = [
            {
                description: 'applies correct main container styling',
                assertion: ({ container }: { container: HTMLElement }) => {
                    const mainContainer = container.firstChild as HTMLElement;
                    expect(mainContainer).toHaveClass('pb-16', '-mt-8');
                },
            },
            {
                description: 'applies correct spacing between sections',
                assertion: () => {
                    // First grid's Cubes card (both grids render one).
                    const [featuredContentTitle] = screen.getAllByText(
                        t('home:featuredContent.newArrivals.cubes.title')
                    );
                    const sectionWithPadding = featuredContentTitle.closest('[class*="pt-16"]');
                    expect(sectionWithPadding).toBeInTheDocument();
                },
            },
            {
                description: 'applies correct grid layout for content cards',
                assertion: () => {
                    const [cubesTitle] = screen.getAllByText(t('home:featuredContent.newArrivals.cubes.title'));
                    const contentCardsGrid = cubesTitle.closest('div')?.parentElement;
                    expect(contentCardsGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6');
                },
            },
        ];

        test.each(layoutTests)('$description', ({ assertion }) => {
            const { container } = renderComponent();
            assertion({ container });
        });
    });

    describe('Loaders', () => {
        let mockContext: ReturnType<typeof createTestContext>;
        let baseLoaderArgs: LoaderFunctionArgs;

        beforeEach(() => {
            mockContext = createTestContext();
            baseLoaderArgs = {
                request: new Request('http://localhost/'),
                url: new URL('http://localhost/'),
                params: {},
                context: mockContext,
                pattern: '/',
            };
        });

        describe('loader (server-side)', () => {
            test('returns home page data with fetchPageWithComponentData', () => {
                const mockPageWithData = {
                    ...createMockPage([]),
                    componentData: { test: Promise.resolve('data') },
                };
                const pagePromise = Promise.resolve(mockPageWithData);

                vi.mocked(fetchPageWithComponentData).mockReturnValue(pagePromise);

                const result = loader(baseLoaderArgs);

                // Assert - API calls
                expect(vi.mocked(fetchPageWithComponentData)).toHaveBeenCalledWith(baseLoaderArgs, {
                    pageId: 'homepage',
                });

                // Assert - Return value contains all expected promises
                expect(result.page).toBe(pagePromise);
                expect(result.page).toBeInstanceOf(Promise);
                expect(result.searchResult).toBeInstanceOf(Promise);
                expect(result.categories).toBeInstanceOf(Promise);
            });
        });

        describe('Error Handling', () => {
            test('loader handles API errors gracefully', () => {
                const error = new Error('API Error');
                vi.mocked(fetchPageWithComponentData).mockRejectedValue(error);

                expect(() => loader(baseLoaderArgs)).not.toThrow();

                const result = loader(baseLoaderArgs);
                expect(result).toHaveProperty('page');
            });
        });

        describe('Data Integration', () => {
            test('page promise is returned with componentData', () => {
                const mockPageWithData = {
                    ...createMockPage([]),
                    componentData: { some: Promise.resolve('data') },
                };
                const pagePromise = Promise.resolve(mockPageWithData);

                vi.mocked(fetchPageWithComponentData).mockReturnValue(pagePromise);

                const result = loader(baseLoaderArgs);

                expect(vi.mocked(fetchPageWithComponentData)).toHaveBeenCalledWith(baseLoaderArgs, {
                    pageId: 'homepage',
                });
                expect(result.page).toBe(pagePromise);
                expect(result.page).toBeInstanceOf(Promise);
                expect(result.searchResult).toBeInstanceOf(Promise);
                expect(result.categories).toBeInstanceOf(Promise);
            });
        });
    });

    describe('shouldRevalidate export', () => {
        // The policy itself is covered by src/lib/revalidation/routes/home.test.ts. Here we only
        // assert home wires up that exact function, so the behavior isn't re-tested at the route.
        test('re-exports the home page revalidation policy', async () => {
            const { shouldRevalidate } = await import('./_app._index');
            const { shouldRevalidate: shouldRevalidateHome } = await import('@/lib/revalidation/routes/home');
            expect(shouldRevalidate).toBe(shouldRevalidateHome);
        });
    });
});
