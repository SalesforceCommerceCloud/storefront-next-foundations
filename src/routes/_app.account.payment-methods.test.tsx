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

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, Outlet } from 'react-router';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { AllProvidersWrapper } from '@/test-utils/context-provider';

const { t } = getTranslation();

let capturedPaymentMethodsProps: { customer: any } = { customer: undefined };

vi.mock('@/components/payment-methods', () => ({
    PaymentMethods: (props: { customer: any }) => {
        capturedPaymentMethodsProps = props;
        return <div data-testid="payment-methods" />;
    },
    AccountPaymentMethodsSkeleton: () => <div data-testid="payment-methods-skeleton" />,
}));

vi.mock('@/components/seo-meta', () => ({
    SeoMeta: ({ title, noIndex }: { title: string; noIndex?: boolean }) => (
        <div data-testid="seo-meta" data-title={title} data-no-index={String(noIndex)} />
    ),
}));

const mockCustomer = {
    customerId: 'cust-456',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    paymentInstruments: [
        {
            paymentInstrumentId: 'pi-1',
            paymentMethodId: 'CREDIT_CARD',
            paymentCard: { cardType: 'Visa', maskedNumber: '************1111' },
        },
    ],
};

describe('Payment Methods page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedPaymentMethodsProps = { customer: undefined };
    });

    async function renderRoute(customerPromise: Promise<any>) {
        const PaymentMethodsRoute = (await import('./_app.account.payment-methods')).default;

        const router = createMemoryRouter(
            [
                {
                    path: '/account/payment-methods',
                    element: <Outlet context={{ customer: customerPromise }} />,
                    children: [
                        {
                            index: true,
                            element: <PaymentMethodsRoute />,
                        },
                    ],
                },
            ],
            { initialEntries: ['/account/payment-methods'] }
        );

        return render(
            <AllProvidersWrapper>
                <RouterProvider router={router} />
            </AllProvidersWrapper>
        );
    }

    test('displays saved payment methods once customer data loads', async () => {
        await renderRoute(Promise.resolve(mockCustomer));

        await waitFor(() => {
            expect(screen.getByTestId('payment-methods')).toBeInTheDocument();
        });

        expect(capturedPaymentMethodsProps.customer).toEqual(mockCustomer);
    });

    test('displays payment methods section for a guest with no customer data', async () => {
        await renderRoute(Promise.resolve(null));

        await waitFor(() => {
            expect(screen.getByTestId('payment-methods')).toBeInTheDocument();
        });

        expect(capturedPaymentMethodsProps.customer).toBeNull();
    });

    test('shows a loading skeleton while customer data is being fetched', async () => {
        const pendingPromise = new Promise<any>(() => {});
        await renderRoute(pendingPromise);

        expect(screen.getByTestId('payment-methods-skeleton')).toBeInTheDocument();
        expect(screen.queryByTestId('payment-methods')).not.toBeInTheDocument();
    });

    test('sets the page title to Payment Methods and hides from search engines', async () => {
        await renderRoute(Promise.resolve(mockCustomer));

        const seoMeta = screen.getByTestId('seo-meta');
        expect(seoMeta).toHaveAttribute('data-title', t('account:meta.paymentMethodsTitle'));
        expect(seoMeta).toHaveAttribute('data-no-index', 'true');
    });
});
