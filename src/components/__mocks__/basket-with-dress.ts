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
import type { ShopperBasketsV2, ShopperProducts } from '@/scapi';

const basketWithOneItem = {
    adjustedMerchandizeTotalTax: 1.89,
    adjustedShippingTotalTax: null,
    agentBasket: false,
    basketId: '9626ffe806a48110b5f4d979e4',
    channelType: 'storefront',
    creationDate: '2025-09-18T19:37:43.207Z',
    currency: 'GBP',
    customerInfo: {
        customerId: 'ablbg0mucWwKgRxbkXwWYYmbs1',
        email: '',
    },
    lastModified: '2025-09-18T19:53:00.526Z',
    merchandizeTotalTax: 1.89,
    notes: {},
    orderTotal: 41.56,
    productItems: [
        {
            adjustedTax: 1.89,
            basePrice: 39.67,
            bonusProductLineItem: false,
            gift: false,
            itemId: '2a54fe1a10d9d9bbbeea6f205f',
            itemText: 'Button Front Jacket',
            price: 39.67,
            priceAfterItemDiscount: 39.67,
            priceAfterOrderDiscount: 39.67,
            productId: '701642868279M',
            productName: 'Button Front Jacket',
            quantity: 1,
            shipmentId: 'me',
            tax: 1.89,
            taxBasis: 39.67,
            taxClassId: 'standard',
            taxRate: 0.05,
        },
    ],
    productSubTotal: 39.67,
    productTotal: 39.67,
    shipments: [
        {
            adjustedMerchandizeTotalTax: 1.89,
            adjustedShippingTotalTax: null,
            gift: false,
            merchandizeTotalTax: 1.89,
            productSubTotal: 39.67,
            productTotal: 39.67,
            shipmentId: 'me',
            shipmentTotal: null,
            shippingStatus: 'not_shipped',
            shippingTotal: null,
            shippingTotalTax: null,
            taxTotal: null,
        },
    ],
    shippingItems: [
        {
            adjustedTax: null,
            basePrice: null,
            itemId: 'e9737dd1690dfb1e716733e111',
            itemText: 'Shipping',
            price: null,
            priceAfterItemDiscount: null,
            shipmentId: 'me',
            tax: null,
            taxBasis: null,
            taxClassId: null,
            taxRate: 0.05,
        },
    ],
    shippingTotal: null,
    shippingTotalTax: null,
    taxation: 'gross',
    taxTotal: null,
};

