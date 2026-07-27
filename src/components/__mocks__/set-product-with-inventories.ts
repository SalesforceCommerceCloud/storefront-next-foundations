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

const setProductWithInventories: ShopperProducts.schemas['Product'] = {
    currency: 'USD',
    id: 'winter-lookM',
    imageGroups: [
        {
            images: [
                {
                    alt: 'Winter Look, , large',
                    disBaseLink:
                        'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwd9ed0401/images/large/PG.10205921.JJ5FUXX.PZ.jpg',
                    link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwd9ed0401/images/large/PG.10205921.JJ5FUXX.PZ.jpg',
                    title: 'Winter Look, ',
                },
            ],
            viewType: 'large',
        },
    ],
    longDescription: '<p>Jacket</p>\r\n<p>Pant</p>\r\n<p>Shoes</p>',
    minOrderQuantity: 1,
    name: 'Winter Look',
    pageMetaTags: [
        {
            id: 'description',
            value: 'Buy Winter Look at RefArchGlobal.',
        },
        {
            id: 'robots',
            value: 'index, follow',
        },
        {
            id: 'og:url',
            value: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.store/s/RefArchGlobal/dw/shop/v99_9/products/winter-lookM?currency=USD&locale=en-US&expand=availability,promotions,options,images,prices,variations,set_products,bundled_products,page_meta_tags&all_images=true',
        },
        {
            id: 'title',
            value: 'Buy Winter Look for USD 69.00-110.99 | RefArchGlobal',
        },
    ],
    price: 69,
    priceMax: 110.99,
    pricePerUnit: 69,
    pricePerUnitMax: 110.99,
    priceRanges: [
        {
            maxPrice: 110.99,
            minPrice: 69,
            pricebook: 'usd-m-sale-prices',
        },
        {
            maxPrice: 159,
            minPrice: 69,
            pricebook: 'usd-m-list-prices',
        },
    ],
    primaryCategoryId: 'womens-outfits',
    setProducts: [
        {
            currency: 'USD',
            id: '25518447M',
            inventories: [
                {
                    ats: 376,
                    backorderable: false,
                    id: 'inventory_m',
                    orderable: true,
                    preorderable: false,
                    stockLevel: 376,
                },
                {
                    ats: 0,
                    backorderable: false,
                    id: 'inventory_out_of_stock',
                    orderable: false,
                    preorderable: false,
                    stockLevel: 0,
                },
            ],
            longDescription:
                'A classic quilted car coat looks new again.  Add a great Commerce Cloud Store top for a perfect look.',
            master: {
                masterId: '25518447M',
                orderable: true,
                price: 110.99,
            },
            minOrderQuantity: 1,
            name: 'Quilted Jacket',
            pageDescription:
                'A classic quilted car coat looks new again.  Add a great Commerce Cloud Store top for a perfect look.',
            pageMetaTags: [
                {
                    id: 'description',
                    value: 'A classic quilted car coat looks new again. Add a great Commerce Cloud Store top for a perfect look.',
                },
                {
                    id: 'robots',
                    value: 'index, follow',
                },
                {
                    id: 'og:url',
                    value: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.store/s/RefArchGlobal/dw/shop/v99_9/products/winter-lookM?currency=USD&locale=en-US&expand=availability,promotions,options,images,prices,variations,set_products,bundled_products,page_meta_tags&all_images=true',
                },
                {
                    id: 'title',
                    value: 'Buy Quilted Jacket for USD 110.99 | RefArchGlobal',
                },
            ],
            pageTitle: 'Quilted Jacket',
            price: 110.99,
            pricePerUnit: 110.99,
            priceRanges: [
                {
                    maxPrice: 110.99,
                    minPrice: 110.99,
                    pricebook: 'usd-m-sale-prices',
                },
                {
                    maxPrice: 159,
                    minPrice: 159,
                    pricebook: 'usd-m-list-prices',
                },
            ],
            primaryCategoryId: 'womens-clothing-jackets',
            productPromotions: [
                {
                    calloutMsg: '$10 off product set',
                    promotionId: '$10 off product set',
                    promotionalPrice: 100.99,
                },
                {
                    calloutMsg: '50% off for employees',
                    promotionId: 'salesforce-employees-50-off',
                    promotionalPrice: 55.5,
                },
            ],
            shortDescription:
                'A classic quilted car coat looks new again.  Add a great Commerce Cloud Store top for a perfect look.',
            stepQuantity: 1,
            type: {
                master: true,
            },
            validFrom: '2010-10-21T04:00:00.000Z',
            variants: [
                {
                    orderable: true,
                    price: 110.99,
                    productId: '701642853695M',
                    tieredPrices: [
                        {
                            price: 110.99,
                            pricebook: 'usd-m-sale-prices',
                            quantity: 1,
                        },
                        {
                            price: 159,
                            pricebook: 'usd-m-list-prices',
                            quantity: 1,
                        },
                    ],
                    variationValues: {
                        color: 'JJ5FUXX',
                        size: '9LG',
                    },
                },
            ],
            variationAttributes: [
                {
                    id: 'color',
                    name: 'Color',
                    values: [
                        {
                            name: 'royal',
                            orderable: true,
                            value: 'JJ5FUXX',
                        },
                    ],
                },
                {
                    id: 'size',
                    name: 'Size',
                    values: [
                        {
                            name: 'L',
                            orderable: true,
                            value: '9LG',
                        },
                    ],
                },
            ],
            c_isNewtest: true,
            c_isSale: true,
        },
        {
            currency: 'USD',
            id: '25518704M',
            inventories: [
                {
                    ats: 495,
                    backorderable: false,
                    id: 'inventory_m',
                    orderable: true,
                    preorderable: false,
                    stockLevel: 495,
                },
                {
                    ats: 0,
                    backorderable: false,
                    id: 'inventory_out_of_stock',
                    orderable: false,
                    preorderable: false,
                    stockLevel: 0,
                },
            ],
            longDescription:
                'Meet a Commerce Cloud Store new wardrobe favorite - a knit pant that works perfectly 12 months a year!',
            master: {
                masterId: '25518704M',
                orderable: true,
                price: 69,
            },
            minOrderQuantity: 1,
            name: 'Pull On Pant',
            pageDescription:
                'Meet a Commerce Cloud Store new wardrobe favorite - a knit pant that works perfectly 12 months a year!',
            pageMetaTags: [
                {
                    id: 'description',
                    value: 'Meet a Commerce Cloud Store new wardrobe favorite - a knit pant that works perfectly 12 months a year!',
                },
                {
                    id: 'robots',
                    value: 'index, follow',
                },
                {
                    id: 'og:url',
                    value: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.store/s/RefArchGlobal/dw/shop/v99_9/products/winter-lookM?currency=USD&locale=en-US&expand=availability,promotions,options,images,prices,variations,set_products,bundled_products,page_meta_tags&all_images=true',
                },
                {
                    id: 'title',
                    value: 'Buy Pull On Pant for USD 69.00 | RefArchGlobal',
                },
            ],
            pageTitle: 'Pull On Pant',
            price: 69,
            pricePerUnit: 69,
            priceRanges: [
                {
                    maxPrice: 69,
                    minPrice: 69,
                    pricebook: 'usd-m-sale-prices',
                },
                {
                    maxPrice: 69,
                    minPrice: 69,
                    pricebook: 'usd-m-list-prices',
                },
            ],
            primaryCategoryId: 'womens-clothing-bottoms',
            productPromotions: [
                {
                    calloutMsg: '$10 off product set',
                    promotionId: '$10 off product set',
                    promotionalPrice: 100.99,
                },
                {
                    calloutMsg: '50% off for employees',
                    promotionId: 'salesforce-employees-50-off',
                    promotionalPrice: 55.5,
                },
            ],
            shortDescription:
                'Meet a Commerce Cloud Store new wardrobe favorite - a knit pant that works perfectly 12 months a year!',
            stepQuantity: 1,
            type: {
                master: true,
            },
            validFrom: '2010-10-21T04:00:00.000Z',
            variants: [
                {
                    orderable: true,
                    price: 69,
                    productId: '701642867098M',
                    tieredPrices: [
                        {
                            price: 69,
                            pricebook: 'usd-m-sale-prices',
                            quantity: 1,
                        },
                        {
                            price: 69,
                            pricebook: 'usd-m-list-prices',
                            quantity: 1,
                        },
                    ],
                    variationValues: {
                        color: 'JJ2XNXX',
                        size: '9LG',
                    },
                },
            ],
            variationAttributes: [
                {
                    id: 'color',
                    name: 'Color',
                    values: [
                        {
                            name: 'Grey Heather',
                            orderable: true,
                            value: 'JJ2XNXX',
                        },
                    ],
                },
                {
                    id: 'size',
                    name: 'Size',
                    values: [
                        {
                            name: 'L',
                            orderable: true,
                            value: '9LG',
                        },
                    ],
                },
            ],
            c_isNewtest: true,
        },
    ],
    shortDescription: 'Look for Winter',
    slugUrl:
        'https://zzrf-001.dx.commercecloud.salesforce.com/s/RefArchGlobal/en_US/product/winter-lookm/winter-lookM.html',
    stepQuantity: 1,
    type: {
        set: true,
    },
};

export { setProductWithInventories };
