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

/**
 * Recipes for order details page (/account/orders/:orderNo):
 * Detailed order information, items, shipping, and payment details.
 */

import type { HealingRecipe } from './types';

// ─── Page Elements ────────────────────────────────────────────────────────────

/**
 * Back to Orders Link - Navigation back to order list
 * Primary: a[href="/account/orders"]
 */
export const backToOrdersLinkRecipe: HealingRecipe = {
    name: 'backToOrdersLink',
    description: 'Link to navigate back to order list page',
    selectors: [
        'a[href="/account/orders"]', // Primary - exact href
        'a:has-text("Back to Order History")', // Link with specific text
        'a:has-text("< ")', // Link with back arrow prefix
        '[class*="back-link"]', // Back link class
        'a[href*="/account/orders"]:not([href*="/account/orders/"])', // Order list href without order number
    ],
    context: 'Back navigation link at top of order details page',
    fallbackStrategy: 'Look for link with "Back" text pointing to /account/orders',
};

/**
 * Page Title - "Order Details" heading
 * Primary: h1 with text "Order Details"
 */
export const orderDetailsPageTitleRecipe: HealingRecipe = {
    name: 'pageTitle',
    description: 'Main heading "Order Details" on order details page',
    selectors: [
        'h1:has-text("Order Details")', // Primary - h1 with specific text
        'h1.text-2xl', // h1 with large text class
        'main h1', // First h1 in main content
        '[role="main"] h1', // h1 in semantic main area
        'h1[class*="font-bold"]', // Bold h1
    ],
    context: 'Main page heading at top of order details page',
    fallbackStrategy: 'Look for h1 with "Order Details" text or first h1 in main content',
};

/**
 * Order Number - Order number display with # prefix
 * Primary: p.text-base.font-medium with "Order #" text
 */
export const orderNumberRecipe: HealingRecipe = {
    name: 'orderNumber',
    description: 'Order number display (e.g., "Order #12345")',
    selectors: [
        'p.text-base.font-medium:has-text("Order #")', // Primary - specific classes and text
        'p:has-text("Order #")', // Any paragraph with Order #
        '[class*="order-number"]', // Order number class
        'span:has-text("Order #")', // Span with Order #
        'p.text-muted-foreground:has-text("#")', // Muted paragraph with #
    ],
    context: 'Order number display below page title',
    fallbackStrategy: 'Look for text containing "Order #" followed by order number',
};

/**
 * Order Status Badge - Status indicator badge
 * Primary: [data-testid="order-status-badge"]
 */
export const orderStatusBadgeRecipe: HealingRecipe = {
    name: 'orderStatusBadge',
    description: 'Status badge showing order state (e.g., Shipped, Delivered)',
    selectors: [
        '[data-testid="order-status-badge"]', // Primary - data-testid
        'span.inline-flex.bg-primary\\/10', // Specific Tailwind classes (escaped /)
        'span[class*="bg-primary"]', // Contains bg-primary
        '[class*="status-badge"]', // Status badge class
        'span[class*="inline-flex"][class*="px-3"]', // Badge-like inline flex with padding
    ],
    context: 'Colored badge showing current order status',
    fallbackStrategy: 'Look for badge/span with status text and primary background color',
};

/**
 * Shipping status badge (per shipment row) — optional; only when API returns shippingStatus
 * Primary: [data-testid="shipping-status-badge"]
 */
export const shippingStatusBadgeRecipe: HealingRecipe = {
    name: 'shippingStatusBadge',
    description: 'Per-shipment shipping status badge (e.g. Shipped, Not shipped)',
    selectors: ['[data-testid="shipping-status-badge"]', '[data-shipment-id] [data-testid="shipping-status-badge"]'],
    context: 'Badge on shipment header row next to Shipment N label',
    fallbackStrategy: 'Look for data-testid shipping-status-badge within a shipment section',
};

// ─── Items Ordered Section ────────────────────────────────────────────────────

/**
 * Items Ordered Heading - Section heading
 * Primary: h2 with text "Items Ordered"
 */
