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

// React Router
import { createMemoryRouter, RouterProvider } from 'react-router';

// Components
import CartContent from '@/components/cart/cart-content';
import { AllProvidersWrapper } from '@/test-utils/context-provider';

// Utils
import type { ShopperStores } from '@/scapi';

import { usePickup } from '@/extensions/bopis/context/pickup-context';

// Mock the pickup context
vi.mock('@/extensions/bopis/context/pickup-context', () => ({
    usePickup: vi.fn(() => null),
}));

// `<Await resolve>` tracks promises by identity. Share a single already-resolved instance for
// tests that don't exercise rule-based bonus carousels — a per-call `Promise.resolve({})` would
// re-suspend the boundary every render and break unrelated assertions.
const EMPTY_RULE_BASED_BONUS_PRODUCTS: Promise<Record<string, never>> = Promise.resolve({});

const renderCartContent = (props: Omit<React.ComponentProps<typeof CartContent>, 'ruleBasedBonusProductsPromise'>) => {
    // Using createMemoryRouter in framework mode is fine
    // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
    // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
    const router = createMemoryRouter(
        [
            {
                path: '/cart',
                element: (
                    <AllProvidersWrapper>
                        <CartContent ruleBasedBonusProductsPromise={EMPTY_RULE_BASED_BONUS_PRODUCTS} {...props} />
                    </AllProvidersWrapper>
                ),
            },
        ],
        { initialEntries: ['/cart'] }
    );

    return render(<RouterProvider router={router} />);
};

