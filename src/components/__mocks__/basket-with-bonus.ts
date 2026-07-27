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
 * Basket with a qualifying product and bonus opportunity (no bonus products selected yet)
 */
export const basketWithBonusOpportunity: ShopperBasketsV2.schemas['Basket'] = {
    basketId: 'test-basket-bonus-1',
    productItems: [
        {
            itemId: 'item-1',
            productId: 'shirt-123',
            productName: 'Classic Fit Shirt',
            bonusProductLineItem: false,
            quantity: 1,
            price: 20.0,
            priceAfterItemDiscount: 20.0,
            priceAdjustments: [
                {
                    priceAdjustmentId: 'bonus-shirt-tie',
                    promotionId: 'promo-buy-one-get-tie',
                    itemText: 'Buy one Classic Fit Shirt, get 2 free ties!',
                    price: 0,
                },
            ],
        },
    ],
    bonusDiscountLineItems: [
        {
            id: 'bonus-1',
            promotionId: 'promo-buy-one-get-tie',
            maxBonusItems: 2,
            bonusProducts: [
                { productId: 'tie-red', productName: 'Red Tie' },
                { productId: 'tie-blue', productName: 'Blue Tie' },
            ],
        },
    ],
    productSubTotal: 20.0,
    productTotal: 20.0,
    orderTotal: 20.0,
};

/**
 * Basket with qualifying product and 1 bonus product already selected (partial selection)
 */
export const basketWithBonusOpportunityPartialSelection: ShopperBasketsV2.schemas['Basket'] = {
    basketId: 'test-basket-bonus-2',
    productItems: [
        {
            itemId: 'item-1',
            productId: 'shirt-123',
            productName: 'Classic Fit Shirt',
            bonusProductLineItem: false,
            quantity: 1,
            price: 20.0,
            priceAfterItemDiscount: 20.0,
            priceAdjustments: [
                {
                    priceAdjustmentId: 'bonus-shirt-tie',
                    promotionId: 'promo-buy-one-get-tie',
                    itemText: 'Buy one Classic Fit Shirt, get 2 free ties!',
                    price: 0,
                },
            ],
        },
        {
            itemId: 'item-2',
            productId: 'tie-red',
            productName: 'Red Tie',
            bonusProductLineItem: true,
            bonusDiscountLineItemId: 'bonus-1',
            quantity: 1,
            price: 0,
            priceAfterItemDiscount: 0,
        },
    ],
    bonusDiscountLineItems: [
        {
            id: 'bonus-1',
            promotionId: 'promo-buy-one-get-tie',
            maxBonusItems: 2,
            bonusProducts: [
                { productId: 'tie-red', productName: 'Red Tie' },
                { productId: 'tie-blue', productName: 'Blue Tie' },
            ],
        },
    ],
    productSubTotal: 20.0,
    productTotal: 20.0,
    orderTotal: 20.0,
};

/**
 * Basket with qualifying product and all bonus slots filled
 */
export const basketWithBonusOpportunityAllSlotsFilled: ShopperBasketsV2.schemas['Basket'] = {
    basketId: 'test-basket-bonus-3',
    productItems: [
        {
            itemId: 'item-1',
            productId: 'shirt-123',
            productName: 'Classic Fit Shirt',
            bonusProductLineItem: false,
            quantity: 1,
            price: 20.0,
            priceAfterItemDiscount: 20.0,
            priceAdjustments: [
                {
                    priceAdjustmentId: 'bonus-shirt-tie',
                    promotionId: 'promo-buy-one-get-tie',
                    itemText: 'Buy one Classic Fit Shirt, get 2 free ties!',
                    price: 0,
                },
            ],
        },
        {
            itemId: 'item-2',
            productId: 'tie-red',
            productName: 'Red Tie',
            bonusProductLineItem: true,
            bonusDiscountLineItemId: 'bonus-1',
            quantity: 1,
            price: 0,
            priceAfterItemDiscount: 0,
        },
        {
            itemId: 'item-3',
            productId: 'tie-blue',
            productName: 'Blue Tie',
            bonusProductLineItem: true,
            bonusDiscountLineItemId: 'bonus-1',
            quantity: 1,
            price: 0,
            priceAfterItemDiscount: 0,
        },
    ],
    bonusDiscountLineItems: [
        {
            id: 'bonus-1',
            promotionId: 'promo-buy-one-get-tie',
            maxBonusItems: 2,
            bonusProducts: [
                { productId: 'tie-red', productName: 'Red Tie' },
                { productId: 'tie-blue', productName: 'Blue Tie' },
            ],
        },
    ],
    productSubTotal: 20.0,
    productTotal: 20.0,
    orderTotal: 20.0,
};

