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
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, Outlet } from 'react-router';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import type { ShopperCustomers } from '@/scapi';

const { t } = getTranslation();

type CustomerAddress = ShopperCustomers.schemas['CustomerAddress'];
type Customer = ShopperCustomers.schemas['Customer'];

const mockAddToast = vi.fn();
const mockSubmit = vi.fn();

vi.mock('@/components/toast', () => ({
    useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/providers/auth', () => ({
    useAuth: () => ({ customerId: 'test-customer-id' }),
}));

vi.mock('@/hooks/use-scapi-fetcher', () => ({
    useScapiFetcher: vi.fn(() => ({
        submit: mockSubmit,
        load: vi.fn(),
        data: null,
        state: 'idle',
    })),
}));

vi.mock('@/hooks/use-scapi-fetcher-effect', () => ({
    useScapiFetcherEffect: vi.fn(),
}));

vi.mock('@/components/seo-meta', () => ({
    SeoMeta: ({ title, noIndex }: { title: string; noIndex?: boolean }) => (
        <div data-testid="seo-meta" data-title={title} data-no-index={String(noIndex)} />
    ),
}));

vi.mock('@/components/account-addresses-skeleton', () => ({
    AccountAddressesSkeleton: () => <div data-testid="addresses-skeleton" />,
}));

let capturedAddressCardProps: Record<string, any> = {};

vi.mock('@/components/address-card', () => ({
    default: (props: any) => {
        capturedAddressCardProps[props.address.addressId] = props;
        return (
            <div data-testid={`address-card-${props.address.addressId}`}>
                <button onClick={props.onEdit}>Edit</button>
                <button onClick={props.onRemove}>Remove</button>
                <button onClick={props.onSetDefault}>Set Default</button>
            </div>
        );
    },
}));

let capturedAddressFormProps: any = null;

vi.mock('@/components/customer-address-form', () => ({
    CustomerAddressForm: (props: any) => {
        capturedAddressFormProps = props;
        return (
            <div data-testid="customer-address-form">
                <button data-testid="form-cancel" onClick={props.onCancel}>
                    Cancel
                </button>
            </div>
        );
    },
}));

vi.mock('@/components/remove-address-confirmation-dialog', () => ({
    RemoveAddressConfirmationDialog: ({ open, address, onOpenChange }: any) =>
        open ? (
            <div data-testid="remove-dialog">
                <span data-testid="remove-address-id">{address?.addressId}</span>
                <button data-testid="cancel-remove" onClick={() => onOpenChange(false)}>
                    Cancel
                </button>
            </div>
        ) : null,
}));

