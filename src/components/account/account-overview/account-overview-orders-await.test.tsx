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
import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AccountOverviewOrdersAwait } from './index';
import type { CustomerOrdersResult } from '@/lib/api/order.server';
import type { Order } from '@/components/account/order-list';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { ConfigWrapper, mockLocale, mockSiteObject } from '@/test-utils/config';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';

const mockSite = mockSiteObject;
const { t } = getTranslation();

function renderOrdersAwait(ordersPromise: Promise<CustomerOrdersResult>) {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: (
                    <ConfigWrapper>
                        <SiteProvider
                            site={mockSite}
                            locale={mockLocale}
                            language={mockSiteObject.defaultLocale}
                            currency={mockSiteObject.defaultCurrency}>
                            <AccountOverviewOrdersAwait ordersPromise={ordersPromise} />
                        </SiteProvider>
                    </ConfigWrapper>
                ),
            },
        ],
        { initialEntries: ['/'] }
    );
    return render(<RouterProvider router={router} />);
}

describe('AccountOverviewOrdersAwait', () => {
    const sampleOrder: Order = {
        orderNo: 'ORD-RECENT',
        orderDate: '2024-09-14T10:30:00Z',
        status: 'completed',
        total: 50,
        currency: mockSiteObject.defaultCurrency,
        itemCount: 1,
        productItems: [
            {
                productId: 'p1',
                quantity: 1,
                imageUrl: 'https://example.com/p1.jpg',
                imageAlt: 'One',
                productName: 'Sample Product',
            },
        ],
    };

    test('renders rate-recent card below recent orders when orders exist', async () => {
        const ordersPromise = Promise.resolve<CustomerOrdersResult>({
            orders: [sampleOrder],
            total: 1,
            offset: 0,
            limit: 5,
        });
        renderOrdersAwait(ordersPromise);

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: t('account:overview.recentOrders.title') })).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: t('account:overview.rateRecentPurchases.title') })
            ).toBeInTheDocument();
        });
        expect(screen.getByText('Sample Product')).toBeInTheDocument();
    });

    test('does not render rate-recent card when there are no orders', async () => {
        const ordersPromise = Promise.resolve<CustomerOrdersResult>({
            orders: [],
            total: 0,
            offset: 0,
            limit: 5,
        });
        renderOrdersAwait(ordersPromise);

        await waitFor(() => {
            expect(screen.getByText(t('account:orders.empty'))).toBeInTheDocument();
        });
        expect(
            screen.queryByRole('heading', { name: t('account:overview.rateRecentPurchases.title') })
        ).not.toBeInTheDocument();
    });
});
