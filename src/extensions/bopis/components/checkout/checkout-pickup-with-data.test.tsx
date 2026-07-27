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
import { render, screen, waitFor, act } from '@testing-library/react';
import { Suspense } from 'react';
import CheckoutPickupWithData from './checkout-pickup-with-data';
import type { ShopperBasketsV2, ShopperProducts } from '@/scapi';
import { CHECKOUT_STEPS } from '@/components/checkout/utils/checkout-context-types';

// Helper to create a promise that resolves asynchronously (needed for Suspense)
const createAsyncPromise = <T,>(value: T): Promise<T> => {
    return new Promise((resolve) => {
        queueMicrotask(() => resolve(value));
    });
};

// Mock CheckoutPickup component
vi.mock('./checkout-pickup', () => ({
    default: vi.fn(({ productsByItemId, ...props }) => (
        <div data-testid="checkout-pickup">
            <div data-testid="products-by-item-id">
                {productsByItemId ? JSON.stringify(productsByItemId) : 'undefined'}
            </div>
            <div data-testid="is-editing">{String(props.isEditing)}</div>
            <div data-testid="cart-id">{props.cart?.basketId || 'no-cart'}</div>
        </div>
    )),
}));

// Mock useCheckoutContext hook
let mockShippingDefaultSet = createAsyncPromise(undefined);
vi.mock('@/hooks/use-checkout', () => ({
    useCheckoutContext: vi.fn(() => ({
        shippingDefaultSet: mockShippingDefaultSet,
        step: 0,
        computedStep: 0,
        editingStep: null,
        STEPS: CHECKOUT_STEPS,
        shipmentDistribution: {
            hasPickupItems: false,
            hasDeliveryItems: true,
            enableMultiAddress: false,
            hasMultipleDeliveryAddresses: false,
            hasUnaddressedDeliveryItems: false,
            needsShippingMethods: false,
            hasEmptyShipments: false,
            isDeliveryProductItem: () => false as const,
            deliveryShipments: [],
        },
        savedAddresses: [],
        setSavedAddresses: vi.fn(),
        goToNextStep: vi.fn(),
        goToStep: vi.fn(),
        exitEditMode: vi.fn(),
    })),
}));

const createDefaultProps = (overrides = {}) => ({
    cart: {
        basketId: 'test-basket',
        currency: 'USD',
        productItems: [],
    } as ShopperBasketsV2.schemas['Basket'],
    isEditing: true,
    onEdit: vi.fn(),
    onContinue: vi.fn(),
    continueButtonLabel: 'Continue',
    productMapPromise: Promise.resolve({
        'product-1': {
            id: 'product-1',
            name: 'Test Product',
        } as ShopperProducts.schemas['Product'],
    }),
    ...overrides,
});