export const itemsOrderedHeadingRecipe: HealingRecipe = {
    name: 'itemsOrderedHeading',
    description: 'Items Ordered section heading',
    selectors: [
        'h2:has-text("Items Ordered")', // Primary - h2 with specific text
        'h2.text-lg', // h2 with large text
        'h2[class*="font-semibold"]', // Semibold h2
        '[class*="items-heading"]', // Items heading class
    ],
    context: 'Heading for order items section',
    fallbackStrategy: 'Look for h2 with "Items Ordered" text',
};

/**
 * Shipment Container - Individual shipment section
 * Primary: [data-shipment-id]
 */
export const shipmentContainerRecipe: HealingRecipe = {
    name: 'shipmentContainer',
    description: 'Container for individual shipment with items',
    selectors: [
        '[data-shipment-id]', // Primary - data attribute
        '[class*="shipment"]', // Shipment class
        'div:has(p:has-text("Shipment"))', // Div containing Shipment text
    ],
    context: 'Section containing items for a specific shipment',
    fallbackStrategy: 'Look for element with data-shipment-id attribute',
};

/**
 * Order Item - Individual product line item (li element)
 * Primary: [data-testid="order-item"]
 */
export const orderItemRecipe: HealingRecipe = {
    name: 'orderItem',
    description: 'Individual product line item in order items list',
    selectors: [
        '[data-testid="order-item"]', // Primary - data-testid
        'ul li', // List item in unordered list
        'li:has([class*="product"])', // List item with product class
        'li:has(img)', // List item with image (product thumbnail)
        '[class*="order-item"]', // Order item class
        'li[class*="flex"]', // Flex list item (common layout)
    ],
    context: 'Individual product item row showing image, name, variant, quantity, and price',
    fallbackStrategy: 'Look for li elements containing product information with image',
};

/**
 * Shipping Address Card - Shipping address display
 * Primary: [data-card="shipping-address"]
 */
export const shippingAddressCardRecipe: HealingRecipe = {
    name: 'shippingAddressCard',
    description: 'Card displaying shipping address for shipment',
    selectors: [
        '[data-card="shipping-address"]', // Primary - data attribute
        '[class*="shipping-address"]', // Shipping address class
        'div:has(p:has-text("Shipping Address"))', // Contains Shipping Address text
    ],
    context: 'Card showing where the shipment will be/was delivered',
    fallbackStrategy: 'Look for card with "Shipping Address" heading',
};

/**
 * Tracking Number Card - Tracking number display
 * Primary: [data-card="tracking-number"]
 */
export const trackingNumberCardRecipe: HealingRecipe = {
    name: 'trackingNumberCard',
    description: 'Card displaying tracking number for shipment',
    selectors: [
        '[data-card="tracking-number"]', // Primary - data attribute
        '[class*="tracking-number"]', // Tracking number class
        'div:has(p:has-text("Tracking Number"))', // Contains Tracking Number text
    ],
    context: 'Card showing shipment tracking number',
    fallbackStrategy: 'Look for card with "Tracking Number" heading',
};

// ─── Order Summary Section ────────────────────────────────────────────────────

/**
 * Order Summary Heading - Section heading
 * Primary: h3 with text "Order Summary"
 */
export const orderSummaryHeadingRecipe: HealingRecipe = {
    name: 'orderSummaryHeading',
    description: 'Order Summary section heading',
    selectors: [
        'h3:has-text("Order Summary")', // Primary - h3 with specific text
        'h2:has-text("Order Summary")', // h2 variant
        'h3.text-lg', // h3 with large text
        '[class*="summary-heading"]', // Summary heading class
    ],
    context: 'Heading for order totals and pricing summary',
    fallbackStrategy: 'Look for h3 with "Order Summary" text',
};

/**
 * Order Summary Card - Pricing breakdown container
 * Primary: div containing OrderSummary component
 */
