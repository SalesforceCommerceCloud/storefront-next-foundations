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
 * Foundations home route overlay.
 *
 * A full replacement of the canonical `src/routes/_app._index.tsx` (route overlays
 * replace, they do not merge — see docs/internal/multi-vertical/README-VITE-RESOLVER.md).
 *
 * Foundations follows the Figma "Storefront Home" design (node 10002:82198), which
 * structures the page as fixed static sections with empty Page Designer slots
 * (`🧩 Custom Region 1–7`) interspersed between them. So this overlay differs from
 * the canonical layout in two structural ways:
 *
 *   1. The marketing sections (hero, featured collection, content cards, category
 *      rail) are ALWAYS rendered as static content — not as the `errorElement`
 *      fallback of an empty region. Adding a Page Designer component therefore
 *      renders IN ADDITION to the static content (in the adjacent slot), rather
 *      than replacing the whole section as the canonical/fallback pattern does.
 *   2. Empty `<Region>` slots are placed between each section. With no components
 *      and no `errorElement`, an empty slot renders nothing until a merchant drops
 *      a component into it via Page Designer.
 *
 * Copy/typography also match Figma: "Featured Collection" (via the foundations
 * locale override `home.featuredProducts.title`) and the H2 section-heading scale
 * (text-4xl / font-medium / leading-none). The Newsletter band is rendered by the
 * footer (`main-footer.tsx`, gated by `isHomepage`), not here.
 *
 * Fashion and cosmetic keep the canonical layout untouched.
 */
import { Suspense } from 'react';
import { Await, redirect, useAsyncError } from 'react-router';
import type { Route } from './+types/_app._index';
import type { ShopperProducts, ShopperSearch } from '@/scapi';
import { fetchCarouselProducts } from '@/components/product-carousel/loaders';
import { fetchCategories } from '@/lib/api/categories.server';
import { siteContext, resolvePrefix, type SiteContext } from '@salesforce/storefront-next-runtime/site-context';
import { Region } from '@/components/region';
import PopularCategories from '@/components/home/popular-categories';
import ContentCard from '@/components/content-card';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import { PageType } from '@/lib/decorators/page-type';
import { RegionDefinition } from '@/lib/decorators/region-definition';

import { fetchPageWithComponentData } from '@/lib/page-designer/page-loader.server';
import { getLogger } from '@/lib/logger.server';

import hero01 from '/images/hero-01.webp';
import hero03 from '/images/hero-03.webp';
import hero04 from '/images/hero-04.webp';
// Foundations hero visual from the Figma "Storefront Home" design (node 10002:82198):
// a single centered "Geometric Elegance" cube. Overlaid via the foundations public dir.
import heroGeometric from '/images/hero-geometric.webp';
import HeroCarousel, { type HeroSlide } from '@/components/hero-carousel';
import { ProductCarouselSkeleton } from '@/components/product-carousel';
import { ProductCarouselWithData } from '@/components/product-carousel/carousel';
import { SeoMeta } from '@/components/seo-meta';
import { buildCanonicalUrl } from '@/utils/canonical-url';
import { useTranslation } from 'react-i18next';
import type { NormalizedApiError } from '@/lib/api/normalized-api-error';

export { shouldRevalidate } from '@/lib/revalidation/routes/home';

/** Figma home section-heading scale (H2): text-4xl / font-medium / leading-none, standard Tailwind tokens. */
const featuredHeadingClassName = 'text-4xl font-medium leading-none tracking-tight text-foreground';

@PageType({
    name: 'Home Page',
    description: 'Main landing page with static marketing sections and interspersed Page Designer slots',
    supportedAspectTypes: [],
})
@RegionDefinition([
    {
        id: 'top',
        name: 'Top Slot',
        description: 'Empty slot above the hero carousel',
        maxComponents: 3,
    },
    {
        id: 'afterHero',
        name: 'After Hero Slot',
        description: 'Empty slot between the hero carousel and the featured collection',
        maxComponents: 3,
    },
    {
        id: 'afterFeatured',
        name: 'After Featured Slot',
        description: 'Empty slot between the featured collection and the content cards',
        maxComponents: 3,
    },
    {
        id: 'afterContent',
        name: 'After Content Slot',
        description: 'Empty slot between the content cards and the category section',
        maxComponents: 3,
    },
    {
        id: 'bottom',
        name: 'Bottom Slot',
        description: 'Empty slot below the category section',
        maxComponents: 3,
    },
])
export class HomePageMetadata {}

function FeaturedProductsError() {
    const error = useAsyncError() as NormalizedApiError;
    const { t } = useTranslation('home');
    return (
        <div role="alert" className="py-8 text-center text-muted-foreground">
            <p>{t('featuredProducts.loadFailed')}</p>
            {import.meta.env.DEV && (
                <div className="mt-2 text-xs font-mono text-muted-foreground/70">
                    {error.status && <span>{error.status}</span>}
                    {error.message && <p>{error.message}</p>}
                </div>
            )}
        </div>
    );
}

export type HomePageData = {
    page: ReturnType<typeof fetchPageWithComponentData>;
    searchResult: Promise<ShopperSearch.schemas['ProductSearchResult']>;
    categories: Promise<ShopperProducts.schemas['Category'][]>;
    pageUrl: string;
    ogImageUrl: string;
};

/**
 * Server-side loader function that fetches home page data.
 * This function runs on the server during SSR and prepares data for the home page.
 * @returns Promise that resolves to an object containing search result promise
 */
