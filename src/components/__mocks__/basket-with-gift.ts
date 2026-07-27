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

/**
 * Basket with a single line item flagged as a gift. Mirrors the resolved cart
 * loader payload — the same `Basket` shape `_app.cart.tsx` exposes to
 * `<CartContent>`, with `gift: true` set on the single product item so the
 * gift checkbox renders pre-checked.
 */
const basketWithGift = {
    adjustedMerchandizeTotalTax: 1.83,
    adjustedShippingTotalTax: null,
    agentBasket: false,
    basketId: 'gift-basket-1',
    channelType: 'storefront',
    creationDate: '2025-09-18T19:37:43.207Z',
    currency: 'GBP',
    customerInfo: {
        customerId: 'gift-customer',
        email: '',
    },
    lastModified: '2025-09-18T19:41:20.578Z',
    merchandizeTotalTax: 1.83,
    notes: {},
    orderTotal: null,
    productItems: [
        {
            adjustedTax: 1.83,
            basePrice: 19.19,
            bonusProductLineItem: false,
            gift: true,
            itemId: 'gift-line-1',
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
    ],
    productSubTotal: 38.38,
    productTotal: 38.38,
    shipments: [
        {
            adjustedMerchandizeTotalTax: 1.83,
            adjustedShippingTotalTax: null,
            gift: false,
            merchandizeTotalTax: 1.83,
            productSubTotal: 38.38,
            productTotal: 38.38,
            shipmentId: 'me',
            shipmentTotal: null,
            shippingStatus: 'not_shipped',
            shippingTotal: null,
            shippingTotalTax: null,
            taxTotal: null,
        },
    ],
    shippingTotal: null,
    shippingTotalTax: null,
    taxation: 'gross',
    taxTotal: null,
};

export default basketWithGift as unknown as ShopperBasketsV2.schemas['Basket'];
