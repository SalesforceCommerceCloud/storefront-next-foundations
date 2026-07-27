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

import type { ShopperBasketsV2, ShopperCustomers } from '@/scapi';
import type { CustomerProfile } from '@/components/checkout/utils/checkout-context-types';
import { getAddressKey, orderAddressToCustomerAddress } from '@/lib/address/address-utils';

/**
 * Consolidates addresses from basket shipments and customer profile into a single array.
 * Customer addresses are added first (priority), followed by addresses from shipments
 * not matching customer profile addresses.
 * Duplicates are removed based on address key comparison.
 * All returned addresses are CustomerAddress with addressId field.
 *
 * @param basket - The shopping basket with shipments
 * @param customerProfile - The customer profile with saved addresses
 * @param deliveryShipments - Optional array of delivery shipments to filter by
 * @param savedAddresses - Optional array of saved addresses to filter by from checkout context
 * @returns Array of customer addresses, ordered by priority (customer addresses first, then shipments)
 */
export function consolidateAddresses({
    basket,
    customerProfile,
    deliveryShipments,
    savedAddresses,
}: {
    basket?: ShopperBasketsV2.schemas['Basket'];
    customerProfile?: CustomerProfile;
    deliveryShipments?: ShopperBasketsV2.schemas['Shipment'][];
    savedAddresses?: ShopperCustomers.schemas['CustomerAddress'][];
}): ShopperCustomers.schemas['CustomerAddress'][] {
    const result: ShopperCustomers.schemas['CustomerAddress'][] = [];
    const addedAddressKeys = new Set<string>();

    // Precompute Maps for O(1) lookups
    const customerAddressMap = new Map<string, ShopperCustomers.schemas['CustomerAddress']>();
    if (customerProfile?.addresses) {
        for (const customerAddr of customerProfile.addresses) {
            const key = getAddressKey(customerAddr);
            // Ensure addressId exists, use it as the identifier
            if (!customerAddr.addressId) {
                customerAddr.addressId = `customer_${Date.now()}`;
            }
            customerAddressMap.set(key, customerAddr);
        }
    }

    const shipmentsToProcess = deliveryShipments ?? basket?.shipments;

    // Step 1: Add customer addresses first (they have priority)
    if (customerProfile?.addresses) {
        for (const customerAddress of customerProfile.addresses) {
            const addressKey = getAddressKey(customerAddress);

            // Skip if we've already added this address
            if (addedAddressKeys.has(addressKey)) continue;

            // Ensure addressId exists
            if (!customerAddress.addressId) {
                customerAddress.addressId = `customer_${Date.now()}`;
            }

            result.push(customerAddress);
            addedAddressKeys.add(addressKey);
        }
    }

    // Step 2: Add addresses from shipments (in shipment order)
    // Addresses that match customer profile are already in result from Step 1, so skip them
    if (shipmentsToProcess) {
        for (const shipment of shipmentsToProcess) {
            if (!shipment.shippingAddress) continue;

            const addressKey = getAddressKey(shipment.shippingAddress);

            // Skip if we've already added this address (from customer profile in Step 1)
            if (addedAddressKeys.has(addressKey)) continue;

            // Convert OrderAddress to CustomerAddress, generate addressId
            const customerAddr = orderAddressToCustomerAddress(shipment.shippingAddress);
            customerAddr.addressId = `shipment_${shipment.shipmentId}`;
            result.push(customerAddr);

            addedAddressKeys.add(addressKey);
        }
    }

    // Step 3: Add addresses from checkout context
    if (savedAddresses) {
        for (const address of savedAddresses) {
            const addressKey = getAddressKey(address);
            if (addedAddressKeys.has(addressKey)) continue;
            // Ensure addressId exists
            if (!address.addressId) {
                address.addressId = `saved_${Date.now()}`;
            }
            result.push(address);
            addedAddressKeys.add(addressKey);
        }
    }

    return result;
}

/**
 * Initializes item addresses by mapping each product item to its shipment address
 * from the consolidated addresses list.
 *
 * @param consolidatedAddresses - Pre-consolidated addresses (output of consolidateAddresses)
 * @param productItems - Optional subset of product items to iterate over
 * @param shipments - Array of shipments to get shipping addresses from
 * @param productItemAddresses - Optional map of product item addresses to add to the map from checkout context
 * @returns Map of itemId to the item's shipment address (CustomerAddress)
 */