const inBasketProductDetails = {
    limit: 1,
    data: [
        {
            currency: 'USD',
            id: '701642868279M',
            imageGroups: [
                {
                    images: [
                        {
                            alt: 'Button Front Jacket, , large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe26bcbe8/images/large/PG.10212871.JJ8OLXX.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe26bcbe8/images/large/PG.10212871.JJ8OLXX.PZ.jpg',
                            title: 'Button Front Jacket, ',
                        },
                        {
                            alt: 'Button Front Jacket, , large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwded39cf1/images/large/PG.10212871.JJ8OLXX.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwded39cf1/images/large/PG.10212871.JJ8OLXX.BZ.jpg',
                            title: 'Button Front Jacket, ',
                        },
                    ],
                    viewType: 'large',
                },
                {
                    images: [
                        {
                            alt: 'Button Front Jacket, Aqua Haze, large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe26bcbe8/images/large/PG.10212871.JJ8OLXX.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe26bcbe8/images/large/PG.10212871.JJ8OLXX.PZ.jpg',
                            title: 'Button Front Jacket, Aqua Haze',
                        },
                        {
                            alt: 'Button Front Jacket, Aqua Haze, large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwded39cf1/images/large/PG.10212871.JJ8OLXX.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwded39cf1/images/large/PG.10212871.JJ8OLXX.BZ.jpg',
                            title: 'Button Front Jacket, Aqua Haze',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'JJ8OLXX',
                                },
                            ],
                        },
                    ],
                    viewType: 'large',
                },
                {
                    images: [
                        {
                            alt: 'Button Front Jacket, , medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw33d4fb9c/images/medium/PG.10212871.JJ8OLXX.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw33d4fb9c/images/medium/PG.10212871.JJ8OLXX.PZ.jpg',
                            title: 'Button Front Jacket, ',
                        },
                        {
                            alt: 'Button Front Jacket, , medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwa55aef9c/images/medium/PG.10212871.JJ8OLXX.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwa55aef9c/images/medium/PG.10212871.JJ8OLXX.BZ.jpg',
                            title: 'Button Front Jacket, ',
                        },
                    ],
                    viewType: 'medium',
                },
                {
                    images: [
                        {
                            alt: 'Button Front Jacket, Aqua Haze, medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw33d4fb9c/images/medium/PG.10212871.JJ8OLXX.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw33d4fb9c/images/medium/PG.10212871.JJ8OLXX.PZ.jpg',
                            title: 'Button Front Jacket, Aqua Haze',
                        },
                        {
                            alt: 'Button Front Jacket, Aqua Haze, medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwa55aef9c/images/medium/PG.10212871.JJ8OLXX.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwa55aef9c/images/medium/PG.10212871.JJ8OLXX.BZ.jpg',
                            title: 'Button Front Jacket, Aqua Haze',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'JJ8OLXX',
                                },
                            ],
                        },
                    ],
                    viewType: 'medium',
                },
                {
                    images: [
                        {
                            alt: 'Button Front Jacket, , small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw99c77d53/images/small/PG.10212871.JJ8OLXX.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw99c77d53/images/small/PG.10212871.JJ8OLXX.PZ.jpg',
                            title: 'Button Front Jacket, ',
                        },
                        {
                            alt: 'Button Front Jacket, , small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe338b37f/images/small/PG.10212871.JJ8OLXX.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe338b37f/images/small/PG.10212871.JJ8OLXX.BZ.jpg',
                            title: 'Button Front Jacket, ',
                        },
                    ],
                    viewType: 'small',
                },
                {
                    images: [
                        {
                            alt: 'Button Front Jacket, Aqua Haze, small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw99c77d53/images/small/PG.10212871.JJ8OLXX.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw99c77d53/images/small/PG.10212871.JJ8OLXX.PZ.jpg',
                            title: 'Button Front Jacket, Aqua Haze',
                        },
                        {
                            alt: 'Button Front Jacket, Aqua Haze, small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe338b37f/images/small/PG.10212871.JJ8OLXX.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe338b37f/images/small/PG.10212871.JJ8OLXX.BZ.jpg',
                            title: 'Button Front Jacket, Aqua Haze',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'JJ8OLXX',
                                },
                            ],
                        },
                    ],
                    viewType: 'small',
                },
                {
                    images: [
                        {
                            alt: 'Button Front Jacket, Aqua Haze, swatch',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw737fb707/images/swatch/PG.10212871.JJ8OLXX.CP.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw737fb707/images/swatch/PG.10212871.JJ8OLXX.CP.jpg',
                            title: 'Button Front Jacket, Aqua Haze',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'JJ8OLXX',
                                },
                            ],
                        },
                    ],
                    viewType: 'swatch',
                },
            ],
            inventory: {
                ats: 100,
                backorderable: false,
                id: 'inventory_m',
                orderable: true,
                preorderable: false,
                stockLevel: 100,
            },
            longDescription:
                'We took our best selling jacket and updated it with a new color for the season. Start showing off!',
            master: {
                masterId: '25518795M',
                orderable: true,
                price: 61.99,
            },
            minOrderQuantity: 1,
            name: 'Button Front Jacket',
            pageDescription:
                'We took our best selling jacket and updated it with a new color for the season. Start showing off!',
            pageTitle: 'Button Front Jacket',
            price: 61.99,
            pricePerUnit: 61.99,
            shortDescription:
                'We took our best selling jacket and updated it with a new color for the season. Start showing off!',
            slugUrl:
                'https://zzrf-001.dx.commercecloud.salesforce.com/s/RefArchGlobal/en_US/button-front-jacket/701642868279M.html',
            stepQuantity: 1,
            type: {
                variant: true,
            },
            unitMeasure: '',
            unitQuantity: 0,
            upc: '701642868279',
            validFrom: {
                default: '2010-11-18T05:00:00.000Z',
            },
            tieredPrices: [
                {
                    price: 61.99,
                    pricebook: 'usd-m-sale-prices',
                    quantity: 1,
                },
                {
                    price: 89.0,
                    pricebook: 'usd-m-list-prices',
                    quantity: 1,
                },
            ],
            variants: [
                {
                    orderable: true,
                    price: 61.99,
                    productId: '701642868262M',
                    tieredPrices: [
                        {
                            price: 61.99,
                            pricebook: 'usd-m-sale-prices',
                            quantity: 1,
                        },
                        {
                            price: 89.0,
                            pricebook: 'usd-m-list-prices',
                            quantity: 1,
                        },
                    ],
                    variationValues: {
                        color: 'JJ8OLXX',
                        size: '9LG',
                    },
                },
                {
                    orderable: true,
                    price: 61.99,
                    productId: '701642868293M',
                    tieredPrices: [
                        {
                            price: 61.99,
                            pricebook: 'usd-m-sale-prices',
                            quantity: 1,
                        },
                        {
                            price: 89.0,
                            pricebook: 'usd-m-list-prices',
                            quantity: 1,
                        },
                    ],
                    variationValues: {
                        color: 'JJ8OLXX',
                        size: '9XL',
                    },
                },
                {
                    orderable: true,
                    price: 61.99,
                    productId: '701642868279M',
                    tieredPrices: [
                        {
                            price: 61.99,
                            pricebook: 'usd-m-sale-prices',
                            quantity: 1,
                        },
                        {
                            price: 89.0,
                            pricebook: 'usd-m-list-prices',
                            quantity: 1,
                        },
                    ],
                    variationValues: {
                        color: 'JJ8OLXX',
                        size: '9MD',
                    },
                },
                {
                    orderable: true,
                    price: 61.99,
                    productId: '701642868286M',
                    tieredPrices: [
                        {
                            price: 61.99,
                            pricebook: 'usd-m-sale-prices',
                            quantity: 1,
                        },
                        {
                            price: 89.0,
                            pricebook: 'usd-m-list-prices',
                            quantity: 1,
                        },
                    ],
                    variationValues: {
                        color: 'JJ8OLXX',
                        size: '9SM',
                    },
                },
            ],
            variationAttributes: [
                {
                    id: 'color',
                    name: 'Color',
                    values: [
                        {
                            name: 'Aqua Haze',
                            orderable: true,
                            value: 'JJ8OLXX',
                        },
                    ],
                },
                {
                    id: 'size',
                    name: 'Size',
                    values: [
                        {
                            name: 'S',
                            orderable: true,
                            value: '9SM',
                        },
                        {
                            name: 'M',
                            orderable: true,
                            value: '9MD',
                        },
                        {
                            name: 'L',
                            orderable: true,
                            value: '9LG',
                        },
                        {
                            name: 'XL',
                            orderable: true,
                            value: '9XL',
                        },
                    ],
                },
            ],
            variationValues: {
                color: 'JJ8OLXX',
                size: '9MD',
            },
            c_color: 'JJ8OLXX',
            c_refinementColor: 'green',
            c_size: '9MD',
            c_width: 'Z',
        },
    ],
    total: 1,
};

const _basketWithOneItem = basketWithOneItem as unknown as ShopperBasketsV2.schemas['Basket'];
const _inBasketProductDetails = inBasketProductDetails as unknown as ShopperProducts.schemas['ProductResult'];

export { _basketWithOneItem as basketWithOneItem, _inBasketProductDetails as inBasketProductDetails };
