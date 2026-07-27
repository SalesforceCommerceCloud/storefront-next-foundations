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
import type { ShopperBasketsV2 } from '@/scapi';

// Loose-cast at the export boundary. The ShopperBaskets schema has tightened
// over time; this snapshot predates the current shape but is still valid
// fixture data for stories. Casting via unknown preserves the loose contract
// the original `.d.ts` shim provided.

const emptyBasket = {
    adjustedMerchandizeTotalTax: 0.0,
    adjustedShippingTotalTax: 0.0,
    agentBasket: false,
    basketId: 'c782cf7565ac4a08a0df478e8a',
    channelType: 'storefront',
    creationDate: '2025-09-17T21:27:30.963Z',
    currency: 'GBP',
    customerInfo: {
        customerId: 'ablec0xKxFlbcRmrk0wWYYk0dJ',
        email: '',
    },
    lastModified: '2025-09-17T21:27:30.980Z',
    merchandizeTotalTax: 0.0,
    notes: {},
    orderTotal: 0.0,
    productSubTotal: 0.0,
    productTotal: 0.0,
    shipments: [
        {
            adjustedMerchandizeTotalTax: 0.0,
            adjustedShippingTotalTax: 0.0,
            gift: false,
            merchandizeTotalTax: 0.0,
            productSubTotal: 0.0,
            productTotal: 0.0,
            shipmentId: 'me',
            shipmentTotal: 0.0,
            shippingStatus: 'not_shipped',
            shippingTotal: 0.0,
            shippingTotalTax: 0.0,
            taxTotal: 0.0,
        },
    ],
    shippingItems: [
        {
            adjustedTax: 0.0,
            basePrice: 0.0,
            itemId: '89d489855c0da95035e7cfeaa9',
            itemText: 'Shipping',
            price: 0.0,
            priceAfterItemDiscount: 0.0,
            shipmentId: 'me',
            tax: 0.0,
            taxBasis: 0.0,
            taxClassId: 'CustomRate',
            taxRate: 0.0,
        },
    ],
    shippingTotal: 0.0,
    shippingTotalTax: 0.0,
    taxation: 'gross',
    taxTotal: 0.0,
};

export default emptyBasket as unknown as ShopperBasketsV2.schemas['Basket'];
