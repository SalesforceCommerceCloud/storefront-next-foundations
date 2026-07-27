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
import ShippingAddress from '@/components/checkout/components/shipping-address';

// Use real react-hook-form for integration tests
vi.mock('@/providers/basket', () => ({ useBasket: vi.fn() }));
vi.mock('@/hooks/checkout/use-customer-profile', () => ({
    useCustomerProfile: vi.fn(() => null),
}));
vi.mock('@/providers/auth', () => ({
    useAuth: vi.fn(() => ({ customerId: 'cust-123' })),
}));

const mockSubmit = vi.fn();
vi.mock('@/hooks/use-scapi-fetcher', () => ({
    useScapiFetcher: vi.fn(() => ({
        data: null,
        state: 'idle',
        submit: mockSubmit,
    })),
}));
vi.mock('@/hooks/use-scapi-fetcher-effect', () => ({
    useScapiFetcherEffect: vi.fn(),
}));

const createMockBasket = (overrides = {}) => ({
    basketId: 'test-basket-123',
    currency: 'USD',
    customerInfo: { email: 'test@example.com', phone: '5551234567' },
    shipments: [
        {
            shipmentId: 'shipment-1',
            shippingAddress: null,
        },
    ],
    ...overrides,
});

const createDefaultProps = (overrides = {}) => ({
    onSubmit: vi.fn(),
    isLoading: false,
    actionData: undefined,
    isCompleted: false,
    isEditing: true,
    onEdit: vi.fn(),
    enableMultiAddress: false,
    singleAddressMode: true,
    handleToggleShippingAddressMode: vi.fn(),
    ...overrides,
});

describe('ShippingAddress Integration Tests', () => {
    let useBasket: ReturnType<typeof vi.fn>;
    let useCustomerProfile: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        const basketModule = await import('@/providers/basket');
        const profileModule = await import('@/hooks/checkout/use-customer-profile');

        useBasket = basketModule.useBasket as ReturnType<typeof vi.fn>;
        useCustomerProfile = profileModule.useCustomerProfile as ReturnType<typeof vi.fn>;

        useBasket.mockReturnValue(createMockBasket());
        useCustomerProfile.mockReturnValue(null);
    });

    describe('Multiple Addresses', () => {
        test('shows "Deliver to multiple addresses" button when cart has more than 1 product and shipping address is entered', () => {
            const basketWithMultipleProducts = {
                basketId: 'test-basket',
                customerInfo: { email: 'test@example.com', phone: '5551234567' },
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        productName: 'Product 1',
                        quantity: 1,
                    },
                    {
                        itemId: 'item-2',
                        productId: 'product-2',
                        productName: 'Product 2',
                        quantity: 1,
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'New York',
                            stateCode: 'NY',
                            postalCode: '10001',
                            phone: '5551234567',
                        },
                    },
                ],
            };
            useBasket.mockReturnValue(basketWithMultipleProducts);

            render(
                <ShippingAddress
                    {...createDefaultProps({
                        isEditing: true,
                        isCompleted: true,
                        enableMultiAddress: true,
                        singleAddressMode: true,
                    })}
                />
            );

            expect(screen.getByRole('button', { name: /deliver to multiple addresses/i })).toBeInTheDocument();
        });
    });
});
