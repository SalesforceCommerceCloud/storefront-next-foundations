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
import type { ShopperProducts } from '@/scapi';

/**
 * Mock category data for popular categories component
 */
export const mockPopularCategories: ShopperProducts.schemas['Category'][] = [
    {
        id: 'womens-jewelry',
        name: 'Jewelry',
        pageDescription: 'Elegant jewelry pieces to complement any outfit',
        pageTitle: "Women's Jewelry Collection",
        parentCategoryId: 'womens',
        image: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw14ce9267/images/slot/sub_banners/cat-banner-womens-jewelry.jpg',
        c_slotBannerImage:
            'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw6228a2ea/images/slot/landing/cat-landing-womens-jewelry.jpg',
        c_showInMenu: true,
        c_enableCompare: false,
    },
    {
        id: 'mens-clothing',
        name: 'Clothing',
        pageDescription: "Stylish and comfortable men's clothing for every occasion",
        pageTitle: "Men's Clothing Collection",
        parentCategoryId: 'mens',
        image: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw56b28e03/images/slot/sub_banners/cat-banner-mens-clothing.jpg',
        c_slotBannerImage:
            'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw7a8c9f12/images/slot/landing/cat-landing-mens-clothing.jpg',
        c_showInMenu: true,
        c_enableCompare: false,
    },
    {
        id: 'electronics',
        name: 'Electronics',
        pageDescription: 'Latest electronics and tech gadgets',
        pageTitle: 'Electronics & Technology',
        parentCategoryId: 'root',
        image: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw98765432/images/slot/sub_banners/cat-banner-electronics.jpg',
        c_slotBannerImage:
            'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw12345678/images/slot/landing/cat-landing-electronics.jpg',
        c_showInMenu: true,
        c_enableCompare: true,
    },
    {
        id: 'home-living',
        name: 'Home & Living',
        pageDescription: 'Transform your space with our home and living collection',
        pageTitle: 'Home & Living Collection',
        parentCategoryId: 'root',
        image: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw11223344/images/slot/sub_banners/cat-banner-home-living.jpg',
        c_slotBannerImage:
            'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw55667788/images/slot/landing/cat-landing-home-living.jpg',
        c_showInMenu: true,
        c_enableCompare: false,
    },
];

/**
 * Mock categories with minimal data (no images)
 */
export const mockCategoriesNoImages: ShopperProducts.schemas['Category'][] = [
    {
        id: 'category-1',
        name: 'Category One',
        pageDescription: 'Description for category one',
        parentCategoryId: 'root',
    },
    {
        id: 'category-2',
        name: 'Category Two',
        pageDescription: 'Description for category two',
        parentCategoryId: 'root',
    },
    {
        id: 'category-3',
        name: 'Category Three',
        pageDescription: 'Description for category three',
        parentCategoryId: 'root',
    },
    {
        id: 'category-4',
        name: 'Category Four',
        pageDescription: 'Description for category four',
        parentCategoryId: 'root',
    },
];

/**
 * Mock categories - larger set (for testing with more than 4)
 */
export const mockManyCategoriesCategories: ShopperProducts.schemas['Category'][] = [
    ...mockPopularCategories,
    {
        id: 'sports-outdoors',
        name: 'Sports & Outdoors',
        pageDescription: 'Gear up for your next adventure',
        parentCategoryId: 'root',
        image: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw99887766/images/slot/sub_banners/cat-banner-sports.jpg',
    },
    {
        id: 'beauty-health',
        name: 'Beauty & Health',
        pageDescription: 'Beauty and wellness products',
        parentCategoryId: 'root',
        image: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dw66554433/images/slot/sub_banners/cat-banner-beauty.jpg',
    },
];
