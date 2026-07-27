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
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type ShouldRevalidateFunctionArgs } from 'react-router';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import { resourceRoutes } from '@/route-paths';
import { shouldRevalidate } from './_app.account';

vi.mock('@/middlewares/auth.server', () => ({
    getAuth: vi.fn(),
}));

describe('_app.account shouldRevalidate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('returns false when formAction targets the SCAPI resource route', () => {
        const result = shouldRevalidate({
            formAction: '/resource/api/client/shopperCustomers/updateCustomer',
            defaultShouldRevalidate: true,
        } as unknown as ShouldRevalidateFunctionArgs);

        expect(result).toBe(false);
    });

    test('returns false for password update via SCAPI resource route', () => {
        const result = shouldRevalidate({
            formAction: '/resource/api/client/shopperCustomers/updateCustomerPassword',
            defaultShouldRevalidate: true,
        } as unknown as ShouldRevalidateFunctionArgs);

        expect(result).toBe(false);
    });

    test('returns defaultShouldRevalidate for non-SCAPI form actions', () => {
        const result = shouldRevalidate({
            formAction: '/login',
            defaultShouldRevalidate: true,
        } as unknown as ShouldRevalidateFunctionArgs);

        expect(result).toBe(true);
    });

    test('returns defaultShouldRevalidate when formAction is undefined', () => {
        const result = shouldRevalidate({
            formAction: undefined,
            defaultShouldRevalidate: false,
        } as unknown as ShouldRevalidateFunctionArgs);

        expect(result).toBe(false);
    });

    test('returns false regardless of defaultShouldRevalidate for SCAPI actions', () => {
        const result = shouldRevalidate({
            formAction: '/resource/api/client/shopperCustomers/updateCustomer',
            defaultShouldRevalidate: false,
        } as unknown as ShouldRevalidateFunctionArgs);

        expect(result).toBe(false);
    });

    test('respects defaultShouldRevalidate=false for non-SCAPI actions', () => {
        const result = shouldRevalidate({
            formAction: resourceRoutes.cartItemAdd,
            defaultShouldRevalidate: false,
        } as unknown as ShouldRevalidateFunctionArgs);

        expect(result).toBe(false);
    });

    test('returns false when formAction targets otp-verify', () => {
        const result = shouldRevalidate({
            formAction: '/action/otp-verify',
            defaultShouldRevalidate: true,
        } as unknown as ShouldRevalidateFunctionArgs);

        expect(result).toBe(false);
    });

    test('returns false when formAction targets authorize-passwordless-email', () => {
        const result = shouldRevalidate({
            formAction: '/action/authorize-passwordless-email',
            defaultShouldRevalidate: true,
        } as unknown as ShouldRevalidateFunctionArgs);

        expect(result).toBe(false);
    });

    test('returns false when formAction targets otp-request', () => {
        const result = shouldRevalidate({
            formAction: '/action/otp-request',
            defaultShouldRevalidate: true,
        } as unknown as ShouldRevalidateFunctionArgs);

        expect(result).toBe(false);
    });

    test('returns false when formAction targets verify-passwordless-otp', () => {
        const result = shouldRevalidate({
            formAction: '/action/verify-passwordless-otp',
            defaultShouldRevalidate: true,
        } as unknown as ShouldRevalidateFunctionArgs);

        expect(result).toBe(false);
    });
});

describe('AccountPage layout', () => {
    test('renders navigation and outlet', async () => {
        const AccountPage = (await import('./_app.account')).default;
        const mockCustomer = Promise.resolve({ firstName: 'John', lastName: 'Doe' });
        const mockSubscriptions = Promise.resolve(null);

        const router = createMemoryRouter(
            [
                {
                    path: '/account',
                    element: (
                        <AllProvidersWrapper>
                            <AccountPage
                                loaderData={{
                                    customer: mockCustomer,
                                    subscriptions: mockSubscriptions,
                                }}
                            />
                        </AllProvidersWrapper>
                    ),
                    children: [
                        {
                            index: true,
                            element: <div data-testid="child-route">Child content</div>,
                        },
                    ],
                },
            ],
            { initialEntries: ['/account'] }
        );

        render(<RouterProvider router={router} />);

        // Navigation renders for both mobile and desktop viewports
        const myAccountHeadings = screen.getAllByText('My Account');
        expect(myAccountHeadings.length).toBeGreaterThanOrEqual(1);
        // Child route should render via Outlet
        expect(screen.getByTestId('child-route')).toBeInTheDocument();
    });
});