export const orderSummaryCardRecipe: HealingRecipe = {
    name: 'orderSummaryCard',
    description: 'Card containing order pricing breakdown',
    selectors: [
        '[data-testid*="order-summary"]', // Test ID
        '[class*="order-summary"]', // Order summary class
        'div:has(dt:has-text("Subtotal"))', // Contains Subtotal text
        'dl', // Definition list (commonly used for pricing)
    ],
    context: 'Summary card showing subtotal, shipping, tax, and total',
    fallbackStrategy: 'Look for container with pricing information (Subtotal, Tax, Total)',
};

// ─── Loading States ───────────────────────────────────────────────────────────

/**
 * Order Skeleton - Loading skeleton animation
 * Primary: .animate-pulse
 */
export const orderSkeletonRecipe: HealingRecipe = {
    name: 'orderSkeleton',
    description: 'Loading skeleton shown while order details are fetching',
    selectors: [
        '.animate-pulse', // Primary - Tailwind pulse animation
        '[class*="skeleton"]', // Skeleton class
        '[class*="loading"]', // Loading class
        '[data-testid*="skeleton"]', // Skeleton test ID
        '[aria-busy="true"]', // ARIA busy state
    ],
    context: 'Animated placeholder showing while order data loads',
    fallbackStrategy: 'Look for elements with pulse animation or skeleton/loading classes',
};

// ─── Error States ─────────────────────────────────────────────────────────────

/**
 * Order Not Found Card - Error card for non-existent orders
 * Primary: Card with "Order Not Found" text
 */
export const orderNotFoundCardRecipe: HealingRecipe = {
    name: 'orderNotFoundCard',
    description: 'Error card shown when order cannot be found',
    selectors: [
        'div:has-text("Order Not Found")', // Primary - container with text
        '[data-testid*="not-found"]', // Not found test ID
        '[class*="error-card"]', // Error card class
        '[role="alert"]:has-text("Order")', // Alert with Order text
    ],
    context: 'Error state shown when order ID is invalid',
    fallbackStrategy: 'Look for container with "Order Not Found" text',
};

/**
 * Back to Order History Button - Error state navigation
 * Primary: a[href="/account/orders"] button
 */
export const backToOrderHistoryButtonRecipe: HealingRecipe = {
    name: 'backToOrderHistoryButton',
    description: 'Button to return to order list from error state',
    selectors: [
        'a[href="/account/orders"]:has-text("Back to Order History")', // Primary - link with text
        'button:has-text("Back to Order History")', // Button variant
        'a[href="/account/orders"]:has-text("Order History")', // Shorter text
        '[class*="back-button"]', // Back button class
    ],
    context: 'Navigation button in error state to return to order list',
    fallbackStrategy: 'Look for button/link with "Order History" or "Back" text',
};

/**
 * Order Section Container - Main data section wrapper
 * Primary: [data-section="order-details"]
 */
export const orderSectionRecipe: HealingRecipe = {
    name: 'orderSection',
    description: 'Main container for order details content',
    selectors: [
        '[data-section="order-details"]', // Primary - data attribute
        'main > div', // Direct child of main
        '[role="main"] > div', // Direct child of main role
    ],
    context: 'Main content wrapper for order details page',
    fallbackStrategy: 'Look for element with data-section="order-details"',
};

// Export all recipes
export const orderDetailsRecipes: HealingRecipe[] = [
    // Navigation
    backToOrdersLinkRecipe,
    // Page elements
    orderDetailsPageTitleRecipe,
    orderNumberRecipe,
    orderStatusBadgeRecipe,
    shippingStatusBadgeRecipe,
    // Items section
    itemsOrderedHeadingRecipe,
    shipmentContainerRecipe,
    orderItemRecipe,
    shippingAddressCardRecipe,
    trackingNumberCardRecipe,
    // Summary section
    orderSummaryHeadingRecipe,
    orderSummaryCardRecipe,
    // Loading states
    orderSkeletonRecipe,
    // Error states
    orderNotFoundCardRecipe,
    backToOrderHistoryButtonRecipe,
    orderSectionRecipe,
];
