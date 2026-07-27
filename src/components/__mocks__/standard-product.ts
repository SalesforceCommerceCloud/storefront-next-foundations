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

interface OrderableProductFixture {
    product: ShopperProducts.schemas['Product'];
    inventory: ShopperProducts.schemas['Inventory'];
}

const mockStandardProductOrderableData = {
    product: {
        currency: 'USD',
        id: '061492183589M',
        imageGroups: [
            {
                images: [
                    {
                        alt: "Men's Classic Deer Gloves, , large",
                        disBaseLink:
                            'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw5f194ed3/images/large/TG508_206.jpg',
                        link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw5f194ed3/images/large/TG508_206.jpg',
                        title: "Men's Classic Deer Gloves, ",
                    },
                ],
                viewType: 'large',
            },
            {
                images: [
                    {
                        alt: "Men's Classic Deer Gloves, , medium",
                        disBaseLink:
                            'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwfd5a69cf/images/medium/TG508_206.jpg',
                        link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwfd5a69cf/images/medium/TG508_206.jpg',
                        title: "Men's Classic Deer Gloves, ",
                    },
                ],
                viewType: 'medium',
            },
            {
                images: [
                    {
                        alt: "Men's Classic Deer Gloves, , small",
                        disBaseLink:
                            'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwd4659c06/images/small/TG508_206.jpg',
                        link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwd4659c06/images/small/TG508_206.jpg',
                        title: "Men's Classic Deer Gloves, ",
                    },
                ],
                viewType: 'small',
            },
        ],
        inventory: {
            ats: 98,
            backorderable: false,
            id: 'inventory_m',
            orderable: true,
            preorderable: false,
            stockLevel: 98,
        },
        longDescription:
            '<ul><li>Grain deerskin leather</li><li>Water resistant and durable</li><li>Outseam machine sewn</li></ul>',
        master: {
            masterId: 'TG508M',
            orderable: true,
            price: 99.99,
        },
        minOrderQuantity: 1,
        name: "Men's Classic Deer Gloves",
        pageDescription: 'These simple, stylish gloves have a great look and feel. A classic glove for men.',
        pageKeywords: "Apparelstore, TG508, Men's Classic Deer Gloves, Mocha, Winter Accessories, Cold Weather Gear",
        pageMetaTags: [
            {
                id: 'description',
                value: 'These simple, stylish gloves have a great look and feel. A classic glove for men.',
            },
            {
                id: 'robots',
                value: 'index, follow',
            },
            {
                id: 'og:url',
                value: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.store/s/RefArchGlobal/dw/shop/v99_9/products/061492183589M?currency=USD&locale=en-US&expand=availability,bundled_products,images,options,page_meta_tags,prices,promotions,set_products,variations&all_images=true',
            },
            {
                id: 'title',
                value: "Buy Men's Classic Deer Gloves for USD 99.99 | RefArchGlobal",
            },
        ],
        pageTitle: "Commerce Cloud - Men's Classic Deer Gloves",
        price: 99.99,
        pricePerUnit: 99.99,
        shortDescription:
            'These simple, stylish gloves have a great look and feel, with outseam construction for rugged character and select deerskin leather for premium quality. The fleece lining provides essential winter warmth, with a lightly tailored cuff for extra protection – featuring a Commerce Cloud grommet button for detail. A classic glove for men.',
        slugUrl:
            'https://zzrf-001.dx.commercecloud.salesforce.com/s/RefArchGlobal/en_US/mens-classic-deer-gloves/061492183589M.html',
        stepQuantity: 1,
        type: {
            variant: true,
        },
        unitMeasure: '',
        unitQuantity: 0,
        tieredPrices: [
            {
                price: 99.99,
                pricebook: 'usd-m-list-prices',
                quantity: 1,
            },
        ],
        variants: [
            {
                orderable: true,
                price: 99.99,
                productId: '061492183572M',
                tieredPrices: [
                    {
                        price: 99.99,
                        pricebook: 'usd-m-list-prices',
                        quantity: 1,
                    },
                ],
                variationValues: {
                    accessorySize: '050',
                },
            },
            {
                orderable: true,
                price: 99.99,
                productId: '061492183589M',
                tieredPrices: [
                    {
                        price: 99.99,
                        pricebook: 'usd-m-list-prices',
                        quantity: 1,
                    },
                ],
                variationValues: {
                    accessorySize: '060',
                },
            },
            {
                orderable: true,
                price: 99.99,
                productId: '061492183596M',
                tieredPrices: [
                    {
                        price: 99.99,
                        pricebook: 'usd-m-list-prices',
                        quantity: 1,
                    },
                ],
                variationValues: {
                    accessorySize: '080',
                },
            },
        ],
        variationAttributes: [
            {
                id: 'accessorySize',
                name: 'Size',
                values: [
                    {
                        name: 'M',
                        orderable: true,
                        value: '050',
                    },
                    {
                        name: 'L',
                        orderable: true,
                        value: '060',
                    },
                    {
                        name: 'XL',
                        orderable: true,
                        value: '080',
                    },
                ],
            },
        ],
        variationValues: {
            accessorySize: '060',
        },
        c_size: '060',
        c_styleNumber: 'TG508',
        c_tabDescription:
            'These simple, stylish gloves have a great look and feel, with outseam construction for rugged character and select deerskin leather for premium quality. The fleece lining provides essential winter warmth, with a lightly tailored cuff for extra protection – featuring a Apparelstore grommet button for detail. A classic glove for men.',
        c_tabDetails: 'Grain deerskin leather|Water resistant and durable|Outseam machine sewn',
    },
    apiCalls: {
        product: {
            id: '061492183589M',
            expand: [
                'availability',
                'bundled_products',
                'images',
                'options',
                'page_meta_tags',
                'prices',
                'promotions',
                'set_products',
                'variations',
            ],
            allImages: true,
            perPricebook: true,
        },
        category: null,
    },
};

const mockStandardProductNotOrderableData = {
    ...mockStandardProductOrderableData,
    id: '061492183589M-not-orderable',
    inventory: {
        ats: 0,
        backorderable: false,
        id: 'inventory_m',
        orderable: false,
        preorderable: false,
        stockLevel: 0,
    },
};

export const mockStandardProductOrderable = mockStandardProductOrderableData as unknown as OrderableProductFixture;
export const mockStandardProductNotOrderable =
    mockStandardProductNotOrderableData as unknown as OrderableProductFixture;
