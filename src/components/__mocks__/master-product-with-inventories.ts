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

const masterProductWithInventories: ShopperProducts.schemas['Product'] = {
    currency: 'USD',
    id: '25686395M',
    imageGroups: [
        {
            images: [
                {
                    alt: 'Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit, , large',
                    disBaseLink:
                        'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe218463b/images/large/PG.33330DAN84Q.CHARCWL.PZ.jpg',
                    link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe218463b/images/large/PG.33330DAN84Q.CHARCWL.PZ.jpg',
                    title: 'Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit, ',
                },
                {
                    alt: 'Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit, , large',
                    disBaseLink:
                        'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwa7d1fa0b/images/large/PG.33330DAN84Q.CHARCWL.BZ.jpg',
                    link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwa7d1fa0b/images/large/PG.33330DAN84Q.CHARCWL.BZ.jpg',
                    title: 'Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit, ',
                },
            ],
            viewType: 'large',
        },
        {
            images: [
                {
                    alt: 'Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit, Charcoal, large',
                    disBaseLink:
                        'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe218463b/images/large/PG.33330DAN84Q.CHARCWL.PZ.jpg',
                    link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe218463b/images/large/PG.33330DAN84Q.CHARCWL.PZ.jpg',
                    title: 'Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit, Charcoal',
                },
                {
                    alt: 'Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit, Charcoal, large',
                    disBaseLink:
                        'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwa7d1fa0b/images/large/PG.33330DAN84Q.CHARCWL.BZ.jpg',
                    link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwa7d1fa0b/images/large/PG.33330DAN84Q.CHARCWL.BZ.jpg',
                    title: 'Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit, Charcoal',
                },
            ],
            variationAttributes: [
                {
                    id: 'color',
                    values: [
                        {
                            value: 'CHARCWL',
                        },
                    ],
                },
            ],
            viewType: 'large',
        },
    ],
    inventories: [
        {
            ats: 996,
            backorderable: false,
            id: 'inventory_m',
            orderable: true,
            preorderable: false,
            stockLevel: 996,
        },
        {
            ats: 0,
            backorderable: false,
            id: 'inventory_out_of_stock',
            orderable: false,
            preorderable: false,
            stockLevel: 0,
        },
        {
            ats: 50,
            backorderable: true,
            id: 'inventory_low_stock',
            orderable: true,
            preorderable: false,
            stockLevel: 5,
        },
    ],
    longDescription: 'This suit is great for any occasion. Add a shirt and a tie and you are ready for any event. ',
    master: {
        masterId: '25686395M',
        orderable: true,
        price: 299.99,
    },
    minOrderQuantity: 1,
    name: 'Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit',
    pageDescription: 'This suit is great for any occasion. Add a shirt and a tie and you are ready for any event. ',
    pageMetaTags: [
        {
            id: 'description',
            value: 'This suit is great for any occasion. Add a shirt and a tie and you are ready for any event.',
        },
        {
            id: 'robots',
            value: 'index, follow',
        },
        {
            id: 'og:url',
            value: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.store/s/RefArchGlobal/dw/shop/v99_9/products/25686395M?currency=USD&locale=en-US&expand=availability,promotions,options,images,prices,variations,set_products,bundled_products,page_meta_tags&all_images=true',
        },
        {
            id: 'title',
            value: 'Buy Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit for USD 299.99 | RefArchGlobal',
        },
    ],
    pageTitle: 'Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit',
    price: 299.99,
    pricePerUnit: 299.99,
    priceRanges: [
        {
            maxPrice: 299.99,
            minPrice: 299.99,
            pricebook: 'usd-m-sale-prices',
        },
        {
            maxPrice: 500,
            minPrice: 500,
            pricebook: 'usd-m-list-prices',
        },
    ],
    primaryCategoryId: 'mens-clothing-suits',
    productPromotions: [
        {
            calloutMsg: '50% off for Salesforce employees',
            promotionId: 'salesforce-employees-50-off',
            promotionalPrice: 149.995,
        },
    ],
    shortDescription: 'This suit is great for any occasion. Add a shirt and a tie and you are ready for any event. ',
    slugUrl:
        'https://zzrf-001.dx.commercecloud.salesforce.com/s/RefArchGlobal/en_US/charcoal-flat-front-athletic-fit-shadow-striped-wool-suit/25686395M.html',
    stepQuantity: 1,
    type: {
        master: true,
    },
    validFrom: '2011-02-07T05:00:00.000Z',
    variants: [
        {
            orderable: true,
            price: 299.99,
            productId: '640188016716M',
            tieredPrices: [
                {
                    price: 299.99,
                    pricebook: 'usd-m-sale-prices',
                    quantity: 1,
                },
                {
                    price: 500,
                    pricebook: 'usd-m-list-prices',
                    quantity: 1,
                },
            ],
            variationValues: {
                color: 'CHARCWL',
                size: '050',
                width: 'V',
            },
        },
    ],
    variationAttributes: [
        {
            id: 'color',
            name: 'Color',
            values: [
                {
                    name: 'Charcoal',
                    orderable: true,
                    value: 'CHARCWL',
                },
            ],
        },
        {
            id: 'size',
            name: 'Size',
            values: [
                {
                    name: '50',
                    orderable: true,
                    value: '050',
                },
            ],
        },
        {
            id: 'width',
            name: 'Width',
            values: [
                {
                    name: 'Regular',
                    orderable: true,
                    value: 'V',
                },
            ],
        },
    ],
    c_isNew: true,
};

export { masterProductWithInventories };
