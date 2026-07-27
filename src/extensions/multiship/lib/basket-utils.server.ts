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

import type { RouterContextProvider } from 'react-router';
import type { ShopperBasketsV2 } from '@/scapi';
import { basketResourceContext, updateBasketResource } from '@/middlewares/basket.server';

/**
 * Generates a unique id string for shipment
 * @returns {string} shipmentId
 */
export function generateRandomShipmentId() {
    // todo: not cryptographically unique, fine for local/testing/dev
    return `Shipment_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e8).toString(36)}`;
}

/**
 * Determines if a shipment is a delivery shipment (not a pickup shipment).
 * Delivery shipments are those without a store pickup flag (c_fromStoreId).
 *
 * @param shipment - The shipment to check
 * @returns true if the shipment is a delivery shipment, false otherwise
 */
export function isDeliveryShipment(shipment?: ShopperBasketsV2.schemas['Shipment']): boolean {
    return !shipment?.c_fromStoreId;
}

/**
 * Updates the local basket state, handling cases where the API response may be missing customer info.
 * If the updated basket is missing customer email but the current basket has it, merges the customer info
 * with the updated basket's shipment and totals data.
 *
 * @param context - Router context
 * @param updatedBasket - The basket returned from the API
 */
export function updateBasketWithCustomerInfoFallback(
    context: Readonly<RouterContextProvider>,
    updatedBasket: ShopperBasketsV2.schemas['Basket']
): void {
    const currentBasket = context.get(basketResourceContext)?.current ?? null;

    if (!updatedBasket.customerInfo?.email && currentBasket?.customerInfo?.email) {
        // Customer info missing from API response, merging with current basket
        updateBasketResource(context, {
            ...currentBasket,
            shipments: updatedBasket.shipments || currentBasket.shipments,
            orderTotal: updatedBasket.orderTotal || currentBasket.orderTotal,
            productTotal: updatedBasket.productTotal || currentBasket.productTotal,
            shippingTotal: updatedBasket.shippingTotal || currentBasket.shippingTotal,
            merchandizeTotalTax: updatedBasket.merchandizeTotalTax || currentBasket.merchandizeTotalTax,
            taxTotal: updatedBasket.taxTotal || currentBasket.taxTotal,
        });
    } else {
        updateBasketResource(context, updatedBasket);
    }
}
