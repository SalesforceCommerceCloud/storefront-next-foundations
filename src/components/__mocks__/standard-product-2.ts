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

export const standardProd: ShopperProducts.schemas['Product'] = {
    currency: 'USD',
    id: 'P0048M',
    imageGroups: [
        {
            images: [
                {
                    alt: 'Laptop Briefcase with wheels (37L), , large',
                    disBaseLink:
                        'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwbeefee44/images/large/P0048_001.jpg',
                    link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwbeefee44/images/large/P0048_001.jpg',
                    title: 'Laptop Briefcase with wheels (37L), ',
                },
            ],
            viewType: 'large',
        },
        {
            images: [
                {
                    alt: 'Laptop Briefcase with wheels (37L), , medium',
                    disBaseLink:
                        'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwcc8912f4/images/medium/P0048_001.jpg',
                    link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwcc8912f4/images/medium/P0048_001.jpg',
                    title: 'Laptop Briefcase with wheels (37L), ',
                },
            ],
            viewType: 'medium',
        },
        {
            images: [
                {
                    alt: 'Laptop Briefcase with wheels (37L), , small',
                    disBaseLink:
                        'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dwec87eecc/images/small/P0048_001.jpg',
                    link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dwec87eecc/images/small/P0048_001.jpg',
                    title: 'Laptop Briefcase with wheels (37L), ',
                },
            ],
            viewType: 'small',
        },
    ],
    inventory: {
        ats: 9,
        backorderable: true,
        id: 'inventory_m',
        inStockDate: '2011-08-17T00:00:00.000Z',
        orderable: true,
        preorderable: false,
        stockLevel: 0,
    },
    longDescription:
        '<ul><li>1682 ballistic nylon and genuine leather inserts</li><li>Spacious main storage compartment for documents and binders</li><li>Removable, padded laptop sleeve with D-rings for carrying with shoulder strap</li><li>Change handle system and cantilever wheels</li><li>Zip pull in gunmetal with black rubber insert Leather “comfort” insert detailed handle</li><li>Internal storage pockets for CD-Rom and peripherals</li><li>Real leather inserts</li></ul>',
    minOrderQuantity: 1,
    name: 'Laptop Briefcase with wheels (37L)',
    pageDescription:
        'Perfect for business travel, this briefcase is ultra practical with plenty of space for your laptop and all its extras.',
    pageKeywords:
        'Commerce Cloud, P0048, Packs and Gear Laptop Briefcase with Long Sleeve, Black, Wheelie Bag, Computer Bag, Cases, Luggage',
    pageMetaTags: [
        {
            id: 'description',
            value: 'Perfect for business travel, this briefcase is ultra practical with plenty of space for your laptop and all its extras.',
        },
        {
            id: 'robots',
            value: 'index, follow',
        },
        {
            id: 'og:url',
            value: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.store/s/RefArchGlobal/dw/shop/v99_9/products/P0048M?currency=USD&locale=en-US&expand=availability,promotions,options,images,prices,variations,set_products,bundled_products,page_meta_tags&all_images=true',
        },
        {
            id: 'title',
            value: 'Buy Laptop Briefcase with wheels (37L) for USD 99.99 | RefArchGlobal',
        },
    ],
    pageTitle: 'Commerce Cloud - Laptop Briefcase with wheels (37L)',
    price: 99.99,
    pricePerUnit: 99.99,
    primaryCategoryId: 'mens-accessories-luggage',
    productPromotions: [
        {
            calloutMsg: '50% off for Salesforce employees',
            promotionalPrice: 49.99,
            promotionId: 'salesforce-employees-50-off',
        },
    ],
    shortDescription:
        'Perfect for business travel, this briefcase is ultra practical with plenty of space for your laptop and all its extras, as well as storage for documents, paperwork and all your essential items. The wheeled system allows you to travel comfortably with your work and when you reach your destination, you can remove the laptop compartment and carry over your shoulder to meetings. It’s the business.',
    slugUrl:
        'https://zzrf-001.dx.commercecloud.salesforce.com/s/RefArchGlobal/en_US/laptop-briefcasewheels-37l/P0048M.html',
    stepQuantity: 1,
    type: {
        item: true,
    },
    unitQuantity: 0,
    tieredPrices: [
        {
            price: 99.99,
            pricebook: 'usd-m-list-prices',
            quantity: 1,
        },
    ],
    c_styleNumber: 'P0048',
    c_tabDescription:
        'Perfect for business travel, this briefcase is ultra practical with plenty of space for your laptop and all its extras, as well as storage for documents, paperwork and all your essential items. The wheeled system allows you to travel comfortably with your work and when you reach your destination, you can remove the laptop compartment and carry over your shoulder to meetings. It’s the business.',
    c_tabDetails:
        '<ul><li>1682 ballistic nylon and genuine leather inserts</li><li>Spacious main storage compartment for documents and binders</li><li>Removable, padded laptop sleeve with D-rings for carrying with shoulder strap</li><li>Change handle system and cantilever wheels</li><li>Zip pull in gunmetal with black rubber insert Leather “comfort” insert detailed handle</li><li>Internal storage pockets for CD-Rom and peripherals</li><li>Real leather inserts</li></ul>',
};
