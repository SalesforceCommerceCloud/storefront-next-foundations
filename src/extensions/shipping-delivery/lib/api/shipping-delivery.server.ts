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
/** @sfdc-extension-file SFDC_EXT_SHIPPING_DELIVERY */

// --- Types ---

export interface ShippingOption {
    name: string;
    deliveryTime: string;
    cost?: number;
    condition?: string;
}

export interface EstimatedDeliveryData {
    title: string;
    estimatedDelivery: {
        options: Array<{ name: string; deliveryTime: string }>;
        note: string;
    };
    shippingOptions: ShippingOption[];
    internationalShipping: {
        heading: string;
        points: string[];
        note?: string;
    };
    orderTracking: {
        heading: string;
        points: string[];
    };
}

export interface ShippingEstimate {
    delivery_date: string;
    cost: number;
    days: number;
}

// --- Mock Data ---

const MOCK_ESTIMATED_DELIVERY_DATA: EstimatedDeliveryData = {
    title: 'Fulfillment & Shipping',
    estimatedDelivery: {
        options: [
            { name: 'Standard Shipping', deliveryTime: '5-7 business days' },
            { name: 'Express Shipping', deliveryTime: '2-3 business days' },
            { name: 'Overnight Shipping', deliveryTime: 'Next business day' },
        ],
        note: 'Delivery estimates are calculated from the date your order ships. Processing time is typically 1-2 business days.',
    },
    shippingOptions: [
        {
            name: 'Standard Shipping',
            deliveryTime: '5-7 business days',
            cost: 5.99,
            condition: 'Free on orders over $50',
        },
        {
            name: 'Express Shipping',
            deliveryTime: '2-3 business days',
            cost: 12.99,
            condition: 'Free on orders over $100',
        },
        {
            name: 'Overnight Shipping',
            deliveryTime: 'Next business day',
            cost: 24.99,
            condition: 'Orders placed before 2 PM EST',
        },
    ],
    internationalShipping: {
        heading: 'International Shipping',
        points: [
            'We ship to over 50 countries worldwide. International shipping rates and delivery times vary by destination.',
            'Customs & Duties: International orders may be subject to customs fees and import duties, which are the responsibility of the customer.',
        ],
        note: 'For specific international shipping rates, please continue to checkout and enter your shipping address.',
    },
    orderTracking: {
        heading: 'Order Tracking',
        points: [
            "Once your order ships, you'll receive a confirmation email with tracking information. You can track your order status in real-time through our website or mobile app.",
            'Need Help? Contact our customer service team if you have questions about your shipment or delivery.',
        ],
    },
};

// --- API Functions ---

/**
 * Fetches estimated delivery data for a product.
 * Replace this function body with calls to your shipping provider API.
 */
export function getEstimatedDelivery(_productId?: string): Promise<EstimatedDeliveryData> {
    return Promise.resolve(MOCK_ESTIMATED_DELIVERY_DATA);
}

/**
 * Fetches shipping estimate for a product + zip code combination.
 * Replace this function body with calls to your shipping provider API.
 *
 * Mock implementation returns 3-5 day delivery estimates based on zipcode.
 * - Deterministic delivery estimates based on zipcode
 * - Error simulation for testing (zipcode 99999 always fails)
 */
export function getShippingEstimates(_productId: string, zipcode: string): Promise<ShippingEstimate> {
    if (!zipcode) {
        return Promise.reject(new Error('ZIP code is required'));
    }

    if (zipcode === '99999') {
        return Promise.reject(new Error('Delivery not available to this zipcode'));
    }

    const seed = parseInt(zipcode.slice(-2)) || 1;
    const days = (seed % 3) + 3;
    const date = new Date();
    date.setDate(date.getDate() + days);

    const lastDigit = parseInt(zipcode.slice(-1)) || 0;
    const cost = lastDigit % 2 === 0 ? 0 : 5.99;

    return Promise.resolve({
        delivery_date: date.toISOString().split('T')[0],
        cost,
        days,
    });
}
