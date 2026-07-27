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
import type { ActionFunctionArgs } from 'react-router';
import { ApiError, type ShopperBasketsV2, type ShopperCustomers } from '@/scapi';
import { createApiClients } from '@/lib/api-clients.server';
import { extractResponseError } from '@/lib/utils';
import { updateShipmentAddress, createDeliveryShipment } from '@/extensions/multiship/lib/api/basket.server';
import { updateBasketWithCustomerInfoFallback } from '@/extensions/multiship/lib/basket-utils.server';
import { isRegisteredCustomer, getCurrentCustomer, saveCustomerAddress } from '@/lib/api/customer.server';
import { getAddressKey, isAddressEqual, customerAddressToOrderAddress } from '@/lib/address/address-utils';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { fetchShippingMethodsMapForBasket } from '@/lib/checkout/loaders.server';

/**
 * Handle multi-shipment shipping address submission
 * @param {FormData} formData - Form data from the request containing addresses and multi-ship flag
 * @param {ShopperBasketsV2.schemas['Basket']} basket - Current basket object
 * @param {ActionFunctionArgs['context']} context - Action function context
 * @returns {Promise<Response | null>} Response JSON with success/error status if multi-ship, null if single-ship (to continue with default handling)
 */
export async function handleMultiShipShippingAddress(
    formData: FormData,
    basket: ShopperBasketsV2.schemas['Basket'],
    context: ActionFunctionArgs['context']
): Promise<Response | null> {
    const { t } = getTranslation(context);
    // Check if this is a multi-shipment submission (JSON addresses payload)
    const isMultiShip = formData.get('isMultiShip') === 'true';
    if (!isMultiShip) {
        return null;
    }
    // Parse JSON addresses (format: addressKey -> { address, itemIds[] })
    const addressesJson = formData.get('addresses');
    const deliveryShipmentIdsJson = formData.get('deliveryShipmentIds');
    type AddressToItems = Record<string, { address: ShopperCustomers.schemas['CustomerAddress']; itemIds: string[] }>;
    let addressToItemsMap: Map<string, { address: ShopperCustomers.schemas['CustomerAddress']; itemIds: string[] }>;
    let deliveryShipmentIds: string[] = [];
    try {
        if (!addressesJson || !deliveryShipmentIdsJson) {
            throw new Error();
        }
        const addressesObj = JSON.parse(addressesJson.toString()) as AddressToItems;
        addressToItemsMap = new Map(Object.entries(addressesObj));
        deliveryShipmentIds = JSON.parse(deliveryShipmentIdsJson.toString()) as string[];
    } catch (error) {
        return Response.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Invalid addresses data format',
                step: 'shippingAddress',
            },
            { status: 400 }
        );
    }

    // Multi-shipment mode: find or create shipments for each address and assign items
    try {
        const clients = createApiClients(context);
        const basketId = basket.basketId as string;
        let updatedBasket = basket;

        // Find or create all shipments for items and update them
        const allItemsToUpdate: Array<{
            itemId: string;
            productId: string;
            quantity: number;
            shipmentId: string;
        }> = [];

        // Helper function to collect items for a shipment
        const collectItemsForShipment = (
            shipmentId: string,
            itemIds: string[]
        ): Array<{
            itemId: string;
            productId: string;
            quantity: number;
            shipmentId: string;
        }> => {
            return itemIds
                .map((itemId) => {
                    const item = updatedBasket.productItems?.find((i) => i.itemId === itemId);
                    if (!item || !item.itemId || !item.productId || item.quantity === undefined) {
                        return null;
                    }
                    return {
                        itemId: item.itemId,
                        productId: item.productId,
                        quantity: item.quantity,
                        shipmentId,
                    };
                })
                .filter((item): item is NonNullable<typeof item> => item !== null);
        };

        // Ensure 'me' is first in deliveryShipmentIds if it exists
        const meIndex = deliveryShipmentIds.indexOf('me');
        if (meIndex > 0) {
            deliveryShipmentIds.splice(meIndex, 1);
            deliveryShipmentIds.unshift('me');
        }

        // Create sorted array of address keys from addressToItemsMap
        // note: it might be more efficient to sort these by addresses already assigned to shipments first
        const sortedAddressKeys = Array.from(addressToItemsMap.keys()).sort();

        // Track shipment index for assignment
        let shipmentIndex = 0;

        // Loop through address keys in order, assigning them to shipments
        for (const addressKey of sortedAddressKeys) {
            const addressEntry = addressToItemsMap.get(addressKey);
            if (!addressEntry) continue;
            const { address: customerAddress, itemIds } = addressEntry;

            // Convert CustomerAddress to OrderAddress for shipment API
            const orderAddress = customerAddressToOrderAddress(customerAddress);

            let targetShipmentId: string | null = null;
            let needsAddressUpdate = false;

            // Get next available shipment from deliveryShipmentIds
            if (shipmentIndex < deliveryShipmentIds.length) {
                const shipmentId = deliveryShipmentIds[shipmentIndex];
                const shipment = updatedBasket.shipments?.find((s) => s.shipmentId === shipmentId);

                if (shipment && shipment.shipmentId) {
                    if (isAddressEqual(shipment.shippingAddress, orderAddress)) {
                        // Shipment already has this address - use it as-is
                        targetShipmentId = shipment.shipmentId;
                    } else {
                        // Shipment doesn't have this address - update it
                        targetShipmentId = shipment.shipmentId;
                        needsAddressUpdate = true;
                    }
                }
            }

            // If no shipment available, create a new one
            if (!targetShipmentId) {
                const { basket: newBasket, shipmentId } = await createDeliveryShipment(context, basketId, orderAddress);
                targetShipmentId = shipmentId;
                updatedBasket = newBasket;
            }

            // Update address if needed
            if (needsAddressUpdate && targetShipmentId) {
                updatedBasket = await updateShipmentAddress(context, basketId, targetShipmentId, orderAddress);
            }

            // Assign items to the shipment
            if (targetShipmentId) {
                const itemsForShipment = collectItemsForShipment(targetShipmentId, itemIds);
                allItemsToUpdate.push(...itemsForShipment);
                shipmentIndex++;
            }
        }

        // API call to update all items at once
        if (allItemsToUpdate.length > 0) {
            const { data: newBasket } = await clients.shopperBasketsV2.updateItemsInBasket({
                params: {
                    path: { basketId },
                },
                body: allItemsToUpdate,
            });
            updatedBasket = newBasket;
        }

        // Save addresses to customer profile for registered users (if addresses are new)
        let profileUpdateError = false;
        if (isRegisteredCustomer(context)) {
            const customer = await getCurrentCustomer(context);
            if (customer?.customerId) {
                const existingAddresses = customer.addresses || [];

                // Create a Set of existing address keys for O(1) lookups
                const existingAddressKeys = new Set(existingAddresses.map((addr) => getAddressKey(addr)));

                // For each unique address, check if it exists in customer profile and save if new
                for (const { address: customerAddress } of addressToItemsMap.values()) {
                    const addressKey = getAddressKey(customerAddress);

                    // Only save if address doesn't exist in profile
                    if (!existingAddressKeys.has(addressKey)) {
                        // Save address to customer profile
                        const success = await saveCustomerAddress(context, customer.customerId, customerAddress);
                        if (!success) {
                            profileUpdateError = true;
                        }
                    }
                }
            }
        }

        // Update local basket state with final API response
        updateBasketWithCustomerInfoFallback(context, updatedBasket);

        // Store shipping addresses - step progression computed from basket state
        if (typeof sessionStorage !== 'undefined') {
            // Not implemented/used
            sessionStorage.setItem('checkoutShippingAddress', 'NOT_USED');
        }

        // Fetch shipping methods for all shipments (now that addresses are set)
        const shippingMethodsMap = await fetchShippingMethodsMapForBasket(context, updatedBasket);

        // Return success with basket for client-side state update and step advancement
        return Response.json({
            success: true,
            step: 'shippingAddress',
            data: {
                addresses: Object.keys(addressToItemsMap),
                shippingMethodsMap,
            },
            basket: updatedBasket,
            profileUpdateError,
        });
    } catch (error) {
        let errorMessage = t('errors:checkout.addressValidationFailed');
        if (error instanceof ApiError) {
            try {
                const { responseMessage } = await extractResponseError(error);
                if (responseMessage) {
                    errorMessage = responseMessage;
                }
            } catch {
                // Use default error message if extraction fails
            }
        }
        return Response.json(
            {
                success: false,
                error: errorMessage,
                step: 'shippingAddress',
            },
            { status: 500 }
        );
    }
}
