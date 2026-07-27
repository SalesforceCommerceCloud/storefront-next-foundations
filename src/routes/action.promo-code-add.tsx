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
import { ApiError } from '@/scapi';
import { BasketAction, createBasketAction } from '@/lib/cart/basket-action.server';
import { createActionError, httpStatusForErrorCode } from '@/lib/action-error-helpers.server';
import { createPromoCodeFormSchema } from '@/components/promo-code-form';
import { getCouponStatusError } from '@/lib/cart/coupon-status';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { ErrorCode } from '@/lib/error-codes';

/**
 * Server action for adding a promo code to the shopping basket.
 *
 * @example
 * ```tsx
 * <form method="POST" action="/action/promo-code-add">
 *   <input name="promoCode" value="SAVE10" />
 *   <button type="submit">Apply Code</button>
 * </form>
 * ```
 */
export const action = createBasketAction(
    {
        method: 'POST',
        action: BasketAction.PromoCodeAdd,
        parse: (fd) => ({ promoCode: fd.get('promoCode') as string }),
    },
    async ({ input, basket, basketId, clients, logger, context }) => {
        // Pass `context` so `t()` resolves against the request-scoped i18next
        // instance the middleware populated. Bare `getTranslation()` returns the
        // uninitialized module-global instance, so keys like
        // `cart:promoCode.errors.generic` don't resolve to the loaded
        // translation and the shopper sees a generic fallback string instead.
        const { t } = getTranslation(context);
        const promoCodeFormSchema = createPromoCodeFormSchema(t);
        const validationResult = promoCodeFormSchema.safeParse({ code: input.promoCode });

        if (!validationResult.success) {
            logger.warn('PromoCodeAdd: validation failed');
            return data(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.INVALID_INPUT,
                        message: validationResult.error.issues[0]?.message || 'Promo code is required',
                    }),
                },
                { status: 400 }
            );
        }

        const { code: validatedPromoCode } = validationResult.data;
        logger.debug('PromoCodeAdd: starting', { basketId });

        let updatedBasket;
        try {
            ({ data: updatedBasket } = await clients.shopperBasketsV2.addCouponToBasket({
                params: {
                    path: { basketId },
                },
                body: {
                    code: validatedPromoCode,
                },
            }));
        } catch (error) {
            // SCAPI doesn't park every bad code — for some (e.g. an unknown
            // code) it throws a 4xx whose `detail` names the code verbatim
            // ("Coupon code 'X' is invalid."). Letting that bubble to the
            // basket-action catch would surface SCAPI's raw, code-specific
            // English string and reopen the enumeration oracle this fix closes.
            // Convert any client-side (4xx) coupon rejection into the same
            // localized message the parked-but-ineligible path returns, echoing
            // back only the shopper's own submitted code (never SCAPI's raw
            // `detail`), so unknown and ineligible codes are indistinguishable.
            if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                logger.info('PromoCodeAdd: coupon rejected by SCAPI', { status: error.status });
                return data(
                    {
                        success: false,
                        error: createActionError({
                            code: ErrorCode.INVALID_INPUT,
                            message: t('cart:promoCode.errors.invalidCode', { code: validatedPromoCode }),
                        }),
                    },
                    { status: 400 }
                );
            }
            throw error;
        }

        // SCAPI returns HTTP 200 and adds the coupon item even when the code is
        // valid but no promotion in the cart qualifies (e.g. statusCode
        // 'no_applicable_promotion'). Inspect the newly-added coupon's status so
        // an ineligible code surfaces as a failure instead of a false "applied".
        const priorCouponItemIds = new Set(basket.couponItems?.map((c) => c.couponItemId));
        const addedCoupon =
            updatedBasket.couponItems?.find((c) => !priorCouponItemIds.has(c.couponItemId)) ??
            updatedBasket.couponItems?.find((c) => c.code === validatedPromoCode);

        const statusError = addedCoupon && getCouponStatusError(addedCoupon.statusCode);
        if (statusError) {
            logger.info('PromoCodeAdd: coupon not applied', { statusCode: addedCoupon?.statusCode });
            return data(
                {
                    success: false,
                    // Pass the shopper's own code for `{{code}}`-bearing messages
                    // (invalidCode); keys without the placeholder ignore it. The
                    // submitted code — never SCAPI's raw detail — is what's echoed.
                    error: createActionError({
                        code: statusError.code,
                        message: t(statusError.messageKey, { code: validatedPromoCode }),
                    }),
                },
                { status: httpStatusForErrorCode(statusError.code) }
            );
        }

        return updatedBasket;
    }
);
