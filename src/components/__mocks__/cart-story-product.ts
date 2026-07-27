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

/**
 * Shared product fixture for cart-domain Storybook stories. Deliberately
 * carries `imageGroups: []` so the component's "No image" placeholder
 * renders — the SCAPI demo CDN URLs that other fixtures use frequently 404
 * in Storybook's headless build, producing broken thumbnails in the canvas.
 *
 * Stories that need a specific edge case (e.g. long product name, high
 * quantity, at-stock-limit) spread this base and override the relevant
 * field — the controls panel can do the same at review time.
 */
export type CartStoryProduct = ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>;

export const mockCartLineProduct: CartStoryProduct = {
    itemId: 'mock-cart-line-1',
    productId: 'mock-product-1',
    productName: 'Sample Product',
    quantity: 1,
    basePrice: 20.0,
    price: 20.0,
    priceAfterItemDiscount: 15.0,
    variationValues: {
        color: 'Grey',
        size: 'XL',
    },
    variationAttributes: [
        {
            id: 'color',
            name: 'Color',
            values: [{ value: 'Grey', name: 'Grey' }],
        },
        {
            id: 'size',
            name: 'Size',
            values: [{ value: 'XL', name: 'XL' }],
        },
    ],
    imageGroups: [],
};
