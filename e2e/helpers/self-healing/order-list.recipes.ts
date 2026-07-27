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
 * Recipes for order list page (/account/orders):
 * Order history display, order cards, and navigation to order details.
 */

import type { HealingRecipe } from './types';

// ─── Page Elements ────────────────────────────────────────────────────────────

/**
 * Page Title - "Order History" heading
 * Primary: h3 with text "Order History"
 */
export const orderListPageTitleRecipe: HealingRecipe = {
    name: 'pageTitle',
    description: 'Main heading "Order History" on order list page',
    selectors: [
        'h3:has-text("Order History")', // Primary - h3 with specific text
        'h1:has-text("Order History")', // Alternative h1
        'h2:has-text("Order History")', // Alternative h2
        '[class*="text-2xl"]:has-text("Order")', // Large heading with Order text
        'main h3', // First h3 in main content
        '[role="main"] h3', // h3 in semantic main area
    ],
    context: 'Main page heading at top of order history page',
    fallbackStrategy: 'Look for h3/h2/h1 with "Order History" text or first heading in main content area',
};

/**
 * Page Subtitle - Description text below title
 * Primary: p.text-muted-foreground
 */
export const orderListPageSubtitleRecipe: HealingRecipe = {
    name: 'pageSubtitle',
    description: 'Subtitle text below Order History heading',
    selectors: [
        'p.text-muted-foreground', // Primary - Tailwind muted text
        'p[class*="muted"]', // Contains muted class
        'h3 + p', // Paragraph after h3
        '[class*="subtitle"]', // Subtitle class
    ],
    context: 'Descriptive text below main Order History heading',
    fallbackStrategy: 'Look for muted paragraph text immediately after page title',
};

// ─── Order Card Elements ──────────────────────────────────────────────────────

/**
 * Order Card - Link wrapping each order card
 * Primary: a[href*="/account/orders/"]
 */
export const orderCardRecipe: HealingRecipe = {
    name: 'orderCard',
    description: 'Link element wrapping each order card in the list',
    selectors: [
        'a[href*="/account/orders/"]', // Primary - link to order details
        '[data-testid*="order-card"]', // Test ID with order-card
        '[class*="order-card"]', // Order card class
        'a[href^="/account/orders/"][href!="/account/orders"]', // Link starting with path but not exact
    ],
    context: 'Clickable link containing order summary information',
    fallbackStrategy: 'Look for links with href containing /account/orders/ with order number',
};

/**
 * First Order Card - First order in the list
 * Primary: a[href*="/account/orders/"]:first-of-type
 */
export const orderCardFirstRecipe: HealingRecipe = {
    name: 'orderCardFirst',
    description: 'First order card link in the order list',
    selectors: [
        'a[href*="/account/orders/"]', // Primary - will match first automatically
        '[data-testid*="order-card"]', // Test ID
        'a[href^="/account/orders/"]:first-of-type', // First link
    ],
    context: 'First clickable order card in the list',
    fallbackStrategy: 'Look for first link with /account/orders/ href',
};

/**
 * Order Date Label - "Order Date" text in order card
 * Primary: p.text-xs with "Order Date" text
 */
export const orderDateRecipe: HealingRecipe = {
    name: 'orderDate',
    description: 'Order Date label and value in order card',
    selectors: [
        'p.text-xs:has-text("Order Date")', // Primary - small text with Order Date
        'p:has-text("Order Date")', // Any paragraph with text
        '[class*="order-date"]', // Order date class
        'span:has-text("Order Date")', // Span with text
    ],
    context: 'Label showing when the order was placed',
    fallbackStrategy: 'Look for text containing "Order Date" in order card',
};

/**
 * Order Total Label - "Total" text in order card
 * Primary: p.text-xs with "Total" text
 */
export const orderTotalRecipe: HealingRecipe = {
    name: 'orderTotal',
    description: 'Order Total label and value in order card',
    selectors: [
        'p.text-xs:has-text("Total")', // Primary - small text with Total
        'p:has-text("Total")', // Any paragraph with text
        '[class*="order-total"]', // Order total class
        'span:has-text("Total")', // Span with text
        '[class*="price"]:has-text("Total")', // Price class with Total
    ],
    context: 'Label showing the order total amount',
    fallbackStrategy: 'Look for text containing "Total" with price value in order card',
};