/**
 * Basket with multiple qualifying products, each with their own bonus opportunities
 */
export const basketWithMultipleBonusOpportunities: ShopperBasketsV2.schemas['Basket'] = {
    basketId: 'test-basket-bonus-4',
    productItems: [
        {
            itemId: 'item-1',
            productId: 'shirt-123',
            productName: 'Classic Fit Shirt',
            bonusProductLineItem: false,
            quantity: 1,
            price: 20.0,
            priceAfterItemDiscount: 20.0,
            priceAdjustments: [
                {
                    priceAdjustmentId: 'bonus-shirt-tie',
                    promotionId: 'promo-buy-one-get-tie',
                    itemText: 'Buy one Classic Fit Shirt, get 2 free ties!',
                    price: 0,
                },
            ],
        },
        {
            itemId: 'item-2',
            productId: 'suit-456',
            productName: "Men's Classic Suit",
            bonusProductLineItem: false,
            quantity: 1,
            price: 100.0,
            priceAfterItemDiscount: 100.0,
            priceAdjustments: [
                {
                    priceAdjustmentId: 'bonus-suit-shoes',
                    promotionId: 'promo-buy-suit-get-shoes',
                    itemText: 'Buy a suit, get free shoes!',
                    price: 0,
                },
            ],
        },
        {
            itemId: 'item-3',
            productId: 'tie-red',
            productName: 'Red Tie',
            bonusProductLineItem: true,
            bonusDiscountLineItemId: 'bonus-1',
            quantity: 1,
            price: 0,
            priceAfterItemDiscount: 0,
        },
    ],
    bonusDiscountLineItems: [
        {
            id: 'bonus-1',
            promotionId: 'promo-buy-one-get-tie',
            maxBonusItems: 2,
            bonusProducts: [
                { productId: 'tie-red', productName: 'Red Tie' },
                { productId: 'tie-blue', productName: 'Blue Tie' },
            ],
        },
        {
            id: 'bonus-2',
            promotionId: 'promo-buy-suit-get-shoes',
            maxBonusItems: 1,
            bonusProducts: [
                { productId: 'shoes-black', productName: 'Black Dress Shoes' },
                { productId: 'shoes-brown', productName: 'Brown Dress Shoes' },
            ],
        },
    ],
    productSubTotal: 120.0,
    productTotal: 120.0,
    orderTotal: 120.0,
};

/**
 * Empty basket - no items, no bonus opportunities
 */
export const emptyBasketWithNoBonus: ShopperBasketsV2.schemas['Basket'] = {
    basketId: 'test-basket-empty',
    productItems: [],
    bonusDiscountLineItems: [],
    productSubTotal: 0,
    productTotal: 0,
    orderTotal: 0,
};

/**
 * Basket with regular product (no bonus opportunities)
 */
export const basketWithNonQualifyingProduct: ShopperBasketsV2.schemas['Basket'] = {
    basketId: 'test-basket-regular',
    productItems: [
        {
            itemId: 'item-1',
            productId: 'hat-789',
            productName: 'Baseball Cap',
            bonusProductLineItem: false,
            quantity: 1,
            price: 15.0,
            priceAfterItemDiscount: 15.0,
        },
    ],
    bonusDiscountLineItems: [],
    productSubTotal: 15.0,
    productTotal: 15.0,
    orderTotal: 15.0,
};
