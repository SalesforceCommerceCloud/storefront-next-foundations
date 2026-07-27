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
 * Server action for removing a promo code from the shopping basket.
 *
 * @example
 * ```tsx
 * <form method="POST" action="/action/promo-code-remove">
 *   <input name="couponItemId" value="coupon-123" />
 *   <button type="submit">Remove Code</button>
 * </form>
 * ```
 */
export const action = createBasketAction(
    {
        method: 'POST',
        action: BasketAction.PromoCodeRemove,
        parse: (fd) => ({ couponItemId: fd.get('couponItemId') as string }),
    },
    async ({ input, basketId, clients, logger }) => {
        if (!input.couponItemId) {
            logger.warn('PromoCodeRemove: missing couponItemId');
            return data(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'couponItemId is required' }),
                },
                { status: 400 }
            );
        }

        logger.debug('PromoCodeRemove: starting', { basketId, couponItemId: input.couponItemId });
        const { data: updatedBasket } = await clients.shopperBasketsV2.removeCouponFromBasket({
            params: {
                path: {
                    basketId,
                    couponItemId: input.couponItemId,
                },
            },
        });
        return updatedBasket;
    }
);
