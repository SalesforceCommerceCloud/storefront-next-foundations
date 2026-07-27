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
import { data } from 'react-router';
import { BasketAction, createBasketAction } from '@/lib/cart/basket-action.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { findOrCreatePickupShipment } from '@/extensions/bopis/lib/api/shipment.server';
import { assertAllProductItemsPickup } from '@/extensions/bopis/lib/product-utils';
import { validateDeliveryOptionCompatibility } from '@/extensions/bopis/lib/product-actions';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

/**
 * Server action to add multiple items to the cart (for product sets).
 */
export const action = createBasketAction(
    {
        method: 'POST',
        action: BasketAction.CartSetAdd,
        parse: (fd) => {
            const raw = fd.get('productItems') as string | null;
            return raw
                ? (JSON.parse(raw) as { productId: string; quantity: number; inventoryId?: string; storeId?: string }[])
                : null;
        },
    },
    async ({ input, basketId, basket, context, clients, logger }) => {
        if (!input) {
            logger.warn('CartSetAdd: missing productItems in form data');
            return data(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.REQUIRED_FIELD,
                        message: 'productItems missing from form data',
                    }),
                },
                { status: 400 }
            );
        }

        logger.debug('CartSetAdd: starting addMultipleItemsToCart', { itemCount: input.length });

        let shipmentId = 'me';

        // @sfdc-extension-block-start SFDC_EXT_BOPIS
        const firstItem = input[0];
        const deliveryValidation = validateDeliveryOptionCompatibility(basket, firstItem?.storeId, context);
        if (!deliveryValidation.valid) {
            return data(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.CONFLICT,
                        message: deliveryValidation.errorMessage,
                    }),
                },
                { status: 409 }
            );
        }
        if (firstItem.storeId && firstItem.inventoryId) {
            assertAllProductItemsPickup(input);
            const pickupShipment = await findOrCreatePickupShipment(basket, context, firstItem.storeId);
            shipmentId = pickupShipment.shipmentId;
        }
        // @sfdc-extension-block-end SFDC_EXT_BOPIS

        const { data: updatedBasket } = await clients.shopperBasketsV2.addItemToBasket({
            params: {
                path: { basketId },
            },
            body: input.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                ...(item.inventoryId ? { inventoryId: item.inventoryId } : {}),
                shipmentId,
            })),
        });
        return updatedBasket;
    }
);
