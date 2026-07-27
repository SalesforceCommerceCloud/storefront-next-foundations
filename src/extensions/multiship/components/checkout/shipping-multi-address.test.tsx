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
import { render, screen, within, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import ShippingMultiAddress from './shipping-multi-address';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';
import { mockConfig, mockAltSiteObject } from '@/test-utils/config';
import type { ShopperBasketsV2, ShopperCustomers, ShopperProducts } from '@/scapi';

const defaultMockSite = mockAltSiteObject;
const defaultMockLocale =
    defaultMockSite.supportedLocales.find((l) => l.id === defaultMockSite.defaultLocale) ??
    defaultMockSite.supportedLocales[0];

const wrapper = ({ children }: { children: ReactNode }) => (
    <ConfigProvider config={mockConfig}>
        <SiteProvider
            site={defaultMockSite}
            locale={defaultMockLocale}
            language={mockAltSiteObject.defaultLocale}
            currency={mockAltSiteObject.defaultCurrency}>
            {children}
        </SiteProvider>
    </ConfigProvider>
);

// Mock hooks
vi.mock('@/providers/basket', () => ({ useBasket: vi.fn() }));
vi.mock('@/hooks/checkout/use-customer-profile', () => ({
    useCustomerProfile: vi.fn(),
}));
vi.mock('@/hooks/use-checkout', () => ({
    useCheckoutContext: vi.fn(),
}));
vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

const createDefaultProps = (overrides = {}) => ({
    isEditing: true,
    isDeliveryProductItem: () => true,
    onEdit: vi.fn(),
    handleToggleShippingAddressMode: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
    deliveryShipments: [],
    ...overrides,
});

describe('ShippingMultiAddress', () => {
    let useBasket: ReturnType<typeof vi.fn>;
    let useCustomerProfile: ReturnType<typeof vi.fn>;
    let useCheckoutContext: ReturnType<typeof vi.fn>;
    let setSavedAddresses: ReturnType<typeof vi.fn>;
    let setProductItemAddresses: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        const basketModule = await import('@/providers/basket');
        const customerProfileModule = await import('@/hooks/checkout/use-customer-profile');
        const checkoutModule = await import('@/hooks/use-checkout');

        useBasket = basketModule.useBasket as ReturnType<typeof vi.fn>;
        useCustomerProfile = customerProfileModule.useCustomerProfile as ReturnType<typeof vi.fn>;
        useCheckoutContext = checkoutModule.useCheckoutContext as ReturnType<typeof vi.fn>;

        // Create mock functions for checkout context setters
        setSavedAddresses = vi.fn();
        setProductItemAddresses = vi.fn();

        // Default mock: empty basket
        useBasket.mockReturnValue({
            basketId: 'test-basket',
            currency: mockAltSiteObject.defaultCurrency,
            productItems: [],
        });
        useCustomerProfile.mockReturnValue({
            addresses: [],
            paymentInstruments: [],
        });
        useCheckoutContext.mockReturnValue({
            savedAddresses: [],
            setSavedAddresses,
            shipmentDistribution: {
                hasUnaddressedDeliveryItems: false,
                hasEmptyShipments: false,
                deliveryShipments: [],
            },
            productItemAddresses: new Map(),
            setProductItemAddresses,
        });
    });

    test('renders the products that are passed as props', () => {
        const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
            {
                itemId: 'item-1',
                productId: 'product-1',
                productName: 'Test Product One',
                quantity: 2,
                price: 29.99,
            },
            {
                itemId: 'item-2',
                productId: 'product-2',
                productName: 'Test Product Two',
                quantity: 1,
                price: 49.99,
            },
            {
                itemId: 'item-3',
                productId: 'product-3',
                productName: 'Test Product Three',
                quantity: 3,
                price: 19.99,
            },
        ];

        useBasket.mockReturnValue({
            basketId: 'test-basket',
            currency: mockAltSiteObject.defaultCurrency,
            productItems: mockProductItems,
        });

        render(<ShippingMultiAddress {...createDefaultProps()} />, { wrapper });

        // Verify all product names are rendered
        expect(screen.getByText('Test Product One')).toBeInTheDocument();
        expect(screen.getByText('Test Product Two')).toBeInTheDocument();
        expect(screen.getByText('Test Product Three')).toBeInTheDocument();

        // Verify all quantities are rendered
        expect(screen.getByText(/Qty:\s*2/i)).toBeInTheDocument();
        expect(screen.getByText(/Qty:\s*1/i)).toBeInTheDocument();
        expect(screen.getByText(/Qty:\s*3/i)).toBeInTheDocument();

        // Verify all product items have the correct test IDs
        expect(screen.getByTestId('sf-product-item-summary-product-1')).toBeInTheDocument();
        expect(screen.getByTestId('sf-product-item-summary-product-2')).toBeInTheDocument();
        expect(screen.getByTestId('sf-product-item-summary-product-3')).toBeInTheDocument();

        // Verify delivery address selects are rendered for each product
        expect(screen.getByTestId('delivery-address-select-item-1')).toBeInTheDocument();
        expect(screen.getByTestId('delivery-address-select-item-2')).toBeInTheDocument();
        expect(screen.getByTestId('delivery-address-select-item-3')).toBeInTheDocument();
    });

    test('renders products with variation attributes when provided', () => {
        const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
            {
                itemId: 'item-1',
                productId: 'product-1',
                productName: 'Test Product With Variations',
                quantity: 1,
                price: 29.99,
                variationValues: {
                    color: 'red',
                    size: 'medium',
                },
                variationAttributes: [
                    {
                        id: 'color',
                        name: 'Color',
                        values: [{ value: 'red', name: 'Red' }],
                    },
                    {
                        id: 'size',
                        name: 'Size',
                        values: [{ value: 'medium', name: 'Medium' }],
                    },
                ],
            },
        ];

        useBasket.mockReturnValue({
            basketId: 'test-basket',
            currency: mockAltSiteObject.defaultCurrency,
            productItems: mockProductItems,
        });

        render(<ShippingMultiAddress {...createDefaultProps()} />, { wrapper });

        expect(screen.getByText('Test Product With Variations')).toBeInTheDocument();
        expect(screen.getByText('Color: Red')).toBeInTheDocument();
        expect(screen.getByText('Size: Medium')).toBeInTheDocument();
    });

    test('falls back to prop product items when productMap is not provided', () => {
        const propProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
            {
                itemId: 'item-1',
                productId: 'product-1',
                productName: 'Product From Props',
                quantity: 1,
                price: 29.99,
            },
        ];

        useBasket.mockReturnValue({
            basketId: 'test-basket',
            currency: mockAltSiteObject.defaultCurrency,
            productItems: propProductItems,
        });

        render(<ShippingMultiAddress {...createDefaultProps()} />, { wrapper });

        // Should render product from props when productMap is not provided
        expect(screen.getByText('Product From Props')).toBeInTheDocument();
    });

    test('renders enriched product items when productMap is provided', () => {
        const propProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
            {
                itemId: 'item-1',
                productId: 'product-1',
                productName: 'Product From Props',
                quantity: 1,
                price: 29.99,
            },
        ];

        const productMap: Record<string, ShopperProducts.schemas['Product']> = {
            'item-1': {
                id: 'product-1',
                name: 'Enriched Product',
                imageGroups: [],
            } as ShopperProducts.schemas['Product'],
        };

        useBasket.mockReturnValue({
            basketId: 'test-basket',
            currency: mockAltSiteObject.defaultCurrency,
            productItems: propProductItems,
        });

        render(<ShippingMultiAddress productMap={productMap} {...createDefaultProps()} />, { wrapper });

        // Should render enriched product from productMap, not props
        expect(screen.getByText('Enriched Product')).toBeInTheDocument();
        expect(screen.queryByText('Product From Props')).not.toBeInTheDocument();
    });

    test('renders toggle action button', () => {
        const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
            {
                itemId: 'item-1',
                productId: 'product-1',
                productName: 'Test Product',
                quantity: 1,
                price: 29.99,
            },
        ];

        useBasket.mockReturnValue({
            basketId: 'test-basket',
            currency: mockAltSiteObject.defaultCurrency,
            productItems: mockProductItems,
        });

        render(<ShippingMultiAddress {...createDefaultProps()} />, { wrapper });

        // Should show "Ship items to one address" toggle button
        expect(screen.getByText('Ship items to one address')).toBeInTheDocument();
    });

    describe('Address selection', () => {
        test('initializes addresses from basket shipments', () => {
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                    shipmentId: 'ship-1',
                },
            ];

            const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'Springfield',
                            stateCode: 'IL',
                            postalCode: '62701',
                            countryCode: 'US',
                        },
                    },
                ],
            };

            useBasket.mockReturnValue(mockBasket);

            render(
                <ShippingMultiAddress
                    {...createDefaultProps({
                        deliveryShipments: mockBasket.shipments || [],
                    })}
                />,
                { wrapper }
            );

            const select = screen.getByTestId('delivery-address-select-item-1');
            // Should have a selected value (the shipment address)
            expect(select).toHaveValue('shipment_ship-1');
        });

        test('displays consolidated addresses in select dropdown', () => {
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                    shipmentId: 'ship-1',
                },
            ];

            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'Jane',
                lastName: 'Smith',
                address1: '456 Oak Ave',
                city: 'Portland',
                stateCode: 'OR',
                postalCode: '97201',
                countryCode: 'US',
            };

            const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'Springfield',
                            stateCode: 'IL',
                            postalCode: '62701',
                            countryCode: 'US',
                        },
                    },
                ],
            };

            useBasket.mockReturnValue(mockBasket);
            useCustomerProfile.mockReturnValue({
                addresses: [customerAddress],
                paymentInstruments: [],
            });

            render(
                <ShippingMultiAddress
                    {...createDefaultProps({
                        deliveryShipments: mockBasket.shipments || [],
                    })}
                />,
                { wrapper }
            );

            const select = screen.getByTestId('delivery-address-select-item-1');
            const options = within(select).getAllByRole('option');

            // Should have 3 options: placeholder + 2 addresses (shipment + customer)
            expect(options).toHaveLength(3);
            expect(options[0]).toHaveTextContent('Select an address');
            expect(options[1]).toHaveTextContent('John Doe, 123 Main St, Springfield, IL, 62701');
            expect(options[2]).toHaveTextContent('Jane Smith, 456 Oak Ave, Portland, OR, 97201');
        });

        test('updates selected address when user changes selection', async () => {
            const user = userEvent.setup();
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                    shipmentId: 'ship-1',
                },
            ];

            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'Jane',
                lastName: 'Smith',
                address1: '456 Oak Ave',
                city: 'Portland',
                stateCode: 'OR',
                postalCode: '97201',
                countryCode: 'US',
            };

            const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'Springfield',
                            stateCode: 'IL',
                            postalCode: '62701',
                            countryCode: 'US',
                        },
                    },
                ],
            };

            useBasket.mockReturnValue(mockBasket);
            useCustomerProfile.mockReturnValue({
                addresses: [customerAddress],
                paymentInstruments: [],
            });

            render(
                <ShippingMultiAddress
                    {...createDefaultProps({
                        deliveryShipments: mockBasket.shipments || [],
                    })}
                />,
                { wrapper }
            );

            const select = screen.getByTestId('delivery-address-select-item-1');

            // Initially should be set to shipment address
            expect(select).toHaveValue('shipment_ship-1');

            // Change to customer address
            await user.selectOptions(select, 'addr-1');

            // Should update to customer address
            expect(select).toHaveValue('addr-1');
        });

        test('shows "Select an address" when addresses are available', () => {
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                },
            ];

            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'Jane',
                lastName: 'Smith',
                address1: '456 Oak Ave',
                city: 'Portland',
                stateCode: 'OR',
                postalCode: '97201',
                countryCode: 'US',
            };

            useCustomerProfile.mockReturnValue({
                addresses: [customerAddress],
                paymentInstruments: [],
            });

            useBasket.mockReturnValue({
                basketId: 'test-basket',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
            });

            render(<ShippingMultiAddress {...createDefaultProps()} />, { wrapper });

            const select = screen.getByTestId('delivery-address-select-item-1');
            const placeholderOption = within(select).getByText('Select an address');

            expect(placeholderOption).toBeInTheDocument();
        });

        test('shows "No address available" when no addresses exist', () => {
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                },
            ];

            useCustomerProfile.mockReturnValue({
                addresses: [],
                paymentInstruments: [],
            });

            useBasket.mockReturnValue({
                basketId: 'test-basket',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
            });

            render(<ShippingMultiAddress {...createDefaultProps()} />, { wrapper });

            const select = screen.getByTestId('delivery-address-select-item-1');
            const placeholderOption = within(select).getByText('No address available');

            expect(placeholderOption).toBeInTheDocument();
        });

        test('handles multiple items with different addresses', () => {
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Product One',
                    quantity: 1,
                    price: 29.99,
                    shipmentId: 'ship-1',
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    productName: 'Product Two',
                    quantity: 1,
                    price: 39.99,
                    shipmentId: 'ship-2',
                },
            ];

            const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'Springfield',
                            stateCode: 'IL',
                            postalCode: '62701',
                            countryCode: 'US',
                        },
                    },
                    {
                        shipmentId: 'ship-2',
                        shippingAddress: {
                            firstName: 'Jane',
                            lastName: 'Smith',
                            address1: '456 Oak Ave',
                            city: 'Portland',
                            stateCode: 'OR',
                            postalCode: '97201',
                            countryCode: 'US',
                        },
                    },
                ],
            };

            useBasket.mockReturnValue(mockBasket);

            render(
                <ShippingMultiAddress
                    {...createDefaultProps({
                        deliveryShipments: mockBasket.shipments || [],
                    })}
                />,
                { wrapper }
            );

            const select1 = screen.getByTestId('delivery-address-select-item-1');
            const select2 = screen.getByTestId('delivery-address-select-item-2');

            expect(select1).toHaveValue('shipment_ship-1');
            expect(select2).toHaveValue('shipment_ship-2');
        });
    });

    describe('Add Address to Products', () => {
        test('renders a single "Add New Address" button in the header', () => {
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    productName: 'Test Product Two',
                    quantity: 1,
                    price: 49.99,
                },
            ];

            useBasket.mockReturnValue({
                basketId: 'test-basket',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
            });

            render(<ShippingMultiAddress {...createDefaultProps()} />, { wrapper });

            // One "Add New Address" button in the header, not one per item
            expect(screen.getByRole('button', { name: 'Add new address' })).toBeInTheDocument();
        });

        test('opens AddressModal when "Add New Address" header button is clicked', async () => {
            const user = userEvent.setup();
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    productName: 'Test Product Two',
                    quantity: 1,
                    price: 49.99,
                },
            ];

            useBasket.mockReturnValue({
                basketId: 'test-basket',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
            });

            render(<ShippingMultiAddress {...createDefaultProps()} />, { wrapper });

            await user.click(screen.getByRole('button', { name: 'Add new address' }));

            // Dialog should be open
            expect(screen.getByRole('heading', { name: 'Add New Address' })).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument();
        });

        test('new address appears in all item dropdowns after saving from header', async () => {
            const user = userEvent.setup();
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    productName: 'Test Product Two',
                    quantity: 1,
                    price: 49.99,
                },
            ];

            useBasket.mockReturnValue({
                basketId: 'test-basket',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
            });

            useCustomerProfile.mockReturnValue({
                customer: { customerId: 'test-customer-id' },
                addresses: [],
                paymentInstruments: [],
            });

            render(<ShippingMultiAddress {...createDefaultProps()} />, { wrapper });

            // Open dialog from header
            await user.click(screen.getByRole('button', { name: 'Add new address' }));

            // Fill out the form
            await user.type(screen.getByPlaceholderText(/e\.g\., Home, Work/i), 'Home');
            await user.type(screen.getByPlaceholderText(/first name/i), 'Jane');
            await user.type(screen.getByPlaceholderText(/last name/i), 'Doe');
            await user.type(screen.getByRole('textbox', { name: /address line 1|^address$/i }), '789 New St');
            await user.type(screen.getByPlaceholderText(/city/i), 'Seattle');
            await user.selectOptions(screen.getByRole('combobox', { name: /state/i }), 'WA');
            await user.type(screen.getByRole('textbox', { name: /zip|postal/i }), '98101');
            await user.type(screen.getByRole('textbox', { name: /phone/i }), '2065551234');

            await user.click(screen.getByRole('button', { name: 'Save' }));

            await waitFor(() => {
                expect(screen.queryByRole('heading', { name: 'Add New Address' })).not.toBeInTheDocument();
            });

            // New address should appear in both item dropdowns as a selectable option
            const select1 = screen.getByTestId('delivery-address-select-item-1');
            const select2 = screen.getByTestId('delivery-address-select-item-2');

            const options1 = within(select1).getAllByRole('option');
            const options2 = within(select2).getAllByRole('option');

            expect(options1.some((opt) => opt.textContent?.includes('Jane Doe'))).toBe(true);
            expect(options2.some((opt) => opt.textContent?.includes('Jane Doe'))).toBe(true);
        });

        test('allows selecting the newly added address from dropdown after saving', async () => {
            const user = userEvent.setup();
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    productName: 'Test Product Two',
                    quantity: 1,
                    price: 49.99,
                },
            ];

            useBasket.mockReturnValue({
                basketId: 'test-basket',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
            });

            useCustomerProfile.mockReturnValue({
                customer: { customerId: 'test-customer-id' },
                addresses: [],
                paymentInstruments: [],
            });

            render(<ShippingMultiAddress {...createDefaultProps()} />, { wrapper });

            await user.click(screen.getByRole('button', { name: 'Add new address' }));

            await user.type(screen.getByPlaceholderText(/e\.g\., Home, Work/i), 'Shared');
            await user.type(screen.getByPlaceholderText(/first name/i), 'Shared');
            await user.type(screen.getByPlaceholderText(/last name/i), 'Address');
            await user.type(screen.getByRole('textbox', { name: /address line 1|^address$/i }), '999 Shared St');
            await user.type(screen.getByPlaceholderText(/city/i), 'Boston');
            await user.selectOptions(screen.getByRole('combobox', { name: /state/i }), 'MA');
            await user.type(screen.getByRole('textbox', { name: /zip|postal/i }), '02101');
            await user.type(screen.getByRole('textbox', { name: /phone/i }), '6175551234');

            await user.click(screen.getByRole('button', { name: 'Save' }));

            await waitFor(() => {
                expect(screen.queryByRole('heading', { name: 'Add New Address' })).not.toBeInTheDocument();
            });

            // Select the new address for item-2 from dropdown
            const select2 = screen.getByTestId('delivery-address-select-item-2');
            const options2 = within(select2).getAllByRole('option');
            const newAddressOption = options2.find((opt) => opt.textContent?.includes('Shared Address'));

            expect(newAddressOption).toBeTruthy();
            if (newAddressOption) {
                await user.selectOptions(select2, newAddressOption.getAttribute('value') || '');
                expect(select2).toHaveValue(newAddressOption.getAttribute('value') || '');
            }
        });

        test('assigns auto-generated addressId when saving address without customerId', async () => {
            const user = userEvent.setup();
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                },
            ];

            useBasket.mockReturnValue({
                basketId: 'test-basket',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
            });

            // No customerId — showAddressId will be false, addressId field is hidden
            useCustomerProfile.mockReturnValue({
                addresses: [],
                paymentInstruments: [],
            });

            render(<ShippingMultiAddress {...createDefaultProps()} />, { wrapper });

            await user.click(screen.getByRole('button', { name: 'Add new address' }));

            // addressId field should NOT be visible
            expect(screen.queryByPlaceholderText(/e\.g\., Home, Work/i)).not.toBeInTheDocument();

            await user.type(screen.getByPlaceholderText(/first name/i), 'Jane');
            await user.type(screen.getByPlaceholderText(/last name/i), 'Doe');
            await user.type(screen.getByRole('textbox', { name: /address line 1|^address$/i }), '789 New St');
            await user.type(screen.getByPlaceholderText(/city/i), 'Seattle');
            await user.selectOptions(screen.getByRole('combobox', { name: /state/i }), 'WA');
            await user.type(screen.getByRole('textbox', { name: /zip|postal/i }), '98101');
            await user.type(screen.getByRole('textbox', { name: /phone/i }), '2065551234');

            await user.click(screen.getByRole('button', { name: 'Save' }));

            await waitFor(() => {
                expect(screen.queryByRole('heading', { name: 'Add New Address' })).not.toBeInTheDocument();
            });

            // The address should appear in the dropdown with an auto-generated addr_ id
            const select = screen.getByTestId('delivery-address-select-item-1');
            const options = within(select).getAllByRole('option');
            const newAddressOption = options.find((opt) => opt.textContent?.includes('Jane Doe'));
            expect(newAddressOption).toBeTruthy();
            expect(newAddressOption?.getAttribute('value')).toMatch(/^addr_/);
        });

        test('resets form when dialog is closed and reopened', async () => {
            const user = userEvent.setup();
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                },
            ];

            useBasket.mockReturnValue({
                basketId: 'test-basket',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
            });

            render(<ShippingMultiAddress {...createDefaultProps()} />, { wrapper });

            const addAddressButton = screen.getByRole('button', { name: 'Add new address' });
            await user.click(addAddressButton);

            await user.type(screen.getByPlaceholderText(/first name/i), 'Test');
            await user.type(screen.getByPlaceholderText(/last name/i), 'User');

            // Cancel and reopen
            await user.click(screen.getByRole('button', { name: 'Cancel' }));

            await waitFor(() => {
                expect(screen.queryByRole('heading', { name: 'Add New Address' })).not.toBeInTheDocument();
            });

            // Reopen dialog
            await user.click(addAddressButton);

            expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('');
            expect(screen.getByPlaceholderText(/last name/i)).toHaveValue('');
        });
    });

    describe('Summary section', () => {
        test('displays summary text when multiple shipments with multiple addresses are completed', () => {
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                    shipmentId: 'ship-1',
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    productName: 'Test Product Two',
                    quantity: 1,
                    price: 39.99,
                    shipmentId: 'ship-2',
                },
            ];

            const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'Springfield',
                            stateCode: 'IL',
                            postalCode: '62701',
                            countryCode: 'US',
                        },
                    },
                    {
                        shipmentId: 'ship-2',
                        shippingAddress: {
                            firstName: 'Jane',
                            lastName: 'Smith',
                            address1: '456 Oak Ave',
                            city: 'Portland',
                            stateCode: 'OR',
                            postalCode: '97201',
                            countryCode: 'US',
                        },
                    },
                ],
            };

            useBasket.mockReturnValue(mockBasket);

            render(
                <ShippingMultiAddress
                    {...createDefaultProps({
                        isEditing: false,
                        isCompleted: true,
                        deliveryShipments: mockBasket.shipments || [],
                        hasMultipleDeliveryAddresses: true, // Multiple unique addresses
                    })}
                />,
                { wrapper }
            );

            // Should display the summary text when multiple shipments with different addresses
            expect(screen.getByText('You are shipping to multiple locations.')).toBeInTheDocument();
        });

        test('does not display summary text when only one shipment', () => {
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                    shipmentId: 'ship-1',
                },
            ];

            const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'Springfield',
                            stateCode: 'IL',
                            postalCode: '62701',
                            countryCode: 'US',
                        },
                    },
                ],
            };

            useBasket.mockReturnValue(mockBasket);

            render(
                <ShippingMultiAddress
                    {...createDefaultProps({
                        isEditing: false,
                        isCompleted: true,
                        deliveryShipments: mockBasket.shipments || [],
                        hasMultipleDeliveryAddresses: false, // Single shipment = single address
                    })}
                />,
                { wrapper }
            );

            // Should not display the summary text when only one shipment
            expect(screen.queryByText('You are shipping to multiple locations.')).not.toBeInTheDocument();
        });

        test('does not display summary text when step is not completed', () => {
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                    shipmentId: 'ship-1',
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    productName: 'Test Product Two',
                    quantity: 1,
                    price: 39.99,
                    shipmentId: 'ship-2',
                },
            ];

            const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'Springfield',
                            stateCode: 'IL',
                            postalCode: '62701',
                            countryCode: 'US',
                        },
                    },
                    {
                        shipmentId: 'ship-2',
                        shippingAddress: {
                            firstName: 'Jane',
                            lastName: 'Smith',
                            address1: '456 Oak Ave',
                            city: 'Portland',
                            stateCode: 'OR',
                            postalCode: '97201',
                            countryCode: 'US',
                        },
                    },
                ],
            };

            useBasket.mockReturnValue(mockBasket);

            render(
                <ShippingMultiAddress
                    {...createDefaultProps({
                        isEditing: false,
                        isCompleted: false,
                        deliveryShipments: mockBasket.shipments || [],
                        hasMultipleDeliveryAddresses: true, // Multiple addresses exist but step not completed
                    })}
                />,
                { wrapper }
            );

            // Should not display the summary text when step is not completed
            expect(screen.queryByText('You are shipping to multiple locations.')).not.toBeInTheDocument();
        });

        test('does not display summary text when multiple shipments have same address', () => {
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                    shipmentId: 'ship-1',
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    productName: 'Test Product Two',
                    quantity: 1,
                    price: 39.99,
                    shipmentId: 'ship-2',
                },
            ];

            const sameAddress = {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-1',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
                shipments: [
                    {
                        shipmentId: 'ship-1',
                        shippingAddress: sameAddress,
                    },
                    {
                        shipmentId: 'ship-2',
                        shippingAddress: sameAddress,
                    },
                ],
            };

            useBasket.mockReturnValue(mockBasket);

            render(
                <ShippingMultiAddress
                    {...createDefaultProps({
                        isEditing: false,
                        isCompleted: true,
                        deliveryShipments: mockBasket.shipments || [],
                        hasMultipleDeliveryAddresses: false, // Same address = not multiple unique addresses
                    })}
                />,
                { wrapper }
            );

            // Should not display the summary text when shipments have the same address
            expect(screen.queryByText('You are shipping to multiple locations.')).not.toBeInTheDocument();
        });
    });

    describe('saveAddresses', () => {
        test('saves addresses to checkout context when form is submitted', async () => {
            const user = userEvent.setup();
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                },
            ];

            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            useBasket.mockReturnValue({
                basketId: 'test-basket',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
            });

            useCustomerProfile.mockReturnValue({
                addresses: [customerAddress],
                paymentInstruments: [],
            });

            render(<ShippingMultiAddress {...createDefaultProps()} />, { wrapper });

            // Select an address for the item
            const select = screen.getByTestId('delivery-address-select-item-1');
            await user.selectOptions(select, 'addr-1');

            // Submit the form
            const submitButton = screen.getByRole('button', { name: /continue/i });
            await user.click(submitButton);

            // Verify that setSavedAddresses was called with the available addresses
            expect(setSavedAddresses).toHaveBeenCalled();
            const savedAddressesCall = setSavedAddresses.mock.calls[0][0];
            expect(savedAddressesCall).toBeInstanceOf(Array);
            expect(savedAddressesCall.length).toBeGreaterThan(0);
            expect(savedAddressesCall.some((addr: { addressId: string }) => addr.addressId === 'addr-1')).toBe(true);

            // Verify that setProductItemAddresses was called with a Map containing the item address
            expect(setProductItemAddresses).toHaveBeenCalled();
            const productItemAddressesCall = setProductItemAddresses.mock.calls[0][0];
            expect(productItemAddressesCall).toBeInstanceOf(Map);
            expect(productItemAddressesCall.has('item-1')).toBe(true);
            expect(productItemAddressesCall.get('item-1')?.addressId).toBe('addr-1');
        });

        test('saves addresses to checkout context when toggling to single address mode', async () => {
            const user = userEvent.setup();
            const handleToggleShippingAddressMode = vi.fn();
            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    productName: 'Test Product Two',
                    quantity: 1,
                    price: 49.99,
                },
            ];

            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'Jane',
                lastName: 'Smith',
                address1: '456 Oak Ave',
                city: 'Portland',
                stateCode: 'OR',
                postalCode: '97201',
                countryCode: 'US',
            };

            useBasket.mockReturnValue({
                basketId: 'test-basket',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
            });

            useCustomerProfile.mockReturnValue({
                addresses: [customerAddress],
                paymentInstruments: [],
            });

            render(
                <ShippingMultiAddress
                    {...createDefaultProps({
                        handleToggleShippingAddressMode,
                    })}
                />,
                { wrapper }
            );

            // Select addresses for both items
            const select1 = screen.getByTestId('delivery-address-select-item-1');
            const select2 = screen.getByTestId('delivery-address-select-item-2');
            await user.selectOptions(select1, 'addr-1');
            await user.selectOptions(select2, 'addr-1');

            // Click the toggle button to switch to single address mode
            const toggleButton = screen.getByText('Ship items to one address');
            await user.click(toggleButton);

            // Verify that setSavedAddresses was called with the available addresses
            expect(setSavedAddresses).toHaveBeenCalled();
            const savedAddressesCall = setSavedAddresses.mock.calls[0][0];
            expect(savedAddressesCall).toBeInstanceOf(Array);
            expect(savedAddressesCall.length).toBeGreaterThan(0);

            // Verify that setProductItemAddresses was called with a Map containing both item addresses
            expect(setProductItemAddresses).toHaveBeenCalled();
            const productItemAddressesCall = setProductItemAddresses.mock.calls[0][0];
            expect(productItemAddressesCall).toBeInstanceOf(Map);
            expect(productItemAddressesCall.has('item-1')).toBe(true);
            expect(productItemAddressesCall.has('item-2')).toBe(true);
            expect(productItemAddressesCall.get('item-1')?.addressId).toBe('addr-1');
            expect(productItemAddressesCall.get('item-2')?.addressId).toBe('addr-1');

            // Verify that handleToggleShippingAddressMode was called
            expect(handleToggleShippingAddressMode).toHaveBeenCalled();
        });

        test('shows toast error when submitting form with missing addresses', async () => {
            const { toast } = await import('sonner');

            const mockProductItems: ShopperBasketsV2.schemas['ProductItem'][] = [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 1,
                    price: 29.99,
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    productName: 'Test Product Two',
                    quantity: 1,
                    price: 49.99,
                },
            ];

            useBasket.mockReturnValue({
                basketId: 'test-basket',
                currency: mockAltSiteObject.defaultCurrency,
                productItems: mockProductItems,
            });

            useCustomerProfile.mockReturnValue({
                customer: { customerId: 'test-customer-id' },
                addresses: [],
                paymentInstruments: [],
            });

            const mockOnSubmit = vi.fn();
            render(
                <ShippingMultiAddress
                    {...createDefaultProps({
                        onSubmit: mockOnSubmit,
                    })}
                />,
                { wrapper }
            );

            // Don't assign addresses to any items - leave them unassigned
            // Find and submit the form
            const form = document.querySelector('form');
            expect(form).toBeInTheDocument();

            if (form) {
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                form.dispatchEvent(submitEvent);
            }

            // Wait for toast error to be called (form submission should trigger validation)
            await waitFor(
                () => {
                    expect(toast.error).toHaveBeenCalled();
                },
                { timeout: 1000 }
            );

            // Verify onSubmit was not called because form should return early
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });
    });
});
