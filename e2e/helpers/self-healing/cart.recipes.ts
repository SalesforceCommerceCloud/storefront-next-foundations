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

import type { HealingRecipe } from './types';

/**
 * Cart Items - Individual items in cart
 * Primary: [data-testid*="product-item"] (actual HTML: data-testid="sf-product-item-...")
 */
export const cartItemsRecipe: HealingRecipe = {
    name: 'cartItems',
    description: 'Individual cart items on cart page',
    selectors: [
        '[data-testid*="product-item"]', // Actual HTML pattern
        '[data-testid*="cart-item"]',
        '[class*="cart-item"]',
        '[data-testid*="line-item"]',
        '[class*="line-item"]',
        '[role="listitem"][class*="cart"]',
    ],
    context: 'Individual product entries in shopping cart, typically with data-testid="sf-product-item-..."',
    fallbackStrategy: 'Look for repeated elements with data-testid containing "product-item" or "cart-item"',
};

/**
 * Item Title (Cart) - Product name in cart
 * Primary: h2 a (actual HTML structure)
 */
export const itemTitleCartRecipe: HealingRecipe = {
    name: 'itemTitle',
    description: 'Product title in cart item',
    selectors: [
        'h2 a', // Actual HTML: <h2><a>Product Name</a></h2>
        'h3 a',
        '[data-testid*="product-title"]',
        '[data-testid*="item-title"]',
        'h2',
        'h3',
        '[class*="product-name"]',
        '[class*="item-name"]',
        'a[title]', // Links with title attribute
    ],
    context: 'Product name displayed in cart line item, typically as a link within h2/h3',
    fallbackStrategy: 'Look for heading elements with links or title attributes within cart items',
};

/**
 * Item Quantity (Cart) - Quantity in cart
 * Primary: input[type="number"][aria-label*="Quantity"]
 */
export const itemQuantityCartRecipe: HealingRecipe = {
    name: 'itemQuantity',
    description: 'Product quantity in cart item',
    selectors: [
        'input[type="number"][aria-label*="Quantity"]', // Actual HTML pattern
        'input[type="number"][aria-label*="quantity" i]',
        '[data-testid*="quantity"]',
        'input[type="number"]',
        '[class*="quantity"]',
        'input[value][min="0"]', // Number input with value and min attributes
    ],
    context: 'Quantity input in cart line item, typically a number input with aria-label containing "Quantity"',
    fallbackStrategy: 'Look for number input with quantity-related attributes in cart item',
};

/**
 * Item Price (Cart) - Product price in cart
 * Primary: [aria-label*="Current price"]
 */
export const itemPriceCartRecipe: HealingRecipe = {
    name: 'itemPrice',
    description: 'Product price in cart item',
    selectors: [
        '[aria-label*="Current price"]', // Actual HTML: aria-label="Current price: $299.99"
        '[data-testid*="price"]',
        '[data-testid*="item-price"]',
        '[class*="price"]',
        'span[aria-label*="price" i]',
        '[data-testid*="product-price"]',
    ],
    context: 'Product price displayed in cart line item, typically with aria-label containing "Current price"',
    fallbackStrategy: 'Look for elements with price-related attributes or currency symbols in cart item',
};

/**
 * Checkout Button - Continue to checkout CTA
 * Primary: button[data-testid*="checkout"], button:has-text("Checkout")
 */
export const checkoutButtonRecipe: HealingRecipe = {
    name: 'checkoutButton',
    description: 'Checkout button on cart page',
    selectors: [
        'button[data-testid*="checkout"]',
        'button:has-text("Checkout")',
        'a:has-text("Checkout")',
        'button[aria-label*="checkout" i]',
        '[class*="checkout"] button',
    ],
    context: 'Primary CTA to continue to checkout from cart',
    fallbackStrategy: 'Look for button/link with "checkout" text',
};

/**
 * Empty Cart Message - No items in cart state
 * Primary: [data-testid*="empty-cart"], :has-text("Your cart is empty")
 */
export const emptyCartMessageRecipe: HealingRecipe = {
    name: 'emptyCartMessage',
    description: 'Empty cart message',
    selectors: [
        '[data-testid*="empty-cart"]',
        ':has-text("Your cart is empty")',
        ':has-text("No items in cart")',
        '[class*="empty-cart"]',
    ],
    context: 'Message shown when shopping cart is empty',
    fallbackStrategy: 'Look for text indicating empty cart state',
};
