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

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { ShopperProducts } from '@/scapi';
import { DELIVERY_OPTIONS, type DeliveryOption } from '@/extensions/bopis/constants';
import {
    isStoreOutOfStock as storeOutOfStockFor,
    isSiteOutOfStock as siteOutOfStockFor,
} from '@/lib/product/inventory-utils';
import { isProductSet, isProductBundle } from '@/lib/product/product-utils';
import { usePickup } from '@/extensions/bopis/context/pickup-context';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';
import { useStoreLocator } from '@/extensions/store-locator/providers/store-locator';

interface UseDeliveryOptionsProps {
    /** The product to check inventory for */
    product: ShopperProducts.schemas['Product'];
    /** The selected quantity to check inventory against */
    quantity: number;
    /** Whether the item is already in the basket - prevents auto-sync and auto-change behavior */
    isInBasket: boolean;
    /** The selected pickup store */
    pickupStore?: SelectedStoreInfo | null;
}

/**
 * Hook that manages delivery options logic including:
 * - Store inventory checking
 * - Pickup availability
 * - Delivery option state management
 *
 * @param props - The hook props
 * @returns Object containing delivery options state and handlers
 *
 * @example
 * ```tsx
 * const {
 *   selectedDeliveryOption,
 *   isStoreOutOfStock,
 *   isSiteOutOfStock,
 *   setSelectedDeliveryOption,
 *   handleDeliveryOptionChange
 * } = useDeliveryOptions({ product, quantity: 2 });
 * ```
 *
 * @example With sets/bundles (uses pre-calculated inventory)
 * ```tsx
 * const {
 *   selectedDeliveryOption,
 *   isStoreOutOfStock,
 *   isSiteOutOfStock,
 *   handleDeliveryOptionChange
 * } = useDeliveryOptions({
 *   product: parentProduct, // inventory pre-calculated by useProductSetsBundles
 *   quantity: bundleQuantity,
 *   isInBasket: false,
 *   pickupStore: selectedStore
 * });
 * ```
 */
