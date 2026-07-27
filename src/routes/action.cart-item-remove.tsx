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

/**
 * Server action for removing an item from the shopping cart.
 *
 * Used by cart components for item removal functionality (see cart-content.tsx for usage example).
 *
 * @example
 * ```tsx
 * <form method="POST" action="/action/cart-item-remove">
 *   <input name="itemId" value="item-123" />
 *   <button type="submit">Remove Item</button>
 * </form>
 * ```
 */
export const action = createBasketAction(
    {
        method: 'POST',
        action: BasketAction.CartItemRemove,
        parse: (fd) => ({ itemId: fd.get('itemId') as string }),
    },
    async ({ input, basketId, clients, logger }) => {
        if (!input.itemId) {
            logger.warn('CartItemRemove: missing itemId in form data');
            return data(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'itemId is required' }),
                },
                { status: 400 }
            );
        }

        logger.debug('CartItemRemove: removing item', { itemId: input.itemId, basketId });
        const { data: updatedBasket } = await clients.shopperBasketsV2.removeItemFromBasket({
            params: {
                path: {
                    basketId,
                    itemId: input.itemId,
                },
            },
        });
        return updatedBasket;
    }
);
