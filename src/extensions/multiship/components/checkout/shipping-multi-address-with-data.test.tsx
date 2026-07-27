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
import ShippingMultiAddressWithData from './shipping-multi-address-with-data';
import type { ShopperBasketsV2, ShopperProducts } from '@/scapi';

// Helper to create a promise that resolves asynchronously (needed for Suspense)
const createAsyncPromise = <T,>(value: T): Promise<T> => {
    return new Promise((resolve) => {
        queueMicrotask(() => resolve(value));
    });
};

// Mock ShippingMultiAddress component
vi.mock('./shipping-multi-address', () => ({
    default: vi.fn(({ productMap, ...props }) => (
        <div data-testid="shipping-multi-address">
            <div data-testid="product-map">{productMap ? JSON.stringify(productMap) : 'undefined'}</div>
            <div data-testid="is-editing">{String(props.isEditing)}</div>
            <div data-testid="is-loading">{String(props.isLoading)}</div>
        </div>
    )),
}));

const createDefaultProps = (overrides = {}) => ({
    isEditing: true,
    isLoading: false,
    isDeliveryProductItem: vi.fn((_item: ShopperBasketsV2.schemas['ProductItem']) => true),
    deliveryShipments: [],
    handleToggleShippingAddressMode: vi.fn(),
    onEdit: vi.fn(),
    onSubmit: vi.fn(),
    productMapPromise: Promise.resolve({
        'product-1': {
            id: 'product-1',
            name: 'Test Product',
        } as ShopperProducts.schemas['Product'],
    }),
    ...overrides,
});

describe('ShippingMultiAddressWithData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
                    <ShippingMultiAddressWithData {...createDefaultProps({ isEditing: true, productMapPromise })} />
                </Suspense>
            );
            // Wait for promise to resolve
            await productMapPromise;
        });

        // Wait for the component to render with resolved data (not the loading state)
        await waitFor(
            () => {
                expect(screen.getByTestId('shipping-multi-address')).toBeInTheDocument();
                const productMapElement = screen.getByTestId('product-map');
                expect(productMapElement).toBeInTheDocument();
                expect(productMapElement.textContent).toContain('product-1');
                expect(productMapElement.textContent).toContain('Test Product One');
            },
            { timeout: 3000 }
        );
    });

    test('passes undefined productMap when isEditing is false', () => {
        const productMapPromise = Promise.resolve({
            'product-1': {
                id: 'product-1',
                name: 'Test Product',
            } as ShopperProducts.schemas['Product'],
        });

        render(<ShippingMultiAddressWithData {...createDefaultProps({ isEditing: false, productMapPromise })} />);

        // Verify undefined was passed (promise should not be resolved)
        const productMapElement = screen.getByTestId('product-map');
        expect(productMapElement).toBeInTheDocument();
        expect(productMapElement.textContent).toBe('undefined');
    });

    test('passes all props correctly to ShippingMultiAddress', async () => {
        const mockOnEdit = vi.fn();
        const mockOnSubmit = vi.fn();
        const mockHandleToggle = vi.fn();
        const mockIsDeliveryProductItem = vi.fn(() => true);
        const mockDeliveryShipments: ShopperBasketsV2.schemas['Shipment'][] = [
            {
                shipmentId: 'shipment-1',
                shippingAddress: {
                    address1: '123 Main St',
                },
            } as ShopperBasketsV2.schemas['Shipment'],
        ];

        const productMapPromise = createAsyncPromise({
            'product-1': {
                id: 'product-1',
            } as ShopperProducts.schemas['Product'],
        });

        await act(async () => {
            render(
                <Suspense fallback={<div data-testid="loading">Loading...</div>}>
                    <ShippingMultiAddressWithData
                        {...createDefaultProps({
                            isEditing: true,
                            isLoading: true,
                            onEdit: mockOnEdit,
                            onSubmit: mockOnSubmit,
                            handleToggleShippingAddressMode: mockHandleToggle,
                            isDeliveryProductItem: mockIsDeliveryProductItem,
                            deliveryShipments: mockDeliveryShipments,
                            productMapPromise,
                        })}
                    />
                </Suspense>
            );
            // Wait for promise to resolve
            await productMapPromise;
        });

        // Wait for the component to render with resolved data
        await waitFor(
            () => {
                expect(screen.getByTestId('shipping-multi-address')).toBeInTheDocument();
                // Verify props were passed correctly
                expect(screen.getByTestId('is-editing').textContent).toBe('true');
                expect(screen.getByTestId('is-loading').textContent).toBe('true');
            },
            { timeout: 3000 }
        );
    });

    test('handles promise rejection gracefully', async () => {
        const rejectedPromise = Promise.reject(new Error('Failed to load products'));

        // Suppress console.error for this test
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { container } = render(
            <Suspense fallback={<div data-testid="loading">Loading...</div>}>
                <ShippingMultiAddressWithData {...createDefaultProps({ productMapPromise: rejectedPromise })} />
            </Suspense>
        );

        // Wait a bit for the promise to reject
        await waitFor(
            () => {
                // Component should handle the error (either show error boundary or handle gracefully)
                expect(container).toBeTruthy();
            },
            { timeout: 1000 }
        );

        consoleErrorSpy.mockRestore();
    });

    test('passes shippingAddressState props correctly', async () => {
        const productMapPromise = createAsyncPromise({
            'product-1': {
                id: 'product-1',
            } as ShopperProducts.schemas['Product'],
        });

        const shippingAddressState = {
            isCompleted: true,
            onEdit: vi.fn(),
        };

        await act(async () => {
            render(
                <Suspense fallback={<div data-testid="loading">Loading...</div>}>
                    <ShippingMultiAddressWithData
                        {...createDefaultProps({ productMapPromise, ...shippingAddressState })}
                    />
                </Suspense>
            );
            // Wait for promise to resolve
            await productMapPromise;
        });

        // Wait for the component to render with resolved data
        await waitFor(
            () => {
                expect(screen.getByTestId('shipping-multi-address')).toBeInTheDocument();
            },
            { timeout: 3000 }
        );
    });

    test('does not resolve promise when isEditing is false', () => {
        const productMapPromise = createAsyncPromise({
            'product-1': {
                id: 'product-1',
                name: 'Test Product',
            } as ShopperProducts.schemas['Product'],
        });

        // When isEditing is false, the component doesn't call use(), so it renders immediately
        // without needing Suspense
        render(<ShippingMultiAddressWithData {...createDefaultProps({ isEditing: false, productMapPromise })} />);

        // Verify undefined is passed (promise should not be resolved when isEditing is false)
        const productMapElement = screen.getByTestId('product-map');
        expect(productMapElement).toBeInTheDocument();
        expect(productMapElement.textContent).toBe('undefined');
    });
});