export function useDeliveryOptions({ product, quantity, isInBasket, pickupStore }: UseDeliveryOptionsProps) {
    // Local state for delivery options
    const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<DeliveryOption | undefined>(undefined);

    const pickupContext = usePickup();
    const pickupRef = useRef(pickupContext);

    // Track store locator dialog state
    const isStoreLocatorOpen = useStoreLocator((state) => state.isOpen);
    const prevIsStoreLocatorOpen = useRef(isStoreLocatorOpen);

    // Update ref when pickupContext changes
    useEffect(() => {
        pickupRef.current = pickupContext;
    }, [pickupContext]);

    // Memoize site/store OOS flags together for simpler deps/readability
    const { isStoreOutOfStock, isSiteOutOfStock } = useMemo(() => {
        /**
         * Race Condition Prevention Logic
         *
         * Problem: When a user selects a store, there's a brief window where:
         * 1. pickupStore.inventoryId is set (from store locator)
         * 2. BUT product.inventories array is still empty (revalidation in progress)
         * 3. This causes false "out of stock" detection
         *
         * Example Timeline:
         * t=0: User clicks "Select Store" → pickupStore.inventoryId = "store-sf-downtown"
         * t=10ms: Component renders → product.inventories = [] (not yet fetched)
         * t=50ms: Inventory API responds → product.inventories = [{id: "store-sf-downtown", ...}]
         *
         * Solution:
         * - If store is selected BUT inventory data is missing, assume "waiting for data"
         * - Return false (NOT out of stock) during the wait period
         * - EXCEPTION: Skip this logic for sets/bundles - they calculate inventory differently
         *
         * Why sets/bundles are exempt (PWA Kit approach):
         * - Sets/bundles calculate inventory from child products via useProductSetsBundles
         * - Child inventory is enriched via useBulkChildProductInventory
         * - Parent product.inventories is replaced with lowest child inventory
         * - They must fall through to the normal check to use the calculated inventory
         */

        // A store selected with no inventory list cannot fulfill pickup — treat as OOS
        if (pickupStore && !pickupStore.inventoryId) {
            return {
                isStoreOutOfStock: true,
                isSiteOutOfStock: siteOutOfStockFor(product, quantity),
            };
        }

        // Early return for race condition case: store selected but inventory not yet loaded
        const hasStoreSelected = Boolean(pickupStore?.inventoryId);
        const hasInventoryData = Boolean(product?.inventories && product.inventories.length > 0);
        const isSetOrBundle = isProductSet(product) || isProductBundle(product);

        // If waiting for inventory data to load, treat as in-stock to prevent false OOS flash
        // Skip this for sets/bundles - they use pre-calculated inventory from children
        if (hasStoreSelected && !hasInventoryData && !isSetOrBundle) {
            return {
                isStoreOutOfStock: false, // Waiting for data, assume available
                isSiteOutOfStock: siteOutOfStockFor(product, quantity),
            };
        }

        // Normal case: check inventory as usual
        // For sets/bundles, product inventory has been pre-calculated from children
        return {
            isStoreOutOfStock: storeOutOfStockFor(product, pickupStore?.inventoryId, quantity),
            isSiteOutOfStock: siteOutOfStockFor(product, quantity),
        };
    }, [product, pickupStore, quantity]);

    // Wrapper function that syncs delivery option changes to pickup context
    const handleDeliveryOptionChange = useCallback(
        (option: DeliveryOption) => {
            setSelectedDeliveryOption(option);
            const productId = product?.id;

            // Sync to pickup context if available
            if (pickupContext && productId && pickupStore?.inventoryId && pickupStore?.id) {
                if (option === DELIVERY_OPTIONS.PICKUP) {
                    pickupContext.addItem(productId, pickupStore.inventoryId, pickupStore.id);
                } else {
                    pickupContext.removeItem(productId);
                }
            }
        },
        [product?.id, pickupStore?.inventoryId, pickupStore?.id, pickupContext]
    );

    // Sync current delivery option to pickup context when dependencies change
    // This ensures pickup items are tracked even if the user doesn't change options
    useEffect(() => {
        // Skip sync for items already in the basket
        if (isInBasket || !selectedDeliveryOption) return;

        const productId = product?.id;
        const currentPickup = pickupRef.current;

        if (currentPickup && productId && pickupStore?.inventoryId && pickupStore?.id) {
            if (selectedDeliveryOption === DELIVERY_OPTIONS.PICKUP) {
                currentPickup.addItem(productId, pickupStore.inventoryId, pickupStore.id);
            } else {
                currentPickup.removeItem(productId);
            }
        }
    }, [selectedDeliveryOption, product?.id, pickupStore?.inventoryId, pickupStore?.id, isInBasket]);

    // Auto-change delivery option when current selection becomes unavailable
    // This also syncs to pickup context via handleDeliveryOptionChange
    useEffect(() => {
        // Skip auto-change for items already in the basket
        if (isInBasket || !selectedDeliveryOption) return;

        // Don't auto-switch when dialog is open (user is selecting a store)
        if (isStoreLocatorOpen) {
            prevIsStoreLocatorOpen.current = isStoreLocatorOpen;
            return;
        }

        const isDeliveryAvailable = !isSiteOutOfStock;
        const isPickupAvailable = !isStoreOutOfStock && !!pickupStore?.inventoryId;

        // If both options are disabled, don't change anything
        if (!isDeliveryAvailable && !isPickupAvailable) {
            return;
        }

        // If current selection is unavailable, switch to the available option
        if (selectedDeliveryOption === DELIVERY_OPTIONS.PICKUP && !isPickupAvailable && isDeliveryAvailable) {
            handleDeliveryOptionChange(DELIVERY_OPTIONS.DELIVERY);
        } else if (selectedDeliveryOption === DELIVERY_OPTIONS.DELIVERY && !isDeliveryAvailable && isPickupAvailable) {
            handleDeliveryOptionChange(DELIVERY_OPTIONS.PICKUP);
        }

        // Update ref after all checks to detect transitions on next render
        prevIsStoreLocatorOpen.current = isStoreLocatorOpen;
    }, [
        selectedDeliveryOption,
        isStoreOutOfStock,
        isSiteOutOfStock,
        pickupStore?.inventoryId,
        handleDeliveryOptionChange,
        isInBasket,
        isStoreLocatorOpen,
    ]);

    return {
        isStoreOutOfStock,
        isSiteOutOfStock,
        selectedDeliveryOption,
        setSelectedDeliveryOption,
        handleDeliveryOptionChange,
    };
}
