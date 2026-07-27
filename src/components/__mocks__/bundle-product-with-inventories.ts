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

const bundleProductWithInventories: ShopperProducts.schemas['Product'] = {
    bundledProducts: [
        {
            id: '013742002836M',
            product: {
                currency: 'USD',
                id: '013742002836M',
                inventories: [
                    {
                        ats: 9966,
                        backorderable: false,
                        id: 'inventory_m',
                        orderable: true,
                        preorderable: false,
                        stockLevel: 9966,
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
                    'Pair with matching earring or necklace for a complete look. Each piece of jewelry will be shipped with a beautiful Commerce Cloud Store velvet gift pouch. ',
                master: {
                    masterId: '25720037M',
                    orderable: true,
                    price: 38,
                },
                minOrderQuantity: 1,
                name: 'Turquoise and Gold Bracelet',
                pageDescription:
                    'Pair with matching earring or necklace for a complete look. Each piece of jewelry will be shipped with a beautiful Commerce Cloud Store velvet gift pouch. ',
                pageMetaTags: [
                    {
                        id: 'description',
                        value: 'Pair with matching earring or necklace for a complete look. Each piece of jewelry will be shipped with a beautiful Commerce Cloud Store velvet gift pouch.',
                    },
                    {
                        id: 'robots',
                        value: 'index, follow',
                    },
                    {
                        id: 'og:url',
                        value: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.store/s/RefArchGlobal/dw/shop/v99_9/products/womens-jewelry-bundleM?currency=USD&locale=en-US&expand=availability,promotions,options,images,prices,variations,set_products,bundled_products,page_meta_tags&all_images=true',
                    },
                    {
                        id: 'title',
                        value: 'Buy Turquoise and Gold Bracelet for USD 38.00 | RefArchGlobal',
                    },
                ],
                pageTitle: 'Turquoise and Gold Bracelet',
                price: 38,
                pricePerUnit: 38,
                shortDescription:
                    'Pair with matching earring or necklace for a complete look. Each piece of jewelry will be shipped with a beautiful Commerce Cloud Store velvet gift pouch. ',
                stepQuantity: 1,
                type: {
                    variant: true,
                },
                unitMeasure: '',
                unitQuantity: 0,
                upc: '013742002836',
                tieredPrices: [
                    {
                        price: 38,
                        pricebook: 'usd-m-sale-prices',
                        quantity: 1,
                    },
                    {
                        price: 38,
                        pricebook: 'usd-m-list-prices',
                        quantity: 1,
                    },
                ],
                variants: [
                    {
                        orderable: true,
                        price: 38,
                        productId: '013742002836M',
                        tieredPrices: [
                            {
                                price: 38,
                                pricebook: 'usd-m-sale-prices',
                                quantity: 1,
                            },
                            {
                                price: 38,
                                pricebook: 'usd-m-list-prices',
                                quantity: 1,
                            },
                        ],
                        variationValues: {
                            color: 'JJ887XX',
                        },
                    },
                ],
                variationAttributes: [
                    {
                        id: 'color',
                        name: 'Color',
                        values: [
                            {
                                name: 'Gold',
                                orderable: true,
                                value: 'JJ887XX',
                            },
                        ],
                    },
                ],
                variationValues: {
                    color: 'JJ887XX',
                },
                c_color: 'JJ887XX',
                c_isNewtest: true,
                c_refinementColor: 'yellow',
                c_size: '010',
                c_width: 'H',
            },
            quantity: 1,
        },
        {
            id: '013742002805M',
            product: {
                currency: 'USD',
                id: '013742002805M',
                inventories: [
                    {
                        ats: 9969,
                        backorderable: false,
                        id: 'inventory_m',
                        orderable: true,
                        preorderable: false,
                        stockLevel: 9969,
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
                    'Be a hit at your next BBQ with this turquoise and gold necklace. Each piece of jewelry will be shipped with a beautiful Commerce Cloud Store velvet gift pouch. ',
                master: {
                    masterId: '25720035M',
                    orderable: true,
                    price: 45,
                },
                minOrderQuantity: 1,
                name: 'Turquoise and Gold Necklace',
                pageDescription:
                    'Be a hit at your next BBQ with this turquoise and gold necklace. Each piece of jewelry will be shipped with a beautiful Commerce Cloud Store velvet gift pouch. ',
                pageMetaTags: [
                    {
                        id: 'description',
                        value: 'Be a hit at your next BBQ with this turquoise and gold necklace. Each piece of jewelry will be shipped with a beautiful Commerce Cloud Store velvet gift pouch.',
                    },
                    {
                        id: 'robots',
                        value: 'index, follow',
                    },
                    {
                        id: 'og:url',
                        value: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.store/s/RefArchGlobal/dw/shop/v99_9/products/womens-jewelry-bundleM?currency=USD&locale=en-US&expand=availability,promotions,options,images,prices,variations,set_products,bundled_products,page_meta_tags&all_images=true',
                    },
                    {
                        id: 'title',
                        value: 'Buy Turquoise and Gold Necklace for USD 45.00 | RefArchGlobal',
                    },
                ],
                pageTitle: 'Turquoise and Gold Necklace',
                price: 45,
                pricePerUnit: 45,
                shortDescription:
                    'Be a hit at your next BBQ with this turquoise and gold necklace. Each piece of jewelry will be shipped with a beautiful Commerce Cloud Store velvet gift pouch. ',
                stepQuantity: 1,
                type: {
                    variant: true,
                },
                unitMeasure: '',
                unitQuantity: 0,
                upc: '013742002805',
                tieredPrices: [
                    {
                        price: 45,
                        pricebook: 'usd-m-sale-prices',
                        quantity: 1,
                    },
                    {
                        price: 45,
                        pricebook: 'usd-m-list-prices',
                        quantity: 1,
                    },
                ],
                variants: [
                    {
                        orderable: true,
                        price: 45,
                        productId: '013742002805M',
                        tieredPrices: [
                            {
                                price: 45,
                                pricebook: 'usd-m-sale-prices',
                                quantity: 1,
                            },
                            {
                                price: 45,
                                pricebook: 'usd-m-list-prices',
                                quantity: 1,
                            },
                        ],
                        variationValues: {
                            color: 'JJ887XX',
                        },
                    },
                ],
                variationAttributes: [
                    {
                        id: 'color',
                        name: 'Color',
                        values: [
                            {
                                name: 'Gold',
                                orderable: true,
                                value: 'JJ887XX',
                            },
                        ],
                    },
                ],
                variationValues: {
                    color: 'JJ887XX',
                },
                c_color: 'JJ887XX',
                c_isNewtest: true,
                c_refinementColor: 'yellow',
                c_size: '010',
                c_width: 'H',
            },
            quantity: 1,
        },
    ],
    currency: 'USD',
    id: 'womens-jewelry-bundleM',
    inventories: [
        {
            ats: 9975,
            backorderable: false,
            id: 'inventory_m',
            inStockDate: '2025-07-18T00:00:00.000Z',
            orderable: true,
            preorderable: false,
            stockLevel: 9966,
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
    minOrderQuantity: 1,
    name: 'Turquoise Jewelry Bundle',
    pageMetaTags: [
        {
            id: 'description',
            value: 'Buy Turquoise Jewelry Bundle at RefArchGlobal.',
        },
        {
            id: 'robots',
            value: 'index, follow',
        },
        {
            id: 'og:url',
            value: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.store/s/RefArchGlobal/dw/shop/v99_9/products/womens-jewelry-bundleM?currency=USD&locale=en-US&expand=availability,promotions,options,images,prices,variations,set_products,bundled_products,page_meta_tags&all_images=true',
        },
        {
            id: 'title',
            value: 'Buy Turquoise Jewelry Bundle for USD 113.00 | RefArchGlobal',
        },
    ],
    price: 113,
    pricePerUnit: 113,
    primaryCategoryId: 'womens-jewelry-earrings',
    slugUrl:
        'https://zzrf-001.dx.commercecloud.salesforce.com/s/RefArchGlobal/en_US/product/womens-jewelry-bundlem/womens-jewelry-bundleM.html',
    stepQuantity: 1,
    type: {
        bundle: true,
    },
    tieredPrices: [
        {
            price: 113,
            pricebook: 'usd-m-list-prices',
            quantity: 1,
        },
    ],
    c_availableForInStorePickup: true,
    c_isNewtest: false,
    c_isSale: false,
};

export { bundleProductWithInventories };