export function initializeItemAddresses(
    consolidatedAddresses: ShopperCustomers.schemas['CustomerAddress'][],
    productItems?: ShopperBasketsV2.schemas['ProductItem'][],
    shipments?: ShopperBasketsV2.schemas['Shipment'][],
    productItemAddresses?: Map<string, ShopperCustomers.schemas['CustomerAddress']>
): Map<string, ShopperCustomers.schemas['CustomerAddress']> {
    const map = new Map<string, ShopperCustomers.schemas['CustomerAddress']>();

    if (!productItems || !shipments) return map;

    // Build shipmentId -> shipment Map for O(1) lookups
    const shipmentLookup = new Map<string, ShopperBasketsV2.schemas['Shipment']>();
    for (const shipment of shipments) {
        if (shipment.shipmentId) {
            shipmentLookup.set(shipment.shipmentId, shipment);
        }
    }

    // Build addressKey -> consolidated address Map for O(1) lookups
    const addressLookup = new Map<string, ShopperCustomers.schemas['CustomerAddress']>();
    for (const addr of consolidatedAddresses) {
        const key = getAddressKey(addr);
        addressLookup.set(key, addr);
    }

    // Map each product item to its shipment address
    for (const item of productItems) {
        if (!item.itemId || !item.shipmentId) continue;

        const shipment = shipmentLookup.get(item.shipmentId);
        if (!shipment?.shippingAddress) continue;

        // Find matching address using O(1) lookup
        const addressKey = getAddressKey(shipment.shippingAddress);
        const matchingAddress = addressLookup.get(addressKey);

        if (matchingAddress) {
            // Use consolidated address (which may be from customer profile with preserved addressId)
            map.set(item.itemId, matchingAddress);
        } else {
            // Fallback: Convert shipment OrderAddress to CustomerAddress
            // This should rarely happen since consolidateAddresses processes all shipments
            const customerAddr = orderAddressToCustomerAddress(shipment.shippingAddress);
            customerAddr.addressId = `shipment_${shipment.shipmentId}`;
            map.set(item.itemId, customerAddr);
        }
    }

    // Map product item to addresses from checkout context
    if (productItemAddresses) {
        for (const [itemId, itemAddress] of productItemAddresses) {
            map.set(itemId, itemAddress);
        }
    }

    return map;
}

/**
 * Updates consolidated addresses by merging item addresses with initial consolidated addresses.
 * Addresses from itemAddresses come first (prioritized, added as-is), followed by addresses
 * from consolidatedAddresses that aren't duplicates.
 * Duplicates are removed based on address key comparison.
 * All returned addresses are CustomerAddress with addressId field.
 *
 * @param itemAddresses - Optional Map of item addresses to prioritize first (keys are ignored, values are added as-is, must have addressId)
 * @param consolidatedAddresses - Pre-consolidated addresses (typically output of consolidateAddresses)
 * @returns Array of customer addresses, ordered by priority (item addresses first, then initial consolidated addresses)
 */
export function updateItemAddresses({
    itemAddresses,
    consolidatedAddresses,
}: {
    itemAddresses?: Map<string, ShopperCustomers.schemas['CustomerAddress']>;
    consolidatedAddresses: ShopperCustomers.schemas['CustomerAddress'][];
}): ShopperCustomers.schemas['CustomerAddress'][] {
    const result: ShopperCustomers.schemas['CustomerAddress'][] = [];
    const addedAddressKeys = new Set<string>();

    // Step 1: Add addresses from itemAddresses (prioritized first, added as-is with addressId)
    if (itemAddresses) {
        for (const itemAddress of itemAddresses.values()) {
            const addressKey = getAddressKey(itemAddress);

            // Skip if we've already added this address
            if (addedAddressKeys.has(addressKey)) continue;

            // Add item address as-is (assume it has addressId)
            result.push(itemAddress);
            addedAddressKeys.add(addressKey);
        }
    }

    // Step 2: Add addresses from consolidatedAddresses that weren't already added
    for (const address of consolidatedAddresses) {
        const addressKey = getAddressKey(address);

        // Skip if we've already added this address
        if (addedAddressKeys.has(addressKey)) continue;

        result.push(address);
        addedAddressKeys.add(addressKey);
    }

    return result;
}
