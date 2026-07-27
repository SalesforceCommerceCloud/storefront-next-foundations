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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeliveryOptions } from './use-delivery-options';
import { DELIVERY_OPTIONS } from '../constants';
import { masterProductWithInventories } from '@/components/__mocks__/master-product-with-inventories';
import { isStoreOutOfStock, isSiteOutOfStock } from '@/lib/product/inventory-utils';
import { usePickup } from '@/extensions/bopis/context/pickup-context';

// Mock the pickup context
vi.mock('@/extensions/bopis/context/pickup-context', () => ({
    usePickup: vi.fn(() => ({
        addItem: vi.fn(),
        removeItem: vi.fn(),
        pickupBasketItems: new Map(),
        pickupStores: new Map(),
        clearItems: vi.fn(),
    })),
}));

// Mock the store locator
vi.mock('@/extensions/store-locator/providers/store-locator', () => ({
    useStoreLocator: vi.fn((selector) => {
        const mockState = { isOpen: false };
        return selector ? selector(mockState) : mockState;
    }),
}));

// Mock the inventory utils
vi.mock('@/lib/product/inventory-utils', async () => {
    const actual = await vi.importActual('@/lib/product/inventory-utils');
    return {
        ...actual,
        isStoreOutOfStock: vi.fn(),
        isSiteOutOfStock: vi.fn(),
    };
});

// Use the mock product from __mocks__ directory
const mockProduct = masterProductWithInventories;

const mockStoreInfo = {
    id: 'store-1',
    inventoryId: 'inventory_m',
    name: 'Test Store',
    address: '123 Test St',
};

