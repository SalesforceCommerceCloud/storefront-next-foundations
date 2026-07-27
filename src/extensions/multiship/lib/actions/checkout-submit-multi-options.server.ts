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
import { ApiError, type ShopperBasketsV2 } from '@/scapi';
import { createApiClients } from '@/lib/api-clients.server';
import { extractResponseError } from '@/lib/utils';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { updateBasketWithCustomerInfoFallback } from '@/extensions/multiship/lib/basket-utils.server';
import { getLogger } from '@/lib/logger.server';

/**
 * Handle multi-shipment shipping method submission
 * @param formData Form data from the request
 * @param basket Current basket
 * @param context Action function context
 * @returns Response if multi-ship, null if single-ship (to continue with default handling)
 */
export async function handleMultiShipShippingOptions(
    formData: FormData,
    basket: ShopperBasketsV2.schemas['Basket'],
    context: ActionFunctionArgs['context']
): Promise<Response | null> {
    const logger = getLogger(context);
    const { t } = getTranslation(context);
    // Check if this is a multi-shipment submission (fields like shippingMethod_{shipmentId})
    const multiShipFields: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (key.startsWith('shippingMethod_')) {
            const shipmentId = key.replace('shippingMethod_', '');
            multiShipFields[shipmentId] = value.toString();
        }
    }

    const isMultiShip = Object.keys(multiShipFields).length > 0;
    if (!isMultiShip) {
        logger.debug('SubmitShippingOptions: single-shipment mode, skipping multiship handler');
        // Not a multi-ship submission, let the caller handle single-ship logic
        return null;
    }

    logger.debug('SubmitShippingOptions: multi-shipment mode', {
        shipmentCount: Object.keys(multiShipFields).length,
    });

    // Multi-shipment mode: update each shipment individually
    try {
        const clients = createApiClients(context);
        const basketId = basket.basketId as string; // Safe: validated by caller
        let updatedBasket = basket;

        // Update each shipment with its selected shipping method
        for (const [shipmentId, shippingMethodId] of Object.entries(multiShipFields)) {
            if (!shippingMethodId) continue;

            // Check if shipment already has the correct shipping method set
            const shipment = updatedBasket.shipments?.find((s) => s.shipmentId === shipmentId);
            if (shipment?.shippingMethod?.id === shippingMethodId) {
                continue;
            }

            const { data: newBasket } = await clients.shopperBasketsV2.updateShippingMethodForShipment({
                params: {
                    path: {
                        basketId,
                        shipmentId,
                    },
                },
                body: {
                    id: shippingMethodId,
                },
            });

            updatedBasket = newBasket;
        }

        // Update local basket state with final API response
        updateBasketWithCustomerInfoFallback(context, updatedBasket);

        // Store shipping methods - step progression computed from basket state
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('checkoutShippingMethod', JSON.stringify({ multiShipFields }));
        }

        // Return success with basket for client-side state update and step advancement
        return Response.json({
            success: true,
            step: 'shippingOptions',
            data: { multiShipFields },
            basket: updatedBasket,
        });
    } catch (error) {
        logger.error('SubmitShippingOptions: multiship update failed', { error });
        let errorMessage = t('errors:api.serverError');
        if (error instanceof ApiError) {
            try {
                const { responseMessage } = await extractResponseError(error);
                if (responseMessage) {
                    errorMessage = responseMessage;
                }
            } catch (extractError) {
                logger.error('SubmitShippingOptions: failed to extract error message', {
                    error: extractError,
                });
                // Use default error message if extraction fails
            }
        }
        return Response.json(
            {
                success: false,
                error: errorMessage,
                step: 'shippingOptions',
            },
            { status: 500 }
        );
    }
}