vi.mock('@/targets/ui-target', () => ({
    UITarget: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const mockAddresses: CustomerAddress[] = [
    {
        addressId: 'home',
        firstName: 'Jane',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'San Francisco',
        stateCode: 'CA',
        postalCode: '94105',
        countryCode: 'US',
        preferred: true,
    },
    {
        addressId: 'work',
        firstName: 'Jane',
        lastName: 'Doe',
        address1: '456 Market St',
        city: 'San Francisco',
        stateCode: 'CA',
        postalCode: '94102',
        countryCode: 'US',
        preferred: false,
    },
];

const mockCustomer: Customer = {
    customerId: 'test-customer-id',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    login: 'jane@example.com',
    addresses: mockAddresses,
};

describe('Addresses page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedAddressFormProps = null;
        capturedAddressCardProps = {};
    });

    async function renderRoute(customerPromise: Promise<Customer | null>) {
        const AccountAddresses = (await import('./_app.account.addresses')).default;

        const router = createMemoryRouter(
            [
                {
                    path: '/account/addresses',
                    element: <Outlet context={{ customer: customerPromise }} />,
                    children: [
                        {
                            index: true,
                            element: <AccountAddresses />,
                        },
                    ],
                },
            ],
            { initialEntries: ['/account/addresses'] }
        );

        return render(
            <AllProvidersWrapper>
                <RouterProvider router={router} />
            </AllProvidersWrapper>
        );
    }

    describe('while the page is loading', () => {
        test('shows a loading placeholder before address data is available', async () => {
            const pendingPromise = new Promise<Customer | null>(() => {});
            await renderRoute(pendingPromise);

            expect(screen.getByTestId('addresses-skeleton')).toBeInTheDocument();
            expect(screen.queryByTestId('address-card-home')).not.toBeInTheDocument();
        });
    });

    describe('when the shopper has saved addresses', () => {
        test('sets the page title to Addresses and hides from search engines', async () => {
            await renderRoute(Promise.resolve(mockCustomer));

            const seoMeta = screen.getByTestId('seo-meta');
            expect(seoMeta).toHaveAttribute('data-title', t('account:meta.addressesTitle'));
            expect(seoMeta).toHaveAttribute('data-no-index', 'true');
        });

        test('shows the page heading and an Add New Address button', async () => {
            await renderRoute(Promise.resolve(mockCustomer));

            await waitFor(() => {
                expect(screen.getByTestId('address-card-home')).toBeInTheDocument();
            });

            expect(screen.getByText(t('account:navigation.addresses'))).toBeInTheDocument();
            expect(screen.getByRole('button', { name: t('account:addresses.addNewAddress') })).toBeInTheDocument();
        });

        test('displays a card for each saved address', async () => {
            await renderRoute(Promise.resolve(mockCustomer));

            await waitFor(() => {
                expect(screen.getByTestId('address-card-home')).toBeInTheDocument();
            });
            expect(screen.getByTestId('address-card-work')).toBeInTheDocument();
        });

        test('marks the default address as preferred', async () => {
            await renderRoute(Promise.resolve(mockCustomer));

            await waitFor(() => {
                expect(screen.getByTestId('address-card-home')).toBeInTheDocument();
            });

            expect(capturedAddressCardProps.home.address).toEqual(mockAddresses[0]);
            expect(capturedAddressCardProps.home.isPreferred).toBe(true);
            expect(capturedAddressCardProps.home.isSettingDefault).toBe(false);
        });

        test('does not mark a non-default address as preferred', async () => {
            await renderRoute(Promise.resolve(mockCustomer));

            await waitFor(() => {
                expect(screen.getByTestId('address-card-work')).toBeInTheDocument();
            });

            expect(capturedAddressCardProps.work.address).toEqual(mockAddresses[1]);
            expect(capturedAddressCardProps.work.isPreferred).toBe(false);
            expect(capturedAddressCardProps.work.isSettingDefault).toBe(false);
        });
    });

    describe('when the shopper has no saved addresses', () => {
        test('shows a message that there are no saved addresses', async () => {
            const customerWithoutAddresses: Customer = {
                ...mockCustomer,
                addresses: [],
            };
            await renderRoute(Promise.resolve(customerWithoutAddresses));

            await waitFor(() => {
                expect(screen.getByText(t('account:addresses.noSavedAddresses'))).toBeInTheDocument();
            });
            expect(screen.queryByTestId('address-card-home')).not.toBeInTheDocument();
        });

        test('shows the empty state when customer data is unavailable', async () => {
            await renderRoute(Promise.resolve(null));

            await waitFor(() => {
                expect(screen.getByText(t('account:addresses.noSavedAddresses'))).toBeInTheDocument();
            });
        });
    });

    describe('adding a new address', () => {
        test('opens the address form when the shopper clicks Add New Address', async () => {
            const user = userEvent.setup();
            await renderRoute(Promise.resolve(mockCustomer));

            await waitFor(() => {
                expect(screen.getByTestId('address-card-home')).toBeInTheDocument();
            });

            await user.click(screen.getByRole('button', { name: t('account:addresses.addNewAddress') }));

            await waitFor(() => {
                expect(screen.getByTestId('customer-address-form')).toBeInTheDocument();
            });
        });

        test('closes the address form when the shopper cancels', async () => {
            const user = userEvent.setup();
            await renderRoute(Promise.resolve(mockCustomer));

            await waitFor(() => {
                expect(screen.getByTestId('address-card-home')).toBeInTheDocument();
            });

            await user.click(screen.getByRole('button', { name: t('account:addresses.addNewAddress') }));

            await waitFor(() => {
                expect(screen.getByTestId('customer-address-form')).toBeInTheDocument();
            });

            await user.click(screen.getByTestId('form-cancel'));

            await waitFor(() => {
                expect(screen.queryByTestId('customer-address-form')).not.toBeInTheDocument();
            });
        });

        test('treats the new address as the first address when the shopper has none', async () => {
            const user = userEvent.setup();
            const customerWithoutAddresses: Customer = {
                ...mockCustomer,
                addresses: [],
            };
            await renderRoute(Promise.resolve(customerWithoutAddresses));

            await waitFor(() => {
                expect(screen.getByText(t('account:addresses.noSavedAddresses'))).toBeInTheDocument();
            });

            await user.click(screen.getByRole('button', { name: t('account:addresses.addNewAddress') }));

            await waitFor(() => {
                expect(screen.getByTestId('customer-address-form')).toBeInTheDocument();
            });
            expect(capturedAddressFormProps.isFirstAddress).toBe(true);
            expect(capturedAddressFormProps.initialData).toBeUndefined();
        });

        test('does not treat the new address as the first when the shopper already has addresses', async () => {
            const user = userEvent.setup();
            await renderRoute(Promise.resolve(mockCustomer));

            await waitFor(() => {
                expect(screen.getByTestId('address-card-home')).toBeInTheDocument();
            });

            await user.click(screen.getByRole('button', { name: t('account:addresses.addNewAddress') }));

            await waitFor(() => {
                expect(screen.getByTestId('customer-address-form')).toBeInTheDocument();
            });
            expect(capturedAddressFormProps.isFirstAddress).toBe(false);
        });
    });

    describe('editing an existing address', () => {
        test('pre-fills the form with the address details when the shopper clicks Edit', async () => {
            const user = userEvent.setup();
            await renderRoute(Promise.resolve(mockCustomer));

            await waitFor(() => {
                expect(screen.getByTestId('address-card-home')).toBeInTheDocument();
            });

            const homeCard = screen.getByTestId('address-card-home');
            const editButton = homeCard.querySelector('button');
            expect(editButton).toBeInTheDocument();
            await user.click(editButton as HTMLElement);

            await waitFor(() => {
                expect(screen.getByTestId('customer-address-form')).toBeInTheDocument();
            });

            expect(capturedAddressFormProps.initialData).toEqual({
                addressId: 'home',
                firstName: 'Jane',
                lastName: 'Doe',
                phone: '',
                countryCode: 'US',
                address1: '123 Main St',
                address2: '',
                city: 'San Francisco',
                stateCode: 'CA',
                postalCode: '94105',
                preferred: true,
            });
        });

        test('shows Edit Address as the dialog heading', async () => {
            const user = userEvent.setup();
            await renderRoute(Promise.resolve(mockCustomer));

            await waitFor(() => {
                expect(screen.getByTestId('address-card-home')).toBeInTheDocument();
            });

            const homeCard = screen.getByTestId('address-card-home');
            const editButton = homeCard.querySelector('button');
            expect(editButton).toBeInTheDocument();
            await user.click(editButton as HTMLElement);

            await waitFor(() => {
                expect(screen.getByText(t('account:addresses.editAddress'))).toBeInTheDocument();
            });
        });
    });

    describe('removing an address', () => {
        test('asks for confirmation with the correct address when the shopper clicks Remove', async () => {
            const user = userEvent.setup();
            await renderRoute(Promise.resolve(mockCustomer));

            await waitFor(() => {
                expect(screen.getByTestId('address-card-home')).toBeInTheDocument();
            });

            const removeButtons = screen.getAllByRole('button', { name: /remove/i });
            await user.click(removeButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId('remove-dialog')).toBeInTheDocument();
            });
            expect(screen.getByTestId('remove-address-id')).toHaveTextContent('home');
        });

        test('dismisses the confirmation when the shopper cancels', async () => {
            const user = userEvent.setup();
            await renderRoute(Promise.resolve(mockCustomer));

            await waitFor(() => {
                expect(screen.getByTestId('address-card-home')).toBeInTheDocument();
            });

            const removeButtons = screen.getAllByRole('button', { name: /remove/i });
            await user.click(removeButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId('remove-dialog')).toBeInTheDocument();
            });

            await user.click(screen.getByTestId('cancel-remove'));

            await waitFor(() => {
                expect(screen.queryByTestId('remove-dialog')).not.toBeInTheDocument();
            });
        });
    });

    describe('address display order', () => {
        test('displays addresses in alphabetical order by name', async () => {
            const unsortedCustomer: Customer = {
                ...mockCustomer,
                addresses: [
                    { ...mockAddresses[1], addressId: 'zebra' },
                    { ...mockAddresses[0], addressId: 'alpha' },
                ],
            };
            await renderRoute(Promise.resolve(unsortedCustomer));

            await waitFor(() => {
                expect(screen.getByTestId('address-card-alpha')).toBeInTheDocument();
            });
            expect(screen.getByTestId('address-card-zebra')).toBeInTheDocument();

            const allCards = screen.getAllByTestId(/^address-card-/);
            expect(allCards).toHaveLength(2);
            expect(allCards[0]).toHaveAttribute('data-testid', 'address-card-alpha');
            expect(allCards[1]).toHaveAttribute('data-testid', 'address-card-zebra');
        });
    });
});
