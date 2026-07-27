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
import { render, waitFor } from '@testing-library/react';

// React Router
import { createMemoryRouter, RouterProvider } from 'react-router';

// Components
import { CartItemModal as CartItemEditModal } from '@/components/cart-item-modal';

// Mock data
import { variantProduct } from '@/components/__mocks__/master-variant-product';

// Utils
import { AllProvidersWrapper } from '@/test-utils/context-provider';

import PickupProvider from '@/extensions/bopis/context/pickup-context';
import { createMockBasketWithPickupItems } from '@/extensions/bopis/tests/__mocks__/basket';

// Mock useScapiFetcher to prevent actual API calls
const mockLoad = vi.fn().mockResolvedValue(undefined);
const mockSubmit = vi.fn().mockResolvedValue(undefined);

// Create a mock fetcher result that matches the ScapiFetcher type
const createMockFetcher = (data: typeof variantProduct) => ({
    load: mockLoad,
    submit: mockSubmit,
    data,
    errors: undefined,
    success: true,
    state: 'idle' as const,
    Form: vi.fn(),
    formMethod: undefined,
    formAction: undefined,
    formData: undefined,
    formEncType: undefined,
    json: undefined,
    text: undefined,
});

vi.mock('@/hooks/use-scapi-fetcher', () => ({
    useScapiFetcher: vi.fn(() => createMockFetcher(variantProduct)),
}));

describe('CartItemEditModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        product: variantProduct,
        initialQuantity: 1,
        itemId: 'test-item-id',
    };

    describe('pickup inventory fetching', () => {
        beforeEach(async () => {
            mockLoad.mockClear();
            mockSubmit.mockClear();
            // Reset the mock implementation
            const { useScapiFetcher } = await import('@/hooks/use-scapi-fetcher');
            vi.mocked(useScapiFetcher).mockReturnValue(createMockFetcher(variantProduct) as any);
        });

        test('includes inventoryIds when editing pickup item', async () => {
            const { useScapiFetcher } = await import('@/hooks/use-scapi-fetcher');
            const allCapturedCalls: any[] = [];

            // Mock useScapiFetcher to capture all calls
            vi.mocked(useScapiFetcher).mockImplementation((_service, _method, options) => {
                allCapturedCalls.push({ service: _service, method: _method, params: (options as any)?.params });
                return createMockFetcher(variantProduct) as any;
            });

            // Setup pickup context with the item marked for pickup
            const basket = createMockBasketWithPickupItems([
                { productId: 'variant-product-id', inventoryId: 'inventory-store-123', storeId: 'store-123' },
            ]);

            const router = createMemoryRouter(
                [
                    {
                        path: '/',
                        element: (
                            <PickupProvider basket={basket}>
                                <AllProvidersWrapper>
                                    <CartItemEditModal
                                        {...defaultProps}
                                        product={{ ...variantProduct, id: 'variant-product-id' }}
                                    />
                                </AllProvidersWrapper>
                            </PickupProvider>
                        ),
                    },
                ],
                {
                    initialEntries: ['/'],
                }
            );
            render(<RouterProvider router={router} />);

            await waitFor(() => {
                // The variant fetcher (edit-mode) should include inventoryIds for a pickup item.
                // There are two getProduct calls (initial + variant fetcher); find the one with inventoryIds.
                const pickupCall = allCapturedCalls.find(
                    (call) =>
                        call.service === 'shopperProducts' &&
                        call.method === 'getProduct' &&
                        call.params?.query?.inventoryIds !== undefined
                );
                expect(pickupCall).toBeDefined();
                expect(pickupCall?.params?.query?.inventoryIds).toEqual(['inventory-store-123']);
            });
        });

        test('does not include inventoryIds when editing non-pickup item', async () => {
            const { useScapiFetcher } = await import('@/hooks/use-scapi-fetcher');
            const allCapturedCalls: any[] = [];

            // Mock useScapiFetcher to capture all calls
            vi.mocked(useScapiFetcher).mockImplementation((_service, _method, options) => {
                allCapturedCalls.push({ service: _service, method: _method, params: (options as any)?.params });
                return createMockFetcher(variantProduct) as any;
            });

            // Setup pickup context without the item (not a pickup item)
            const basket = createMockBasketWithPickupItems([]);

            const router = createMemoryRouter(
                [
                    {
                        path: '/',
                        element: (
                            <PickupProvider basket={basket}>
                                <AllProvidersWrapper>
                                    <CartItemEditModal {...defaultProps} />
                                </AllProvidersWrapper>
                            </PickupProvider>
                        ),
                    },
                ],
                {
                    initialEntries: ['/'],
                }
            );
            render(<RouterProvider router={router} />);

            await waitFor(() => {
                // None of the getProduct calls should include inventoryIds for a non-pickup item.
                const hasInventoryIdsCall = allCapturedCalls.some(
                    (call) =>
                        call.service === 'shopperProducts' &&
                        call.method === 'getProduct' &&
                        call.params?.query?.inventoryIds !== undefined
                );
                expect(hasInventoryIdsCall).toBe(false);
            });
        });

        test('works without pickup context', async () => {
            const { useScapiFetcher } = await import('@/hooks/use-scapi-fetcher');
            const allCapturedCalls: any[] = [];

            // Mock useScapiFetcher to capture all calls
            vi.mocked(useScapiFetcher).mockImplementation((_service, _method, options) => {
                allCapturedCalls.push({ service: _service, method: _method, params: (options as any)?.params });
                return createMockFetcher(variantProduct) as any;
            });

            // Render without PickupProvider (pickup context is null)
            const router = createMemoryRouter(
                [
                    {
                        path: '/',
                        element: (
                            <AllProvidersWrapper>
                                <CartItemEditModal {...defaultProps} />
                            </AllProvidersWrapper>
                        ),
                    },
                ],
                {
                    initialEntries: ['/'],
                }
            );
            render(<RouterProvider router={router} />);

            await waitFor(() => {
                // Without pickup context no getProduct call should include inventoryIds.
                const hasInventoryIdsCall = allCapturedCalls.some(
                    (call) =>
                        call.service === 'shopperProducts' &&
                        call.method === 'getProduct' &&
                        call.params?.query?.inventoryIds !== undefined
                );
                expect(hasInventoryIdsCall).toBe(false);
            });
        });
    });
});
