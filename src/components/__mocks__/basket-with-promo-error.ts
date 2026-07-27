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
 * Basket with one applied order-level coupon (`SAVE10`) plus the matching
 * `orderPriceAdjustment`. Mirrors what `<PromoCodeForm>` expects:
 * - `couponItems[*].statusCode === 'applied'` for every persisted row
 * - `orderPriceAdjustments[*].couponCode` linking the discount back to the
 *   coupon item by `code`, so `AppliedCouponRow` can sum the per-coupon total
 *
 * Production `/action/promo-code-add` returns `{ success: false, error }` for
 * invalid input and never mutates the basket — so a "basket with an invalid
 * coupon row" is not a real shape the BFF emits. Stories that need to cover
 * the invalid-input UX should mock a failed apply fetcher instead.
 */
const basketWithPromoError = {
    adjustedMerchandizeTotalTax: 1.83,
    adjustedShippingTotalTax: null,
    agentBasket: false,
    basketId: 'promo-error-basket-1',
    channelType: 'storefront',
    creationDate: '2025-09-18T19:37:43.207Z',
    currency: 'GBP',
    customerInfo: {
        customerId: 'promo-error-customer',
        email: '',
    },
    lastModified: '2025-09-18T19:41:20.578Z',
    merchandizeTotalTax: 1.83,
    notes: {},
    orderTotal: null,
    couponItems: [
        {
            couponItemId: 'coupon-item-applied',
            code: 'SAVE10',
            statusCode: 'applied',
            valid: true,
        },
    ],
    orderPriceAdjustments: [
        {
            priceAdjustmentId: 'adj-coupon-applied',
            couponCode: 'SAVE10',
            itemText: '10% Off Order',
            price: -3.84,
            promotionId: 'promo-save-10',
        },
    ],
    productItems: [
        {
            adjustedTax: 1.83,
            basePrice: 19.19,
            bonusProductLineItem: false,
            gift: false,
            itemId: 'promo-error-line-1',
            itemText: 'Solid Silk Tie',
            price: 38.38,
            priceAfterItemDiscount: 38.38,
            priceAfterOrderDiscount: 34.54,
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
    productTotal: 34.54,
    shipments: [
        {
            adjustedMerchandizeTotalTax: 1.83,
            adjustedShippingTotalTax: null,
            gift: false,
            merchandizeTotalTax: 1.83,
            productSubTotal: 38.38,
            productTotal: 34.54,
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

export default basketWithPromoError as unknown as ShopperBasketsV2.schemas['Basket'];
