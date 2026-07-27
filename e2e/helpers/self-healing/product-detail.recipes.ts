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
 * Product Title (PDP) - Main product title on detail page
 * Primary: [data-testid*="product-title"], h1[class*="product"], h1
 */
export const productTitlePdpRecipe: HealingRecipe = {
    name: 'productTitle',
    description: 'Product title on product detail page',
    selectors: [
        '[data-testid*="product-title"]',
        'h1[class*="product"]',
        'h1[itemprop="name"]',
        'main h1',
        '[class*="product-name"] h1',
    ],
    context: 'Main heading on product detail page',
    fallbackStrategy: 'Look for h1 element in main content area',
};

/**
 * Product Price (PDP) - Price display on detail page
 * Primary: [data-testid*="price"], [class*="price"]
 */
export const productPricePdpRecipe: HealingRecipe = {
    name: 'productPrice',
    description: 'Product price on product detail page',
    selectors: ['[data-testid*="price"]', '[class*="price"]', '[itemprop="price"]', 'span[class*="currency"]'],
    context: 'Price display on product detail page',
    fallbackStrategy: 'Look for elements with price attributes or currency symbols',
};

/**
 * Variant Groups - Containers for variant options
 * Primary: [role="radiogroup"]
 */
export const variantGroupsRecipe: HealingRecipe = {
    name: 'variantGroups',
    description: 'Variant group containers (Size, Color, etc.)',
    selectors: [
        '[role="radiogroup"]', // Primary - actual HTML pattern
        '[data-testid*="variant-group"]',
        '[class*="variant-group"]',
        'div[aria-label*="Size"]',
        'div[aria-label*="Color"]',
    ],
    context: 'Containers for variant options, typically with aria-label indicating variant type',
    fallbackStrategy: 'Look for elements with role="radiogroup" or containing variant options',
};

/**
 * Variant Links - Link-based variant selectors
 * Primary: a[role="radio"]
 */
export const variantLinksRecipe: HealingRecipe = {
    name: 'variantLinks',
    description: 'Link-based variant selectors (size, color)',
    selectors: [
        'a[role="radio"]', // Primary - actual HTML pattern
        '[role="radiogroup"] a',
        'a[aria-label][href*="size="]',
        'a[aria-label][href*="color="]',
        '[class*="variant"] a',
    ],
    context: 'Clickable links for selecting product variants, each option is a separate link with query params',
    fallbackStrategy: 'Look for links with role="radio" or links within radiogroup containers',
};

/**
 * Variant Buttons - Swatch/button style variant selectors (fallback)
 * Primary: button[data-testid*="variant"], button[data-testid*="size"]
 */
export const variantButtonsRecipe: HealingRecipe = {
    name: 'variantButtons',
    description: 'Variant selector buttons (size, color swatches) - legacy pattern',
    selectors: [
        'button[data-testid*="variant"]',
        'button[data-testid*="size"]',
        'button[data-testid*="color"]',
        'button[class*="swatch"]',
        'button[role="radio"]',
        '[class*="variant"] button',
    ],
    context: 'Clickable buttons for selecting product variants (size, color, etc.) - fallback for non-link patterns',
    fallbackStrategy: 'Look for buttons with variant/swatch attributes or radio role',
};

/**
 * Variant Dropdowns - Select-style variant selectors
 * Primary: select[data-testid*="variant"], select[data-testid*="size"]
 */
export const variantDropdownsRecipe: HealingRecipe = {
    name: 'variantDropdowns',
    description: 'Variant selector dropdowns',
    selectors: [
        'select[data-testid*="variant"]',
        'select[data-testid*="size"]',
        'select[data-testid*="color"]',
        '[class*="variant"] select',
        'select[aria-label*="size" i]',
        'select[aria-label*="color" i]',
    ],
    context: 'Dropdown selectors for product variants',
    fallbackStrategy: 'Look for select elements with variant-related attributes',
};

/**
 * Quantity Input - Product quantity selector
 * Primary: input[data-testid*="quantity"], input[type="number"]
 */
export const quantityInputRecipe: HealingRecipe = {
    name: 'quantityInput',
    description: 'Quantity input field',
    selectors: [
        'input[data-testid*="quantity"]',
        'input[type="number"]',
        'input[aria-label*="quantity" i]',
        '[class*="quantity"] input',
    ],
    context: 'Number input for selecting product quantity',
    fallbackStrategy: 'Look for number input with quantity attributes',
};

/**
 * Add to Cart Button - Primary CTA on PDP
 * Primary: button[data-testid*="add-to-cart"]
 */
export const addToCartButtonRecipe: HealingRecipe = {
    name: 'addToCartButton',
    description: 'Add to Cart button on product detail page',
    selectors: [
        'button[data-testid*="add-to-cart"]',
        'button:has-text("Add to Cart")',
        'button:has-text("Add to Bag")',
        'button[aria-label*="add to cart" i]',
        '[class*="add-to-cart"] button',
    ],
    context: 'Primary CTA button on PDP to add product to cart',
    fallbackStrategy: 'Look for button with "add to cart" or "add to bag" text',
};

/**
 * Mini Cart Drawer - Opens when item is successfully added to cart
 * Primary: [data-slot="sheet-content"][data-state="open"]
 */
export const miniCartDrawerRecipe: HealingRecipe = {
    name: 'miniCartDrawer',
    description: 'Mini cart drawer that opens after adding item to cart',
    selectors: [
        '[data-slot="sheet-content"][data-state="open"]',
        '[data-testid*="mini-cart"][data-state="open"]',
        '[data-testid*="cart-drawer"][data-state="open"]',
        '[role="dialog"][data-state="open"]:has-text("Cart")',
        'aside[data-state="open"]:has-text("Cart")',
    ],
    context: 'Drawer/sheet component that displays cart contents after successful add-to-cart',
    fallbackStrategy: 'Look for cart drawer/dialog element with data-state="open"',
};