describe('useDeliveryOptions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns default delivery option initially', () => {
        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() =>
            useDeliveryOptions({ product: mockProduct, quantity: 1, isInBasket: false, pickupStore: null })
        );

        expect(result.current.selectedDeliveryOption).toBeUndefined();
        // Pickup is disabled when no store is selected or store is out of stock
        expect(result.current.isStoreOutOfStock).toBe(false);
    });

    it('returns pickup as available when store has inventory', () => {
        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() =>
            useDeliveryOptions({ product: mockProduct, quantity: 1, isInBasket: false, pickupStore: mockStoreInfo })
        );

        expect(result.current.selectedDeliveryOption).toBeUndefined();
        expect(result.current.isStoreOutOfStock).toBe(false);
    });

    it('disables pickup when store is out of stock', () => {
        vi.mocked(isStoreOutOfStock).mockReturnValue(true);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() =>
            useDeliveryOptions({ product: mockProduct, quantity: 1, isInBasket: false, pickupStore: mockStoreInfo })
        );

        expect(result.current.selectedDeliveryOption).toBeUndefined();
        expect(result.current.isStoreOutOfStock).toBe(true);
    });

    it('disables pickup when no store is selected', () => {
        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() =>
            useDeliveryOptions({ product: mockProduct, quantity: 1, isInBasket: false, pickupStore: null })
        );

        // Pickup is disabled when no store is selected (no inventoryId)
        expect(result.current.isStoreOutOfStock).toBe(false);
    });

    it('disables pickup when store has no inventory ID', () => {
        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() =>
            useDeliveryOptions({
                product: mockProduct,
                quantity: 1,
                isInBasket: false,
                pickupStore: { ...mockStoreInfo, inventoryId: undefined },
            })
        );

        // Store with no inventoryId has no inventory list — pickup is unavailable
        expect(result.current.isStoreOutOfStock).toBe(true);
    });

    it('allows changing delivery option', () => {
        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() =>
            useDeliveryOptions({ product: mockProduct, quantity: 1, isInBasket: false, pickupStore: mockStoreInfo })
        );

        act(() => {
            result.current.setSelectedDeliveryOption(DELIVERY_OPTIONS.PICKUP);
        });

        expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.PICKUP);
    });

    it('allows manual switching between delivery options', () => {
        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() =>
            useDeliveryOptions({ product: mockProduct, quantity: 1, isInBasket: false, pickupStore: mockStoreInfo })
        );

        // Initially no option is selected
        expect(result.current.selectedDeliveryOption).toBeUndefined();

        // Switch to pickup
        act(() => {
            result.current.setSelectedDeliveryOption(DELIVERY_OPTIONS.PICKUP);
        });
        expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.PICKUP);

        // Switch back to delivery
        act(() => {
            result.current.setSelectedDeliveryOption(DELIVERY_OPTIONS.DELIVERY);
        });
        expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);
    });

    it('handles quantity parameter', () => {
        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() =>
            useDeliveryOptions({
                product: mockProduct,
                quantity: 2,
                isInBasket: false,
                pickupStore: mockStoreInfo,
            })
        );

        expect(result.current.selectedDeliveryOption).toBeUndefined();
        expect(result.current.isStoreOutOfStock).toBe(false);
    });

    it('calls isStoreOutOfStock and isSiteOutOfStock with correct parameters', () => {
        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        renderHook(() =>
            useDeliveryOptions({ product: mockProduct, quantity: 1, isInBasket: false, pickupStore: mockStoreInfo })
        );

        // Should call isStoreOutOfStock with product, inventoryId, and quantity
        expect(isStoreOutOfStock).toHaveBeenCalledWith(mockProduct, 'inventory_m', 1);
        // Should call isSiteOutOfStock with product and quantity
        expect(isSiteOutOfStock).toHaveBeenCalledWith(mockProduct, 1);
    });

    describe('handleDeliveryOptionChange', () => {
        it('calls addItem when switching to PICKUP with product and store', () => {
            const mockAddPickupItem = vi.fn();
            const mockRemovePickupItem = vi.fn();

            vi.mocked(usePickup).mockReturnValue({
                addItem: mockAddPickupItem,
                removeItem: mockRemovePickupItem,
                pickupBasketItems: new Map(),
                pickupStores: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            const { result } = renderHook(() =>
                useDeliveryOptions({ product: mockProduct, quantity: 1, isInBasket: false, pickupStore: mockStoreInfo })
            );

            // Clear mocks after initial render to only test user-triggered calls
            mockAddPickupItem.mockClear();
            mockRemovePickupItem.mockClear();

            act(() => {
                result.current.handleDeliveryOptionChange(DELIVERY_OPTIONS.PICKUP);
            });

            expect(mockAddPickupItem).toHaveBeenCalledWith(mockProduct.id, mockStoreInfo.inventoryId, mockStoreInfo.id);
            expect(mockRemovePickupItem).not.toHaveBeenCalled();
        });

        it('calls removeItem when switching to DELIVERY', () => {
            const mockAddPickupItem = vi.fn();
            const mockRemovePickupItem = vi.fn();

            vi.mocked(usePickup).mockReturnValue({
                addItem: mockAddPickupItem,
                removeItem: mockRemovePickupItem,
                pickupBasketItems: new Map(),
                pickupStores: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            const { result } = renderHook(() =>
                useDeliveryOptions({ product: mockProduct, quantity: 1, isInBasket: false, pickupStore: mockStoreInfo })
            );

            // First switch to pickup
            act(() => {
                result.current.handleDeliveryOptionChange(DELIVERY_OPTIONS.PICKUP);
            });

            // Then switch back to delivery
            act(() => {
                result.current.handleDeliveryOptionChange(DELIVERY_OPTIONS.DELIVERY);
            });

            expect(mockRemovePickupItem).toHaveBeenCalledWith(mockProduct.id);
        });

        it('does not call addItem when switching to PICKUP without inventoryId', () => {
            const mockAddPickupItem = vi.fn();
            const mockRemovePickupItem = vi.fn();

            vi.mocked(usePickup).mockReturnValue({
                addItem: mockAddPickupItem,
                removeItem: mockRemovePickupItem,
                pickupBasketItems: new Map(),
                pickupStores: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            const { result } = renderHook(() =>
                useDeliveryOptions({
                    product: mockProduct,
                    quantity: 1,
                    isInBasket: false,
                    pickupStore: { ...mockStoreInfo, inventoryId: undefined },
                })
            );

            act(() => {
                result.current.handleDeliveryOptionChange(DELIVERY_OPTIONS.PICKUP);
            });

            expect(mockAddPickupItem).not.toHaveBeenCalled();
            expect(mockRemovePickupItem).not.toHaveBeenCalled();
        });
    });

    describe('auto-switching behavior', () => {
        it('auto-switches from PICKUP to DELIVERY when pickup becomes unavailable', async () => {
            let isStoreOOS = false;
            let isSiteOOS = false;

            vi.mocked(usePickup).mockReturnValue({
                addItem: vi.fn(),
                removeItem: vi.fn(),
                pickupBasketItems: new Map(),
                pickupStores: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(isStoreOutOfStock).mockImplementation(() => isStoreOOS);
            vi.mocked(isSiteOutOfStock).mockImplementation(() => isSiteOOS);

            const { result, rerender } = renderHook(
                ({ product, quantity }) =>
                    useDeliveryOptions({ product, quantity, isInBasket: false, pickupStore: mockStoreInfo }),
                {
                    initialProps: { product: mockProduct, quantity: 1 },
                }
            );

            // Switch to pickup
            act(() => {
                result.current.setSelectedDeliveryOption(DELIVERY_OPTIONS.PICKUP);
            });

            expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.PICKUP);

            // Now make pickup unavailable but delivery available
            isStoreOOS = true;
            isSiteOOS = false;

            // Force rerender with a new product object to trigger memo recalculation
            rerender({ product: { ...mockProduct }, quantity: 1 });

            await waitFor(
                () => {
                    expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);
                },
                { timeout: 3000 }
            );
        });

        it('auto-switches from DELIVERY to PICKUP when delivery becomes unavailable', async () => {
            let isStoreOOS = false;
            let isSiteOOS = false;

            vi.mocked(usePickup).mockReturnValue({
                addItem: vi.fn(),
                removeItem: vi.fn(),
                pickupBasketItems: new Map(),
                pickupStores: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(isStoreOutOfStock).mockImplementation(() => isStoreOOS);
            vi.mocked(isSiteOutOfStock).mockImplementation(() => isSiteOOS);

            const { result, rerender } = renderHook(
                ({ product, quantity }) =>
                    useDeliveryOptions({ product, quantity, isInBasket: false, pickupStore: mockStoreInfo }),
                {
                    initialProps: { product: mockProduct, quantity: 1 },
                }
            );

            // Explicitly select delivery first
            act(() => {
                result.current.setSelectedDeliveryOption(DELIVERY_OPTIONS.DELIVERY);
            });
            expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);

            // Now make delivery unavailable but pickup available
            isStoreOOS = false;
            isSiteOOS = true;

            // Force rerender with a new product object to trigger memo recalculation
            rerender({ product: { ...mockProduct }, quantity: 1 });

            await waitFor(
                () => {
                    expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.PICKUP);
                },
                { timeout: 3000 }
            );
        });

        it('does not switch when both options are unavailable', async () => {
            let isStoreOOS = true;
            let isSiteOOS = false;

            vi.mocked(usePickup).mockReturnValue({
                addItem: vi.fn(),
                removeItem: vi.fn(),
                pickupBasketItems: new Map(),
                pickupStores: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(isStoreOutOfStock).mockImplementation(() => isStoreOOS);
            vi.mocked(isSiteOutOfStock).mockImplementation(() => isSiteOOS);

            const { result } = renderHook(() =>
                useDeliveryOptions({ product: mockProduct, quantity: 1, isInBasket: false, pickupStore: mockStoreInfo })
            );

            act(() => {
                result.current.setSelectedDeliveryOption(DELIVERY_OPTIONS.DELIVERY);
            });
            expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);

            // Now make both unavailable
            isStoreOOS = true;
            isSiteOOS = true;

            // Wait a bit to ensure no change happens
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Should not change - stay on delivery
            expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);
        });

        it('does not switch when current option is still available', async () => {
            vi.mocked(usePickup).mockReturnValue({
                addItem: vi.fn(),
                removeItem: vi.fn(),
                pickupBasketItems: new Map(),
                pickupStores: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            const { result } = renderHook(() =>
                useDeliveryOptions({ product: mockProduct, quantity: 1, isInBasket: false, pickupStore: mockStoreInfo })
            );

            act(() => {
                result.current.setSelectedDeliveryOption(DELIVERY_OPTIONS.PICKUP);
            });

            expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.PICKUP);

            // Wait a bit to ensure no change happens
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Should stay on pickup since it's still available
            expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.PICKUP);
        });
    });

    describe('initial sync behavior', () => {
        it('syncs pickup item when hook mounts with PICKUP selected', () => {
            const mockAddItem = vi.fn();
            const mockRemoveItem = vi.fn();

            vi.mocked(usePickup).mockReturnValue({
                addItem: mockAddItem,
                removeItem: mockRemoveItem,
                pickupBasketItems: new Map(),
                pickupStores: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            // Clear any mocks from previous tests
            mockAddItem.mockClear();
            mockRemoveItem.mockClear();

            const { result } = renderHook(() =>
                useDeliveryOptions({ product: mockProduct, quantity: 1, isInBasket: false, pickupStore: mockStoreInfo })
            );

            // Initially undefined, no sync should happen
            expect(mockRemoveItem).not.toHaveBeenCalled();
            expect(mockAddItem).not.toHaveBeenCalled();

            mockAddItem.mockClear();
            mockRemoveItem.mockClear();

            // Switch to PICKUP
            act(() => {
                result.current.setSelectedDeliveryOption(DELIVERY_OPTIONS.PICKUP);
            });

            // Should now add the pickup item
            expect(mockAddItem).toHaveBeenCalledWith(mockProduct.id, mockStoreInfo.inventoryId, mockStoreInfo.id);
        });

        it('does not sync when store has no inventoryId', () => {
            const mockAddItem = vi.fn();
            const mockRemoveItem = vi.fn();

            vi.mocked(usePickup).mockReturnValue({
                addItem: mockAddItem,
                removeItem: mockRemoveItem,
                pickupBasketItems: new Map(),
                pickupStores: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            mockAddItem.mockClear();
            mockRemoveItem.mockClear();

            renderHook(() =>
                useDeliveryOptions({
                    product: mockProduct,
                    quantity: 1,
                    isInBasket: false,
                    pickupStore: { ...mockStoreInfo, inventoryId: undefined },
                })
            );

            // Should not call either function when inventoryId is missing
            expect(mockAddItem).not.toHaveBeenCalled();
            expect(mockRemoveItem).not.toHaveBeenCalled();
        });

        it('does not sync when pickupContext is null', () => {
            vi.mocked(usePickup).mockReturnValue(null);

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            renderHook(() =>
                useDeliveryOptions({ product: mockProduct, quantity: 1, isInBasket: false, pickupStore: mockStoreInfo })
            );

            // Should not throw and should handle null pickup context gracefully
            expect(true).toBe(true);
        });
    });

    describe('race condition handling - inventory data during revalidation', () => {
        it('returns false (not out of stock) when store is selected but product has no inventories array', () => {
            // Mock the helper functions to return true (out of stock) to verify they're not called
            vi.mocked(isStoreOutOfStock).mockReturnValue(true);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            // Product without inventories array (race condition scenario)
            const productWithoutInventories = {
                ...mockProduct,
                inventories: undefined,
            };

            const { result } = renderHook(() =>
                useDeliveryOptions({
                    product: productWithoutInventories,
                    quantity: 1,
                    isInBasket: false,
                    pickupStore: mockStoreInfo,
                })
            );

            // Should return false (not out of stock) to avoid false negatives during race condition
            expect(result.current.isStoreOutOfStock).toBe(false);
            // isStoreOutOfStock helper should not be called when race condition is detected
            expect(isStoreOutOfStock).not.toHaveBeenCalled();
        });

        it('returns false (not out of stock) when store is selected but product.inventories is empty array', () => {
            // Mock the helper functions to return true (out of stock) to verify they're not called
            vi.mocked(isStoreOutOfStock).mockReturnValue(true);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            // Product with empty inventories array (race condition scenario)
            const productWithEmptyInventories = {
                ...mockProduct,
                inventories: [],
            };

            const { result } = renderHook(() =>
                useDeliveryOptions({
                    product: productWithEmptyInventories,
                    quantity: 1,
                    isInBasket: false,
                    pickupStore: mockStoreInfo,
                })
            );

            // Should return false (not out of stock) to avoid false negatives during race condition
            expect(result.current.isStoreOutOfStock).toBe(false);
            // isStoreOutOfStock helper should not be called when race condition is detected
            expect(isStoreOutOfStock).not.toHaveBeenCalled();
        });

        it('calls isStoreOutOfStock helper when store is selected and product has inventories', () => {
            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            const { result } = renderHook(() =>
                useDeliveryOptions({
                    product: mockProduct, // Has inventories
                    quantity: 1,
                    isInBasket: false,
                    pickupStore: mockStoreInfo,
                })
            );

            // Should call the helper function when inventory data is available
            expect(isStoreOutOfStock).toHaveBeenCalledWith(mockProduct, mockStoreInfo.inventoryId, 1);
            expect(result.current.isStoreOutOfStock).toBe(false);
        });

        it('does not trigger race condition logic when no store is selected', () => {
            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            // Product without inventories, but no store selected
            const productWithoutInventories = {
                ...mockProduct,
                inventories: undefined,
            };

            const { result } = renderHook(() =>
                useDeliveryOptions({
                    product: productWithoutInventories,
                    quantity: 1,
                    isInBasket: false,
                    pickupStore: null, // No store selected
                })
            );

            // Should not trigger race condition logic when no store is selected
            // isStoreOutOfStock should still be called (with undefined inventoryId)
            expect(isStoreOutOfStock).toHaveBeenCalledWith(productWithoutInventories, undefined, 1);
            expect(result.current.isStoreOutOfStock).toBe(false);
        });

        it('does not trigger race condition logic when store has no inventoryId', () => {
            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            // Product without inventories, but store has no inventoryId
            const productWithoutInventories = {
                ...mockProduct,
                inventories: undefined,
            };

            const storeWithoutInventoryId = {
                ...mockStoreInfo,
                inventoryId: undefined,
            };

            const { result } = renderHook(() =>
                useDeliveryOptions({
                    product: productWithoutInventories,
                    quantity: 1,
                    isInBasket: false,
                    pickupStore: storeWithoutInventoryId,
                })
            );

            // Store with no inventoryId early-exits before reaching isStoreOutOfStock
            expect(isStoreOutOfStock).not.toHaveBeenCalled();
            expect(result.current.isStoreOutOfStock).toBe(true);
        });

        it('always calls isSiteOutOfStock regardless of race condition', () => {
            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(true);

            // Product without inventories (race condition scenario)
            const productWithoutInventories = {
                ...mockProduct,
                inventories: undefined,
            };

            const { result } = renderHook(() =>
                useDeliveryOptions({
                    product: productWithoutInventories,
                    quantity: 1,
                    isInBasket: false,
                    pickupStore: mockStoreInfo,
                })
            );

            // isSiteOutOfStock should always be called, even during race condition
            expect(isSiteOutOfStock).toHaveBeenCalledWith(productWithoutInventories, 1);
            expect(result.current.isSiteOutOfStock).toBe(true);
            // Store OOS should be false due to race condition handling
            expect(result.current.isStoreOutOfStock).toBe(false);
        });

        it('does NOT use race condition logic for product sets even when inventory is missing', () => {
            // Mock the helper functions to return true (out of stock) to verify they ARE called
            vi.mocked(isStoreOutOfStock).mockReturnValue(true);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            // Product set without inventories array
            const productSetWithoutInventories = {
                ...mockProduct,
                inventories: undefined,
                type: {
                    ...mockProduct.type,
                    set: true,
                },
            };

            const { result } = renderHook(() =>
                useDeliveryOptions({
                    product: productSetWithoutInventories,
                    quantity: 1,
                    isInBasket: false,
                    pickupStore: mockStoreInfo,
                })
            );

            // Sets should NOT use race condition logic - should call normal check
            expect(isStoreOutOfStock).toHaveBeenCalledWith(productSetWithoutInventories, mockStoreInfo.inventoryId, 1);
            // Should return the actual result from the helper (true = out of stock)
            expect(result.current.isStoreOutOfStock).toBe(true);
        });

        it('does NOT use race condition logic for product bundles even when inventory is missing', () => {
            // Mock the helper functions to return true (out of stock) to verify they ARE called
            vi.mocked(isStoreOutOfStock).mockReturnValue(true);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            // Product bundle without inventories array
            const productBundleWithoutInventories = {
                ...mockProduct,
                inventories: undefined,
                type: {
                    ...mockProduct.type,
                    bundle: true,
                },
            };

            const { result } = renderHook(() =>
                useDeliveryOptions({
                    product: productBundleWithoutInventories,
                    quantity: 1,
                    isInBasket: false,
                    pickupStore: mockStoreInfo,
                })
            );

            // Bundles should NOT use race condition logic - should call normal check
            expect(isStoreOutOfStock).toHaveBeenCalledWith(
                productBundleWithoutInventories,
                mockStoreInfo.inventoryId,
                1
            );
            // Should return the actual result from the helper (true = out of stock)
            expect(result.current.isStoreOutOfStock).toBe(true);
        });

        it('does NOT use race condition logic for product sets with empty inventories array', () => {
            // Mock the helper functions to return true (out of stock) to verify they ARE called
            vi.mocked(isStoreOutOfStock).mockReturnValue(true);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            // Product set with empty inventories array
            const productSetWithEmptyInventories = {
                ...mockProduct,
                inventories: [],
                type: {
                    ...mockProduct.type,
                    set: true,
                },
            };

            const { result } = renderHook(() =>
                useDeliveryOptions({
                    product: productSetWithEmptyInventories,
                    quantity: 1,
                    isInBasket: false,
                    pickupStore: mockStoreInfo,
                })
            );

            // Sets should NOT use race condition logic - should call normal check
            expect(isStoreOutOfStock).toHaveBeenCalledWith(
                productSetWithEmptyInventories,
                mockStoreInfo.inventoryId,
                1
            );
            // Should return the actual result from the helper (true = out of stock)
            expect(result.current.isStoreOutOfStock).toBe(true);
        });

        it('does NOT use race condition logic for product bundles with empty inventories array', () => {
            // Mock the helper functions to return true (out of stock) to verify they ARE called
            vi.mocked(isStoreOutOfStock).mockReturnValue(true);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            // Product bundle with empty inventories array
            const productBundleWithEmptyInventories = {
                ...mockProduct,
                inventories: [],
                type: {
                    ...mockProduct.type,
                    bundle: true,
                },
            };

            const { result } = renderHook(() =>
                useDeliveryOptions({
                    product: productBundleWithEmptyInventories,
                    quantity: 1,
                    isInBasket: false,
                    pickupStore: mockStoreInfo,
                })
            );

            // Bundles should NOT use race condition logic - should call normal check
            expect(isStoreOutOfStock).toHaveBeenCalledWith(
                productBundleWithEmptyInventories,
                mockStoreInfo.inventoryId,
                1
            );
            // Should return the actual result from the helper (true = out of stock)
            expect(result.current.isStoreOutOfStock).toBe(true);
        });

        it('sets/bundles use pre-calculated inventory from children (normal check path)', () => {
            // Mock the helper functions to return false (in stock) for sets/bundles
            // This simulates the case where inventory was pre-calculated from children
            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            // Product set with inventories (pre-calculated from children)
            const productSetWithInventories = {
                ...mockProduct,
                inventories: mockProduct.inventories,
                type: {
                    ...mockProduct.type,
                    set: true,
                },
            };

            const { result } = renderHook(() =>
                useDeliveryOptions({
                    product: productSetWithInventories,
                    quantity: 1,
                    isInBasket: false,
                    pickupStore: mockStoreInfo,
                })
            );

            // Should call normal check with pre-calculated inventory
            expect(isStoreOutOfStock).toHaveBeenCalledWith(productSetWithInventories, mockStoreInfo.inventoryId, 1);
            expect(result.current.isStoreOutOfStock).toBe(false);
        });
    });
});