describe('CartContent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset pickup mock to return null by default
        vi.mocked(usePickup).mockReturnValue(null);
    });

    const mockBasket = {
        basketId: 'test-basket-id',
        productItems: [
            { itemId: 'item-1', quantity: 2, productId: 'product-1' },
            { itemId: 'item-2', quantity: 1, productId: 'product-2' },
        ],
    };

    const mockProductMap = {
        'item-1': { id: 'product-1', name: 'Product 1', variants: [{} as any] },
        'item-2': { id: 'product-2', name: 'Product 2', variants: [{} as any] },
    } as any;

    const mockBonusProductsById: Record<string, import('@/scapi').ShopperProducts.schemas['Product']> = {};

    describe('BOPIS (Buy Online Pickup In Store) functionality', () => {
        const mockStore: ShopperStores.schemas['Store'] = {
            id: 'store-1',
            name: 'Test Store',
            inventoryId: 'inventory-1',
            address1: '123 Test St',
            city: 'Test City',
            stateCode: 'CA',
            postalCode: '12345',
            countryCode: 'US',
        };

        const createPickupContext = (productIds: string[], store?: ShopperStores.schemas['Store']) => {
            const pickupBasketItems = new Map();
            productIds.forEach((productId) => {
                pickupBasketItems.set(productId, {
                    inventoryId: 'inventory-1',
                    storeId: 'store-1',
                });
            });

            const pickupStores = new Map();
            if (store) {
                pickupStores.set(store.id, store);
            }

            return {
                pickupBasketItems,
                pickupStores,
                addItem: vi.fn(),
                removeItem: vi.fn(),
                clearItems: vi.fn(),
            };
        };

        test('renders delivery items when no pickup items exist', () => {
            vi.mocked(usePickup).mockReturnValue(null);

            renderCartContent({
                basket: mockBasket,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            // All items should be rendered as delivery items
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
            // Pickup store info should not be rendered
            expect(screen.queryByTestId('cart-pickup-card')).not.toBeInTheDocument();
        });

        test('renders pickup items grouped with store info when pickup items exist', () => {
            const pickupContext = createPickupContext(['product-1'], mockStore);
            vi.mocked(usePickup).mockReturnValue(pickupContext);

            const basketWithPickupShipment = {
                ...mockBasket,
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        c_fromStoreId: 'store-1',
                    },
                    {
                        shipmentId: 'shipment-2',
                    },
                ],
                productItems: [
                    { itemId: 'item-1', quantity: 2, productId: 'product-1', shipmentId: 'shipment-1' },
                    { itemId: 'item-2', quantity: 1, productId: 'product-2', shipmentId: 'shipment-2' },
                ],
            };

            renderCartContent({
                basket: basketWithPickupShipment,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            // Pickup store info should be rendered
            expect(screen.getByTestId('cart-pickup-card')).toBeInTheDocument();
            expect(screen.getByText(/Pick up in/i)).toBeInTheDocument();
            expect(screen.getByText('Test Store')).toBeInTheDocument();

            // Pickup item should be rendered
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            // Delivery item should be rendered separately
            expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
        });

        test('filters pickup items from delivery items', () => {
            const pickupContext = createPickupContext(['product-1'], mockStore);
            vi.mocked(usePickup).mockReturnValue(pickupContext);

            const basketWithThreeItems = {
                ...mockBasket,
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        c_fromStoreId: 'store-1',
                    },
                    {
                        shipmentId: 'shipment-2',
                    },
                ],
                productItems: [
                    { itemId: 'item-1', quantity: 2, productId: 'product-1', shipmentId: 'shipment-1' },
                    { itemId: 'item-2', quantity: 1, productId: 'product-2', shipmentId: 'shipment-2' },
                    { itemId: 'item-3', quantity: 1, productId: 'product-3', shipmentId: 'shipment-2' },
                ],
            };

            const productMapWithThree = {
                ...mockProductMap,
                'item-3': { id: 'product-3', name: 'Product 3', variants: [{} as any] },
            };

            renderCartContent({
                basket: basketWithThreeItems,
                productsByItemId: productMapWithThree,
                bonusProductsById: mockBonusProductsById,
            });

            // Pickup item (product-1) should be in pickup section
            expect(screen.getByTestId('cart-pickup-card')).toBeInTheDocument();
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();

            // Delivery items (product-2, product-3) should be in delivery section
            expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
            expect(screen.getByTestId('sf-product-item-product-3')).toBeInTheDocument();
        });

        test('renders only delivery items when all items are for pickup but no store info', () => {
            const pickupContext = createPickupContext(['product-1', 'product-2'], undefined);
            vi.mocked(usePickup).mockReturnValue(pickupContext);

            renderCartContent({
                basket: mockBasket,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            // No pickup store info should be rendered (no store available)
            expect(screen.queryByTestId('cart-pickup-card')).not.toBeInTheDocument();
            // Items should still be rendered as delivery items
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
        });

        test('handles items without productId in pickup context', () => {
            const pickupContext = createPickupContext(['product-1'], mockStore);
            vi.mocked(usePickup).mockReturnValue(pickupContext);

            const basketWithMissingProductId = {
                ...mockBasket,
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        c_fromStoreId: 'store-1',
                    },
                    {
                        shipmentId: 'shipment-2',
                    },
                ],
                productItems: [
                    { itemId: 'item-1', quantity: 2, productId: 'product-1', shipmentId: 'shipment-1' },
                    { itemId: 'item-2', quantity: 1, shipmentId: 'shipment-2' }, // No productId but has shipmentId
                ],
            };

            renderCartContent({
                basket: basketWithMissingProductId,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            // Pickup item should be rendered
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            // Item without productId should be rendered as delivery (not filtered out)
            expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
        });

        test('renders all items as delivery when pickup context returns empty map', () => {
            const pickupContext = {
                pickupBasketItems: new Map(),
                pickupStores: new Map(),
                addItem: vi.fn(),
                removeItem: vi.fn(),
                clearItems: vi.fn(),
            };
            vi.mocked(usePickup).mockReturnValue(pickupContext);

            renderCartContent({
                basket: mockBasket,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            // All items should be rendered as delivery items
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
            // No pickup store info should be rendered
            expect(screen.queryByTestId('cart-pickup-card')).not.toBeInTheDocument();
        });
    });
});
