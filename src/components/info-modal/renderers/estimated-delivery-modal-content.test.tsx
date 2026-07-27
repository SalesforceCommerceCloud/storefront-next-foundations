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

import type React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EstimatedDeliveryModalContent } from './estimated-delivery-modal-content';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig, mockSiteObject } from '@/test-utils/config';
import { SiteProvider, type Site } from '@salesforce/storefront-next-runtime/site-context';
import type { EstimatedDeliveryData } from '@/extensions/shipping-delivery/lib/api/shipping-delivery.server';

const mockSite: Site = mockSiteObject;

const mockLocale =
    mockSite.supportedLocales.find((l) => l.id === mockSite.defaultLocale) ?? mockSite.supportedLocales[0];

const mockData: EstimatedDeliveryData = {
    title: 'Fulfillment & Shipping',
    estimatedDelivery: {
        options: [
            { name: 'Standard Shipping', deliveryTime: '5-7 business days' },
            { name: 'Express Shipping', deliveryTime: '2-3 business days' },
        ],
        note: 'Delivery times may vary.',
    },
    shippingOptions: [
        { name: 'Standard', deliveryTime: '5-7 business days', cost: 0, condition: 'Orders over $50' },
        { name: 'Express', deliveryTime: '2-3 business days', cost: 9.99 },
    ],
    internationalShipping: {
        heading: 'International Shipping',
        points: ['We ship worldwide.'],
        note: 'Enter address at checkout for rates.',
    },
    orderTracking: {
        heading: 'Order Tracking',
        points: ['Track your order online.'],
    },
};

const renderWithConfig = (ui: React.ReactElement) =>
    render(
        <ConfigProvider config={mockConfig}>
            <SiteProvider
                site={mockSite}
                locale={mockLocale}
                language={mockSiteObject.defaultLocale}
                currency={mockSiteObject.defaultCurrency}>
                {ui}
            </SiteProvider>
        </ConfigProvider>
    );

describe('EstimatedDeliveryModalContent', () => {
    it('renders all sections', () => {
        renderWithConfig(<EstimatedDeliveryModalContent deliveryData={mockData} currency="USD" />);

        expect(screen.getByText(/Standard Shipping/)).toBeInTheDocument();
        expect(screen.getByText(/Express Shipping/)).toBeInTheDocument();
        expect(screen.getByText('International Shipping')).toBeInTheDocument();
        expect(screen.getByText('Order Tracking')).toBeInTheDocument();
    });

    it('renders free label for zero-cost shipping', () => {
        renderWithConfig(<EstimatedDeliveryModalContent deliveryData={mockData} currency="USD" />);

        expect(screen.getByText('Free')).toBeInTheDocument();
    });

    it('renders formatted cost for paid shipping', () => {
        renderWithConfig(<EstimatedDeliveryModalContent deliveryData={mockData} currency="USD" />);

        expect(screen.getByText('$9.99')).toBeInTheDocument();
    });

    it('renders notes when provided', () => {
        renderWithConfig(<EstimatedDeliveryModalContent deliveryData={mockData} currency="USD" />);

        expect(screen.getByText('Delivery times may vary.')).toBeInTheDocument();
        expect(screen.getByText('Enter address at checkout for rates.')).toBeInTheDocument();
    });

    it('renders condition text for shipping options', () => {
        renderWithConfig(<EstimatedDeliveryModalContent deliveryData={mockData} currency="USD" />);

        expect(screen.getByText('Orders over $50')).toBeInTheDocument();
    });
});