/**
 * Order Items Label - "Items" text in order card
 * Primary: p.text-xs with "Items" text
 */
export const orderItemsRecipe: HealingRecipe = {
    name: 'orderItems',
    description: 'Order Items count label and value in order card',
    selectors: [
        'p.text-xs:has-text("Items")', // Primary - small text with Items
        'p:has-text("Items")', // Any paragraph with text
        '[class*="order-items"]', // Order items class
        'span:has-text("Items")', // Span with text
    ],
    context: 'Label showing the number of items in the order',
    fallbackStrategy: 'Look for text containing "Items" with count in order card',
};

/**
 * Order Status Badge - Status indicator (e.g., "Shipped", "Delivered")
 * Primary: [data-testid="order-status-badge"]
 */
export const orderStatusRecipe: HealingRecipe = {
    name: 'orderStatus',
    description: 'Order status badge showing current order state',
    selectors: [
        '[data-testid="order-status-badge"]', // Primary - data-testid
        'span.border-transparent', // Badge with transparent border
        '[class*="badge"][class*="status"]', // Badge with status class
        'span[class*="border"]', // Span with border class
        '[class*="status-badge"]', // Status badge class
    ],
    context: 'Status badge showing order state (Shipped, Delivered, etc.)',
    fallbackStrategy: 'Look for badge/span element with order status text',
};

/**
 * View Details Link - "View Order Details" link text
 * Primary: span with "View Order Details" text
 */
export const viewDetailsLinkRecipe: HealingRecipe = {
    name: 'viewDetailsLink',
    description: 'Link text to view order details',
    selectors: [
        'span:has-text("View Order Details")', // Primary - span with specific text
        'a:has-text("View Details")', // Link with shortened text
        'span:has-text("View Details")', // Span with shortened text
        '[class*="view-details"]', // View details class
        'button:has-text("View")', // Button with View text
    ],
    context: 'Clickable text to navigate to order details page',
    fallbackStrategy: 'Look for text containing "View" and "Details"',
};

// ─── Loading States ───────────────────────────────────────────────────────────

/**
 * Order List Skeleton - Loading skeleton animation
 * Primary: .animate-pulse
 */
export const orderListSkeletonRecipe: HealingRecipe = {
    name: 'orderListSkeleton',
    description: 'Loading skeleton shown while orders are fetching',
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

// ─── Empty State ──────────────────────────────────────────────────────────────

/**
 * Empty State Message - Shown when user has no orders
 * Primary: button with "Continue Shopping" text
 */
export const emptyStateMessageRecipe: HealingRecipe = {
    name: 'emptyStateMessage',
    description: 'Empty state shown when user has no order history',
    selectors: [
        'button:has-text("Continue Shopping")', // Primary - CTA button
        'a:has-text("Continue Shopping")', // Link variant
        'p:has-text("No orders")', // No orders text
        '[data-testid*="empty"]', // Empty state test ID
        '[class*="empty-state"]', // Empty state class
    ],
    context: 'Message and button shown when order list is empty',
    fallbackStrategy: 'Look for "Continue Shopping" button or "No orders" text',
};

/**
 * Total Orders Text - Footer showing total order count
 * Primary: [data-testid="total-orders-text"]
 */
export const totalOrdersTextRecipe: HealingRecipe = {
    name: 'totalOrdersText',
    description: 'Text showing total number of orders',
    selectors: [
        '[data-testid="total-orders-text"]', // Primary - data-testid
        'p.text-muted-foreground:has-text("order")', // Muted text with order
        'p:has-text("Total")', // Total text
        '[class*="order-count"]', // Order count class
        'footer p', // Paragraph in footer
    ],
    context: 'Summary text at bottom of page showing total order count',
    fallbackStrategy: 'Look for text mentioning order count or total',
};

// Export all recipes
export const orderListRecipes: HealingRecipe[] = [
    // Page elements
    orderListPageTitleRecipe,
    orderListPageSubtitleRecipe,
    // Order cards
    orderCardRecipe,
    orderCardFirstRecipe,
    orderDateRecipe,
    orderTotalRecipe,
    orderItemsRecipe,
    orderStatusRecipe,
    viewDetailsLinkRecipe,
    // Loading states
    orderListSkeletonRecipe,
    // Empty state
    emptyStateMessageRecipe,
    totalOrdersTextRecipe,
];