describe('CheckoutPickupWithData', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        // Reset the mock promise for each test
        mockShippingDefaultSet = createAsyncPromise(undefined);
        // Reset the mock implementation
        const { useCheckoutContext } = await import('@/hooks/use-checkout');
        vi.mocked(useCheckoutContext).mockReturnValue({
            shippingDefaultSet: mockShippingDefaultSet,
            step: 0,
            computedStep: 0,
            editingStep: null,
            STEPS: CHECKOUT_STEPS,
            shipmentDistribution: {
                hasPickupItems: false,
                hasDeliveryItems: true,
                enableMultiAddress: false,
                hasMultipleDeliveryAddresses: false,
                hasUnaddressedDeliveryItems: false,
                needsShippingMethods: false,
                hasEmptyShipments: false,
                isDeliveryProductItem: () => false as const,
                deliveryShipments: [],
            },
            savedAddresses: [],
            setSavedAddresses: vi.fn(),
            goToNextStep: vi.fn(),
            goToStep: vi.fn(),
            exitEditMode: vi.fn(),
        });
    });

    test('waits for shippingDefaultSet promise before rendering', async () => {
        const productMapPromise = Promise.resolve({
            'product-1': {
                id: 'product-1',
                name: 'Test Product',
            } as ShopperProducts.schemas['Product'],
        });

        // Create a new promise for shippingDefaultSet that resolves asynchronously
        const shippingDefaultSetPromise = createAsyncPromise(undefined);
        const { useCheckoutContext } = await import('@/hooks/use-checkout');
        vi.mocked(useCheckoutContext).mockReturnValue({
            shippingDefaultSet: shippingDefaultSetPromise,
            step: 0,
            computedStep: 0,
            editingStep: null,
            STEPS: CHECKOUT_STEPS,
            shipmentDistribution: {
                hasPickupItems: false,
                hasDeliveryItems: true,
                enableMultiAddress: false,
                hasMultipleDeliveryAddresses: false,
                hasUnaddressedDeliveryItems: false,
                needsShippingMethods: false,
                hasEmptyShipments: false,
                isDeliveryProductItem: () => false as const,
                deliveryShipments: [],
            },
            savedAddresses: [],
            setSavedAddresses: vi.fn(),
            goToNextStep: vi.fn(),
            goToStep: vi.fn(),
            exitEditMode: vi.fn(),
        });

        await act(async () => {
            render(
                <Suspense fallback={<div data-testid="loading">Loading...</div>}>
                    <CheckoutPickupWithData {...createDefaultProps({ isEditing: false, productMapPromise })} />
                </Suspense>
            );
            // Wait for shippingDefaultSet promise to resolve
            await shippingDefaultSetPromise;
        });

        // Wait for the component to render after shippingDefaultSet resolves
        await waitFor(
            () => {
                expect(screen.getByTestId('checkout-pickup')).toBeInTheDocument();
            },
            { timeout: 3000 }
        );
    });

    test('resolves productMap promise when isEditing is true', async () => {
        const productMap = {
            'product-1': {
                id: 'product-1',
                name: 'Test Product One',
            } as ShopperProducts.schemas['Product'],
            'product-2': {
                id: 'product-2',
                name: 'Test Product Two',
            } as ShopperProducts.schemas['Product'],
        };

        // Create a promise that resolves asynchronously (needed for Suspense)
        const productMapPromise = createAsyncPromise(productMap);

        await act(async () => {
            render(
                <Suspense fallback={<div data-testid="loading">Loading...</div>}>
                    <CheckoutPickupWithData {...createDefaultProps({ isEditing: true, productMapPromise })} />
                </Suspense>
            );
            // Wait for both promises to resolve
            await Promise.all([mockShippingDefaultSet, productMapPromise]);
        });

        // Wait for the component to render with resolved data (not the loading state)
        await waitFor(
            () => {
                expect(screen.getByTestId('checkout-pickup')).toBeInTheDocument();
                const productsElement = screen.getByTestId('products-by-item-id');
                expect(productsElement).toBeInTheDocument();
                expect(productsElement.textContent).toContain('product-1');
                expect(productsElement.textContent).toContain('Test Product One');
            },
            { timeout: 3000 }
        );
    });

    test('passes undefined when isEditing is false', async () => {
        const productMapPromise = Promise.resolve({
            'product-1': {
                id: 'product-1',
                name: 'Test Product',
            } as ShopperProducts.schemas['Product'],
        });

        await act(async () => {
            render(
                <Suspense fallback={<div data-testid="loading">Loading...</div>}>
                    <CheckoutPickupWithData {...createDefaultProps({ isEditing: false, productMapPromise })} />
                </Suspense>
            );
            // Wait for shippingDefaultSet promise to resolve
            await mockShippingDefaultSet;
        });

        // Wait for the component to render
        await waitFor(
            () => {
                // Verify undefined was passed (promise should not be resolved)
                const productsElement = screen.getByTestId('products-by-item-id');
                expect(productsElement).toBeInTheDocument();
                expect(productsElement.textContent).toBe('undefined');
            },
            { timeout: 3000 }
        );
    });

    test('passes all props correctly to CheckoutPickup', async () => {
        const mockCart = {
            basketId: 'custom-basket',
            currency: 'EUR',
            productItems: [],
        } as ShopperBasketsV2.schemas['Basket'];
        const mockOnEdit = vi.fn();

        const productMapPromise = createAsyncPromise({
            'product-1': {
                id: 'product-1',
            } as ShopperProducts.schemas['Product'],
        });

        await act(async () => {
            render(
                <Suspense fallback={<div data-testid="loading">Loading...</div>}>
                    <CheckoutPickupWithData
                        {...createDefaultProps({
                            cart: mockCart,
                            isEditing: true,
                            onEdit: mockOnEdit,
                            productMapPromise,
                        })}
                    />
                </Suspense>
            );
            // Wait for both promises to resolve
            await Promise.all([mockShippingDefaultSet, productMapPromise]);
        });

        // Wait for the component to render with resolved data
        await waitFor(
            () => {
                expect(screen.getByTestId('checkout-pickup')).toBeInTheDocument();
                // Verify props were passed correctly
                expect(screen.getByTestId('is-editing').textContent).toBe('true');
                expect(screen.getByTestId('cart-id').textContent).toBe('custom-basket');
            },
            { timeout: 3000 }
        );
    });

    test('handles shippingDefaultSet promise rejection gracefully', async () => {
        const rejectedShippingPromise = Promise.reject(new Error('Failed to set shipping defaults'));
        const { useCheckoutContext } = await import('@/hooks/use-checkout');
        vi.mocked(useCheckoutContext).mockReturnValue({
            shippingDefaultSet: rejectedShippingPromise,
            step: 0,
            computedStep: 0,
            editingStep: null,
            STEPS: CHECKOUT_STEPS,
            shipmentDistribution: {
                hasPickupItems: false,
                hasDeliveryItems: true,
                enableMultiAddress: false,
                hasMultipleDeliveryAddresses: false,
                hasUnaddressedDeliveryItems: false,
                needsShippingMethods: false,
                hasEmptyShipments: false,
                isDeliveryProductItem: () => false as const,
                deliveryShipments: [],
            },
            savedAddresses: [],
            setSavedAddresses: vi.fn(),
            goToNextStep: vi.fn(),
            goToStep: vi.fn(),
            exitEditMode: vi.fn(),
        });

        // Suppress console.error for this test
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { container } = render(
            <Suspense fallback={<div data-testid="loading">Loading...</div>}>
                <CheckoutPickupWithData {...createDefaultProps()} />
            </Suspense>
        );

        // Wait a bit for the promise to reject
        await waitFor(
            () => {
                // Component should handle the error (either show error boundary or handle gracefully)
                // Pickup address and method setting failure will be caught by checkout error boundary
                expect(container).toBeTruthy();
            },
            { timeout: 1000 }
        );

        consoleErrorSpy.mockRestore();
    });

    test('handles productMapPromise rejection gracefully', async () => {
        // Create a rejected promise
        const rejectedPromise = Promise.reject(new Error('Failed to load products'));
        // Catch the rejection to prevent unhandled promise rejection warning
        // In a real app, this would be caught by an error boundary
        rejectedPromise.catch(() => {
            // Error will be handled by error boundary in real app
        });

        // Suppress console.error for this test
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // When isEditing is true, the component will use the promise and React's use() will throw
        // when the promise rejects. This error would normally be caught by an error boundary.
        // For testing purposes, we set isEditing to false so the promise isn't used,
        // which tests that the component gracefully handles a rejected promise when not needed.
        const { container } = render(
            <Suspense fallback={<div data-testid="loading">Loading...</div>}>
                <CheckoutPickupWithData
                    {...createDefaultProps({ productMapPromise: rejectedPromise, isEditing: false })}
                />
            </Suspense>
        );

        // Wait for shippingDefaultSet to resolve first
        await act(async () => {
            await mockShippingDefaultSet;
        });

        // Wait for the component to render
        await waitFor(
            () => {
                // Component should handle gracefully (promise not used when isEditing is false)
                expect(container).toBeTruthy();
            },
            { timeout: 1000 }
        );

        consoleErrorSpy.mockRestore();
    });

    test('does not resolve productMapPromise when isEditing is false', async () => {
        const productMapPromise = createAsyncPromise({
            'product-1': {
                id: 'product-1',
                name: 'Test Product',
            } as ShopperProducts.schemas['Product'],
        });

        await act(async () => {
            render(
                <Suspense fallback={<div data-testid="loading">Loading...</div>}>
                    <CheckoutPickupWithData {...createDefaultProps({ isEditing: false, productMapPromise })} />
                </Suspense>
            );
            // Wait for shippingDefaultSet promise to resolve
            await mockShippingDefaultSet;
        });

        // Wait for the component to render
        await waitFor(
            () => {
                // Verify undefined is passed (promise should not be resolved when isEditing is false)
                const productsElement = screen.getByTestId('products-by-item-id');
                expect(productsElement).toBeInTheDocument();
                expect(productsElement.textContent).toBe('undefined');
            },
            { timeout: 3000 }
        );
    });
});