export function loader(args: Route.LoaderArgs): HomePageData {
    const logger = getLogger(args.context);
    logger.debug('HomePage: loader starting');

    const config = getConfig(args.context);
    const requestUrl = new URL(args.request.url);

    // Redirect bare "/" to the default site/locale prefixed homepage
    if (requestUrl.pathname === '/' && config.url?.prefix && config.url.prefix !== '/') {
        const siteRef = config.siteAliasMap?.[config.defaultSiteId] ?? config.defaultSiteId;
        const defaultSite = config.commerce.sites.find((s) => s.id === config.defaultSiteId);
        const defaultLocale = defaultSite?.defaultLocale ?? config.i18n.fallbackLng;
        const localeRef = config.localeAliasMap?.[defaultLocale] ?? defaultLocale;
        const prefixedPath = resolvePrefix({
            prefix: config.url.prefix,
            params: { siteId: siteRef, localeId: localeRef },
        });
        throw redirect(`${prefixedPath}/`);
    }

    const currency = (args.context.get(siteContext) as SiteContext).currency;
    const pageUrl = buildCanonicalUrl(requestUrl.origin, requestUrl.pathname, requestUrl.search);

    return {
        page: fetchPageWithComponentData(args, {
            pageId: 'homepage',
        }),
        searchResult: fetchCarouselProducts(args.context, {
            categoryId: 'root',
            limit: config.pages.home.featuredProductsCount,
            currency: currency ?? undefined,
        }),
        categories: fetchCategories(args.context, 'root', 1),
        pageUrl,
        ogImageUrl: new URL(hero01, requestUrl.origin).href,
    };
}

/**
 * Home page component.
 *
 * Renders fixed static marketing sections with empty Page Designer slots
 * interspersed between them (see the file header for the Figma rationale).
 * @returns JSX element representing the home page layout
 */
export default function HomePage({ loaderData }: { loaderData: HomePageData }) {
    const { t } = useTranslation('home');

    // Figma designs a single "Geometric Elegance" hero slide (node 10002:82198); the 5 dots there
    // are placeholder carousel chrome, not additional designed slides. So foundations renders one
    // slide — the HeroCarousel already hides dots/nav when slideCount === 1.
    const heroSlides: HeroSlide[] = [
        {
            id: 'slide-1',
            title: t('hero.slide1.title'),
            subtitle: t('hero.slide1.subtitle'),
            imageUrl: heroGeometric,
            imageAlt: t('hero.slide1.imageAlt'),
            ctaText: t('hero.slide1.ctaText'),
            ctaLink: '/category/root',
            overlayPosition: 'Middle Center',
            overlayAlignment: 'center',
        },
    ];

    return (
        <div className="pb-16 -mt-8">
            <SeoMeta
                rawTitle
                title={t('meta.title', { defaultValue: 'NextGen PWA Kit Store' })}
                description={t('meta.description', {
                    defaultValue: 'Welcome to our web store for high performers!',
                })}
                openGraph={{
                    type: 'website',
                    url: loaderData.pageUrl,
                    image: loaderData.ogImageUrl,
                }}
            />

            {/* Empty PD slot above the hero (Figma: Custom Region 1). */}
            <Region page={loaderData.page} regionId="top" />

            {/* Hero carousel — static */}
            <HeroCarousel
                slides={heroSlides}
                autoPlay={true}
                autoPlayInterval={6000}
                showNavigation={true}
                showDots={true}
            />

            {/* Empty PD slot between hero and featured collection (Figma: Custom Region 2). */}
            <Region page={loaderData.page} regionId="afterHero" />

            {/* Featured Collection — static (Suspense while product data resolves) */}
            <Suspense fallback={<ProductCarouselSkeleton title={t('featuredProducts.title')} />}>
                <Await resolve={loaderData.searchResult} errorElement={<FeaturedProductsError />}>
                    {(searchResult) => (
                        <ProductCarouselWithData
                            data={searchResult}
                            title={t('featuredProducts.title')}
                            titleClassName={featuredHeadingClassName}
                            shopAllUrl="/category/root"
                            shopAllText={t('featuredProducts.shopAll')}
                        />
                    )}
                </Await>
            </Suspense>

            {/* Empty PD slot between featured collection and content cards (Figma: Custom Region 3). */}
            <Region page={loaderData.page} regionId="afterFeatured" />

            {/* Women/Men content cards — static */}
            <div className="pt-16">
                <div className="section-container">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ContentCard
                            title={t('featuredContent.women.title')}
                            description={t('featuredContent.women.description')}
                            imageUrl={hero03}
                            imageAlt={t('featuredContent.women.imageAlt')}
                            buttonText={t('featuredContent.women.ctaText')}
                            buttonLink="/category/womens"
                            showBackground={false}
                            showBorder={false}
                            loading="lazy"
                        />
                        <ContentCard
                            title={t('featuredContent.men.title')}
                            description={t('featuredContent.men.description')}
                            imageUrl={hero04}
                            imageAlt={t('featuredContent.men.imageAlt')}
                            buttonText={t('featuredContent.men.ctaText')}
                            buttonLink="/category/mens"
                            showBackground={false}
                            showBorder={false}
                            loading="lazy"
                        />
                    </div>
                </div>
            </div>

            {/* Empty PD slot between content cards and the category section (Figma: Custom Region 4). */}
            <Region page={loaderData.page} regionId="afterContent" />

            {/* "Style for Real Life" category rail — static (Suspense while categories resolve) */}
            <div className="pt-16">
                <PopularCategories categoriesPromise={loaderData.categories} />
            </div>

            {/* Empty PD slot below the category section (Figma: Custom Region 5). */}
            <Region page={loaderData.page} regionId="bottom" />
        </div>
    );
}
