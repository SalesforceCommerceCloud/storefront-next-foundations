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

const basketWithMultipleItems = {
    adjustedMerchandizeTotalTax: 3.51,
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
    lastModified: '2025-09-18T19:41:20.578Z',
    merchandizeTotalTax: 3.51,
    notes: {},
    orderTotal: null,
    productItems: [
        {
            adjustedTax: 1.83,
            basePrice: 19.19,
            bonusProductLineItem: false,
            gift: false,
            itemId: '4b1d10f5f04a55b91b10d2cd02',
            itemText: 'Solid Silk Tie',
            price: 38.38,
            priceAfterItemDiscount: 38.38,
            priceAfterOrderDiscount: 38.38,
            productId: '029407331227M',
            productName: 'Solid Silk Tie',
            quantity: 2,
            shipmentId: 'me',
            tax: 1.83,
            taxBasis: 38.38,
            taxClassId: 'standard',
            taxRate: 0.05,
        },
        {
            adjustedTax: 1.68,
            basePrice: 35.19,
            bonusProductLineItem: false,
            gift: false,
            itemId: '2e97471059696f517030b6895b',
            itemText: 'Floral Ruffle Top',
            price: 35.19,
            priceAfterItemDiscount: 35.19,
            priceAfterOrderDiscount: 35.19,
            productId: '701643477180M',
            productName: 'Floral Ruffle Top',
            quantity: 1,
            shipmentId: 'me',
            tax: 1.68,
            taxBasis: 35.19,
            taxClassId: 'standard',
            taxRate: 0.05,
        },
    ],
    productSubTotal: 73.57,
    productTotal: 73.57,
    shipments: [
        {
            adjustedMerchandizeTotalTax: 3.51,
            adjustedShippingTotalTax: null,
            gift: false,
            merchandizeTotalTax: 3.51,
            productSubTotal: 73.57,
            productTotal: 73.57,
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

const inBasketMultipleItemDetails = {
    limit: 2,
    data: [
        {
            currency: 'USD',
            id: '029407331227M',
            imageGroups: [
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, , large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe4af2742/images/large/PG.949432114S.NAVYSI.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe4af2742/images/large/PG.949432114S.NAVYSI.PZ.jpg',
                            title: 'Solid Silk Tie, ',
                        },
                        {
                            alt: 'Solid Silk Tie, , large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw6b7bf70c/images/large/PG.949432114S.NAVYSI.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw6b7bf70c/images/large/PG.949432114S.NAVYSI.BZ.jpg',
                            title: 'Solid Silk Tie, ',
                        },
                    ],
                    viewType: 'large',
                },
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, Navy, large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe4af2742/images/large/PG.949432114S.NAVYSI.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe4af2742/images/large/PG.949432114S.NAVYSI.PZ.jpg',
                            title: 'Solid Silk Tie, Navy',
                        },
                        {
                            alt: 'Solid Silk Tie, Navy, large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw6b7bf70c/images/large/PG.949432114S.NAVYSI.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw6b7bf70c/images/large/PG.949432114S.NAVYSI.BZ.jpg',
                            title: 'Solid Silk Tie, Navy',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'NAVYSI',
                                },
                            ],
                        },
                    ],
                    viewType: 'large',
                },
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, Red, large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw9b65b3eb/images/large/PG.949432114S.REDSI.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw9b65b3eb/images/large/PG.949432114S.REDSI.PZ.jpg',
                            title: 'Solid Silk Tie, Red',
                        },
                        {
                            alt: 'Solid Silk Tie, Red, large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwd5c2e3cf/images/large/PG.949432114S.REDSI.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwd5c2e3cf/images/large/PG.949432114S.REDSI.BZ.jpg',
                            title: 'Solid Silk Tie, Red',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'REDSI',
                                },
                            ],
                        },
                    ],
                    viewType: 'large',
                },
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, Yellow, large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwc1295c3a/images/large/PG.949432114S.YELLOSI.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwc1295c3a/images/large/PG.949432114S.YELLOSI.PZ.jpg',
                            title: 'Solid Silk Tie, Yellow',
                        },
                        {
                            alt: 'Solid Silk Tie, Yellow, large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe11cd2d5/images/large/PG.949432114S.YELLOSI.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe11cd2d5/images/large/PG.949432114S.YELLOSI.BZ.jpg',
                            title: 'Solid Silk Tie, Yellow',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'YELLOSI',
                                },
                            ],
                        },
                    ],
                    viewType: 'large',
                },
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, , medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwcea28941/images/medium/PG.949432114S.NAVYSI.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwcea28941/images/medium/PG.949432114S.NAVYSI.PZ.jpg',
                            title: 'Solid Silk Tie, ',
                        },
                        {
                            alt: 'Solid Silk Tie, , medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw44e60576/images/medium/PG.949432114S.NAVYSI.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw44e60576/images/medium/PG.949432114S.NAVYSI.BZ.jpg',
                            title: 'Solid Silk Tie, ',
                        },
                    ],
                    viewType: 'medium',
                },
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, Navy, medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwcea28941/images/medium/PG.949432114S.NAVYSI.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwcea28941/images/medium/PG.949432114S.NAVYSI.PZ.jpg',
                            title: 'Solid Silk Tie, Navy',
                        },
                        {
                            alt: 'Solid Silk Tie, Navy, medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw44e60576/images/medium/PG.949432114S.NAVYSI.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw44e60576/images/medium/PG.949432114S.NAVYSI.BZ.jpg',
                            title: 'Solid Silk Tie, Navy',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'NAVYSI',
                                },
                            ],
                        },
                    ],
                    viewType: 'medium',
                },
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, Red, medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw65faa07a/images/medium/PG.949432114S.REDSI.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw65faa07a/images/medium/PG.949432114S.REDSI.PZ.jpg',
                            title: 'Solid Silk Tie, Red',
                        },
                        {
                            alt: 'Solid Silk Tie, Red, medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw33ea7495/images/medium/PG.949432114S.REDSI.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw33ea7495/images/medium/PG.949432114S.REDSI.BZ.jpg',
                            title: 'Solid Silk Tie, Red',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'REDSI',
                                },
                            ],
                        },
                    ],
                    viewType: 'medium',
                },
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, Yellow, medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw0488ea38/images/medium/PG.949432114S.YELLOSI.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw0488ea38/images/medium/PG.949432114S.YELLOSI.PZ.jpg',
                            title: 'Solid Silk Tie, Yellow',
                        },
                        {
                            alt: 'Solid Silk Tie, Yellow, medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwf195668a/images/medium/PG.949432114S.YELLOSI.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwf195668a/images/medium/PG.949432114S.YELLOSI.BZ.jpg',
                            title: 'Solid Silk Tie, Yellow',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'YELLOSI',
                                },
                            ],
                        },
                    ],
                    viewType: 'medium',
                },
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, , small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw7832203a/images/small/PG.949432114S.NAVYSI.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw7832203a/images/small/PG.949432114S.NAVYSI.PZ.jpg',
                            title: 'Solid Silk Tie, ',
                        },
                        {
                            alt: 'Solid Silk Tie, , small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw114456a6/images/small/PG.949432114S.NAVYSI.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw114456a6/images/small/PG.949432114S.NAVYSI.BZ.jpg',
                            title: 'Solid Silk Tie, ',
                        },
                    ],
                    viewType: 'small',
                },
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, Navy, small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw7832203a/images/small/PG.949432114S.NAVYSI.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw7832203a/images/small/PG.949432114S.NAVYSI.PZ.jpg',
                            title: 'Solid Silk Tie, Navy',
                        },
                        {
                            alt: 'Solid Silk Tie, Navy, small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw114456a6/images/small/PG.949432114S.NAVYSI.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw114456a6/images/small/PG.949432114S.NAVYSI.BZ.jpg',
                            title: 'Solid Silk Tie, Navy',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'NAVYSI',
                                },
                            ],
                        },
                    ],
                    viewType: 'small',
                },
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, Red, small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwa9d66ed7/images/small/PG.949432114S.REDSI.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwa9d66ed7/images/small/PG.949432114S.REDSI.PZ.jpg',
                            title: 'Solid Silk Tie, Red',
                        },
                        {
                            alt: 'Solid Silk Tie, Red, small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwbbe95b71/images/small/PG.949432114S.REDSI.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwbbe95b71/images/small/PG.949432114S.REDSI.BZ.jpg',
                            title: 'Solid Silk Tie, Red',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'REDSI',
                                },
                            ],
                        },
                    ],
                    viewType: 'small',
                },
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, Yellow, small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw3e518473/images/small/PG.949432114S.YELLOSI.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw3e518473/images/small/PG.949432114S.YELLOSI.PZ.jpg',
                            title: 'Solid Silk Tie, Yellow',
                        },
                        {
                            alt: 'Solid Silk Tie, Yellow, small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw5555e43c/images/small/PG.949432114S.YELLOSI.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw5555e43c/images/small/PG.949432114S.YELLOSI.BZ.jpg',
                            title: 'Solid Silk Tie, Yellow',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'YELLOSI',
                                },
                            ],
                        },
                    ],
                    viewType: 'small',
                },
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, Navy, swatch',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw8c2f025f/images/swatch/PG.949432114S.NAVYSI.CP.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw8c2f025f/images/swatch/PG.949432114S.NAVYSI.CP.jpg',
                            title: 'Solid Silk Tie, Navy',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'NAVYSI',
                                },
                            ],
                        },
                    ],
                    viewType: 'swatch',
                },
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, Red, swatch',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw8c4a259e/images/swatch/PG.949432114S.REDSI.CP.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw8c4a259e/images/swatch/PG.949432114S.REDSI.CP.jpg',
                            title: 'Solid Silk Tie, Red',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'REDSI',
                                },
                            ],
                        },
                    ],
                    viewType: 'swatch',
                },
                {
                    images: [
                        {
                            alt: 'Solid Silk Tie, Yellow, swatch',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw981d4f5b/images/swatch/PG.949432114S.YELLOSI.CP.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw981d4f5b/images/swatch/PG.949432114S.YELLOSI.CP.jpg',
                            title: 'Solid Silk Tie, Yellow',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'YELLOSI',
                                },
                            ],
                        },
                    ],
                    viewType: 'swatch',
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
                "This silk tie works well with a Commerce Cloud Store dress shirt and suit It's perfect for any occasion. ",
            master: {
                masterId: '25752218M',
                orderable: true,
                price: 29.99,
            },
            minOrderQuantity: 1,
            name: 'Solid Silk Tie',
            pageDescription:
                "This silk tie works well with a Commerce Cloud Store dress shirt and suit. It's perfect for any occasion. ",
            pageTitle: 'Solid Silk Tie',
            price: 29.99,
            pricePerUnit: 29.99,
            shortDescription:
                "This silk tie works well with a Commerce Cloud Store dress shirt and suit. It's perfect for any occasion. ",
            slugUrl:
                'https://zzrf-001.dx.commercecloud.salesforce.com/s/RefArchGlobal/en_US/solid-silk-tie/029407331227M.html',
            stepQuantity: 1,
            type: {
                variant: true,
            },
            unitMeasure: '',
            unitQuantity: 0,
            upc: '029407331227',
            validFrom: {
                default: '2011-02-07T05:00:00.000Z',
            },
            tieredPrices: [
                {
                    price: 29.99,
                    pricebook: 'usd-m-sale-prices',
                    quantity: 1,
                },
                {
                    price: 39.5,
                    pricebook: 'usd-m-list-prices',
                    quantity: 1,
                },
            ],
            variants: [
                {
                    orderable: true,
                    price: 29.99,
                    productId: '029407331289M',
                    tieredPrices: [
                        {
                            price: 29.99,
                            pricebook: 'usd-m-sale-prices',
                            quantity: 1,
                        },
                        {
                            price: 39.5,
                            pricebook: 'usd-m-list-prices',
                            quantity: 1,
                        },
                    ],
                    variationValues: {
                        color: 'YELLOSI',
                    },
                },
                {
                    orderable: true,
                    price: 29.99,
                    productId: '029407331227M',
                    tieredPrices: [
                        {
                            price: 29.99,
                            pricebook: 'usd-m-sale-prices',
                            quantity: 1,
                        },
                        {
                            price: 39.5,
                            pricebook: 'usd-m-list-prices',
                            quantity: 1,
                        },
                    ],
                    variationValues: {
                        color: 'NAVYSI',
                    },
                },
                {
                    orderable: true,
                    price: 29.99,
                    productId: '029407331258M',
                    tieredPrices: [
                        {
                            price: 29.99,
                            pricebook: 'usd-m-sale-prices',
                            quantity: 1,
                        },
                        {
                            price: 39.5,
                            pricebook: 'usd-m-list-prices',
                            quantity: 1,
                        },
                    ],
                    variationValues: {
                        color: 'REDSI',
                    },
                },
            ],
            variationAttributes: [
                {
                    id: 'color',
                    name: 'Color',
                    values: [
                        {
                            name: 'Navy',
                            orderable: true,
                            value: 'NAVYSI',
                        },
                        {
                            name: 'Red',
                            orderable: true,
                            value: 'REDSI',
                        },
                        {
                            name: 'Yellow',
                            orderable: true,
                            value: 'YELLOSI',
                        },
                    ],
                },
            ],
            variationValues: {
                color: 'NAVYSI',
            },
            c_color: 'NAVYSI',
            c_refinementColor: 'navy',
            c_size: '000',
            c_width: 'Z',
        },
        {
            currency: 'USD',
            id: '701643477180M',
            imageGroups: [
                {
                    images: [
                        {
                            alt: 'Floral Ruffle Top, , large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw8ee20c7f/images/large/PG.10240939.JJ9DFXX.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw8ee20c7f/images/large/PG.10240939.JJ9DFXX.PZ.jpg',
                            title: 'Floral Ruffle Top, ',
                        },
                        {
                            alt: 'Floral Ruffle Top, , large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwaf0abae7/images/large/PG.10240939.JJ9DFXX.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwaf0abae7/images/large/PG.10240939.JJ9DFXX.BZ.jpg',
                            title: 'Floral Ruffle Top, ',
                        },
                    ],
                    viewType: 'large',
                },
                {
                    images: [
                        {
                            alt: 'Floral Ruffle Top, Cardinal Red Multi, large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw8ee20c7f/images/large/PG.10240939.JJ9DFXX.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw8ee20c7f/images/large/PG.10240939.JJ9DFXX.PZ.jpg',
                            title: 'Floral Ruffle Top, Cardinal Red Multi',
                        },
                        {
                            alt: 'Floral Ruffle Top, Cardinal Red Multi, large',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwaf0abae7/images/large/PG.10240939.JJ9DFXX.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwaf0abae7/images/large/PG.10240939.JJ9DFXX.BZ.jpg',
                            title: 'Floral Ruffle Top, Cardinal Red Multi',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'JJ9DFXX',
                                },
                            ],
                        },
                    ],
                    viewType: 'large',
                },
                {
                    images: [
                        {
                            alt: 'Floral Ruffle Top, , medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw06de5cce/images/medium/PG.10240939.JJ9DFXX.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw06de5cce/images/medium/PG.10240939.JJ9DFXX.PZ.jpg',
                            title: 'Floral Ruffle Top, ',
                        },
                        {
                            alt: 'Floral Ruffle Top, , medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw8610108f/images/medium/PG.10240939.JJ9DFXX.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw8610108f/images/medium/PG.10240939.JJ9DFXX.BZ.jpg',
                            title: 'Floral Ruffle Top, ',
                        },
                    ],
                    viewType: 'medium',
                },
                {
                    images: [
                        {
                            alt: 'Floral Ruffle Top, Cardinal Red Multi, medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw06de5cce/images/medium/PG.10240939.JJ9DFXX.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw06de5cce/images/medium/PG.10240939.JJ9DFXX.PZ.jpg',
                            title: 'Floral Ruffle Top, Cardinal Red Multi',
                        },
                        {
                            alt: 'Floral Ruffle Top, Cardinal Red Multi, medium',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw8610108f/images/medium/PG.10240939.JJ9DFXX.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw8610108f/images/medium/PG.10240939.JJ9DFXX.BZ.jpg',
                            title: 'Floral Ruffle Top, Cardinal Red Multi',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'JJ9DFXX',
                                },
                            ],
                        },
                    ],
                    viewType: 'medium',
                },
                {
                    images: [
                        {
                            alt: 'Floral Ruffle Top, , small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw42fb2bdf/images/small/PG.10240939.JJ9DFXX.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw42fb2bdf/images/small/PG.10240939.JJ9DFXX.PZ.jpg',
                            title: 'Floral Ruffle Top, ',
                        },
                        {
                            alt: 'Floral Ruffle Top, , small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe6261bcf/images/small/PG.10240939.JJ9DFXX.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe6261bcf/images/small/PG.10240939.JJ9DFXX.BZ.jpg',
                            title: 'Floral Ruffle Top, ',
                        },
                    ],
                    viewType: 'small',
                },
                {
                    images: [
                        {
                            alt: 'Floral Ruffle Top, Cardinal Red Multi, small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw42fb2bdf/images/small/PG.10240939.JJ9DFXX.PZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw42fb2bdf/images/small/PG.10240939.JJ9DFXX.PZ.jpg',
                            title: 'Floral Ruffle Top, Cardinal Red Multi',
                        },
                        {
                            alt: 'Floral Ruffle Top, Cardinal Red Multi, small',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe6261bcf/images/small/PG.10240939.JJ9DFXX.BZ.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwe6261bcf/images/small/PG.10240939.JJ9DFXX.BZ.jpg',
                            title: 'Floral Ruffle Top, Cardinal Red Multi',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'JJ9DFXX',
                                },
                            ],
                        },
                    ],
                    viewType: 'small',
                },
                {
                    images: [
                        {
                            alt: 'Floral Ruffle Top, Cardinal Red Multi, swatch',
                            disBaseLink:
                                'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw25aa6f8b/images/swatch/PG.10240939.JJ9DFXX.CP.jpg',
                            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw25aa6f8b/images/swatch/PG.10240939.JJ9DFXX.CP.jpg',
                            title: 'Floral Ruffle Top, Cardinal Red Multi',
                        },
                    ],
                    variationAttributes: [
                        {
                            id: 'color',
                            values: [
                                {
                                    value: 'JJ9DFXX',
                                },
                            ],
                        },
                    ],
                    viewType: 'swatch',
                },
            ],
            inventory: {
                ats: 999999,
                backorderable: false,
                id: 'inventory_m',
                orderable: true,
                preorderable: false,
                stockLevel: 999999,
            },
            longDescription:
                'Pair our favorite floral ruffle shirt with our new wide leg pants. You can dress this up or down for a perfect look.',
            master: {
                masterId: '25591227M',
                orderable: true,
                price: 54.99,
            },
            minOrderQuantity: 1,
            name: 'Floral Ruffle Top',
            pageDescription:
                'Pair our favorite floral ruffle shirt with our new wide leg pants. You can dress this up or down for a perfect look.',
            pageTitle: 'Floral Ruffle Top',
            price: 54.99,
            pricePerUnit: 54.99,
            productPromotions: [
                {
                    calloutMsg: 'Buy one Long Center Seam Skirt and get 2 tops',
                    promotionId: 'ChoiceOfBonusProdect-ProductLevel-ruleBased',
                },
            ],
            shortDescription:
                'Pair our favorite floral ruffle shirt with our new wide leg pants. You can dress this up or down for a perfect look.',
            slugUrl:
                'https://zzrf-001.dx.commercecloud.salesforce.com/s/RefArchGlobal/en_US/floral-ruffle-top/701643477180M.html',
            stepQuantity: 1,
            type: {
                variant: true,
            },
            unitMeasure: '',
            unitQuantity: 0,
            upc: '701643477180',
            validFrom: {
                default: '2010-12-29T05:00:00.000Z',
            },
            tieredPrices: [
                {
                    price: 54.99,
                    pricebook: 'usd-m-sale-prices',
                    quantity: 1,
                },
                {
                    price: 79.0,
                    pricebook: 'usd-m-list-prices',
                    quantity: 1,
                },
            ],
            variants: [
                {
                    orderable: false,
                    price: 54.99,
                    productId: '701643477173M',
                    tieredPrices: [
                        {
                            price: 54.99,
                            pricebook: 'usd-m-sale-prices',
                            quantity: 1,
                        },
                        {
                            price: 79.0,
                            pricebook: 'usd-m-list-prices',
                            quantity: 1,
                        },
                    ],
                    variationValues: {
                        color: 'JJ9DFXX',
                        size: '9LG',
                    },
                },
                {
                    orderable: true,
                    price: 54.99,
                    productId: '701643477180M',
                    tieredPrices: [
                        {
                            price: 54.99,
                            pricebook: 'usd-m-sale-prices',
                            quantity: 1,
                        },
                        {
                            price: 79.0,
                            pricebook: 'usd-m-list-prices',
                            quantity: 1,
                        },
                    ],
                    variationValues: {
                        color: 'JJ9DFXX',
                        size: '9MD',
                    },
                },
                {
                    orderable: true,
                    price: 54.99,
                    productId: '701643477197M',
                    tieredPrices: [
                        {
                            price: 54.99,
                            pricebook: 'usd-m-sale-prices',
                            quantity: 1,
                        },
                        {
                            price: 79.0,
                            pricebook: 'usd-m-list-prices',
                            quantity: 1,
                        },
                    ],
                    variationValues: {
                        color: 'JJ9DFXX',
                        size: '9SM',
                    },
                },
                {
                    orderable: true,
                    price: 54.99,
                    productId: '701643477203M',
                    tieredPrices: [
                        {
                            price: 54.99,
                            pricebook: 'usd-m-sale-prices',
                            quantity: 1,
                        },
                        {
                            price: 79.0,
                            pricebook: 'usd-m-list-prices',
                            quantity: 1,
                        },
                    ],
                    variationValues: {
                        color: 'JJ9DFXX',
                        size: '9XL',
                    },
                },
            ],
            variationAttributes: [
                {
                    id: 'color',
                    name: 'Color',
                    values: [
                        {
                            name: 'Cardinal Red Multi',
                            orderable: true,
                            value: 'JJ9DFXX',
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
                            orderable: false,
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
                color: 'JJ9DFXX',
                size: '9MD',
            },
            c_color: 'JJ9DFXX',
            c_refinementColor: 'red',
            c_size: '9MD',
            c_virtualTryOn: true,
            c_width: 'Z',
        },
    ],
    total: 2,
};

const _basketWithMultipleItems = basketWithMultipleItems as unknown as ShopperBasketsV2.schemas['Basket'];
const _inBasketMultipleItemDetails = inBasketMultipleItemDetails as unknown as ShopperProducts.schemas['ProductResult'];

export {
    _basketWithMultipleItems as basketWithMultipleItems,
    _inBasketMultipleItemDetails as inBasketMultipleItemDetails,
};
