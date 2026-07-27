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
import type { ShopperBasketsV2 } from '@/scapi';
import { ErrorCode } from '@/lib/error-codes';

type CouponItem = NonNullable<ShopperBasketsV2.schemas['Basket']['couponItems']>[number];

/**
 * SCAPI coupon statuses that mean a discount is actually on the basket.
 *
 * `addCouponToBasket` returns HTTP 200 and adds a coupon item even when the
 * code is valid but no promotion in the cart qualifies — it signals the real
 * outcome via `couponItems[].statusCode`, NOT via an error. Only `applied`
 * (a campaign promotion qualified) and `adhoc` (a coupon applied via a custom,
 * non-campaign price adjustment — SCAPI reports `adhoc` for coupon line items
 * not based on a campaign, i.e. `CouponLineItem.isBasedOnCampaign() === false`)
 * represent a coupon that took effect; every other status is a coupon that was
 * recognized but produced no price adjustment.
 *
 * Note: the `valid` field is NOT a substitute for this check — per the SCAPI
 * schema, `valid` is `true` for `no_applicable_promotion` too, so keying on
 * `valid` would reintroduce the false "applied" state.
 */
const APPLIED_COUPON_STATUSES = new Set<NonNullable<CouponItem['statusCode']>>(['applied', 'adhoc']);

/**
 * Whether a coupon item reflects a discount actually applied to the basket.
 * Use this to decide which `couponItems` to present as applied in the UI.
 */
export const isCouponApplied = (item: Pick<CouponItem, 'statusCode'>): boolean =>
    item.statusCode != null && APPLIED_COUPON_STATUSES.has(item.statusCode);

/** Action error code + i18n message key for a non-applied coupon status. */
export interface CouponStatusError {
    code: string;
    /** i18n key (cart namespace) for the shopper-facing message. */
    messageKey: string;
}

/**
 * Map a SCAPI coupon `statusCode` to an action error code + i18n key.
 *
 * Returns `null` when the coupon is actually applied (see
 * {@link APPLIED_COUPON_STATUSES}) — those are successes, not errors.
 *
 * Every non-applied status maps to a 4xx error code: `addCouponToBasket`
 * returned HTTP 200, so a rejected coupon is a client/business outcome, never a
 * server fault. We deliberately avoid `OPERATION_FAILED` here — it's the app's
 * generic 500 fallback (see `httpStatusForErrorCode`), and tagging an expired or
 * redemption-capped coupon as a 500 would inflate server-error monitoring.
 */
export const getCouponStatusError = (statusCode: CouponItem['statusCode']): CouponStatusError | null => {
    switch (statusCode) {
        case 'applied':
        case 'adhoc':
            return null;
        case 'no_applicable_promotion':
        case 'coupon_code_unknown':
        case 'coupon_disabled':
            // Deliberately one message (and one 400) for all three: a code
            // that's valid-but-ineligible, unknown, or disabled. Telling a
            // shopper "not applicable to your cart" only for a *real* code turns
            // the form into an oracle — an attacker can enumerate live coupon
            // codes by which message comes back. Keep the response identical so
            // a guessed code reveals nothing about whether it exists. This is the
            // same key the action returns when SCAPI throws a 4xx outright for a
            // code it rejects (it parks ineligible codes but throws on others),
            // so both rejection paths look identical to the shopper.
            return { code: ErrorCode.INVALID_INPUT, messageKey: 'cart:promoCode.errors.invalidCode' };
        case 'no_active_promotion':
            return { code: ErrorCode.EXPIRED, messageKey: 'cart:promoCode.errors.expiredCode' };
        case 'coupon_already_in_basket':
        case 'coupon_code_already_in_basket':
            return { code: ErrorCode.CONFLICT, messageKey: 'cart:promoCode.errors.alreadyApplied' };
        case 'coupon_code_already_redeemed':
        case 'redemption_limit_exceeded':
        case 'customer_redemption_limit_exceeded':
        case 'timeframe_redemption_limit_exceeded':
            // Redemption caps hit — a 409 conflict, not a server error.
            return { code: ErrorCode.CONFLICT, messageKey: 'cart:promoCode.errors.generic' };
        default:
            // Unknown/future status: reject as a generic bad request (400), still 4xx.
            return { code: ErrorCode.INVALID_INPUT, messageKey: 'cart:promoCode.errors.generic' };
    }
};
