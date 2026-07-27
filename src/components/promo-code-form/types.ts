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
import { type UseFormReturn } from 'react-hook-form';
import type { FetcherWithComponents } from 'react-router';
import type { ShopperBasketsV2 } from '@/scapi';
import type { ActionError } from '@/lib/error-codes';

// Type for the form data (inferred from schema in index.tsx)
export type PromoCodeFormData = {
    code: string;
};

// Type for the fetcher data response.
// `error` mirrors the `BasketActionResponse` shape the add/remove actions
// return — an `ActionError` object (`{ code, message }`), not a bare string.
export type PromoCodeFetcherData = {
    success: boolean;
    basket?: ShopperBasketsV2.schemas['Basket'];
    error?: ActionError;
};

// Props interface for PromoCodeForm component
export interface PromoCodeFormProps {
    basket?: ShopperBasketsV2.schemas['Basket'];
}

type Basket = ShopperBasketsV2.schemas['Basket'];

// Props interface for AppliedCouponRow component
export interface AppliedCouponRowProps {
    item: NonNullable<Basket['couponItems']>[number];
    basketId?: string;
    /**
     * Currency for formatting the discount line. Pass `basket.currency ?? useSite().currency`
     * at the call site — both are always defined for a real basket and a real site context,
     * so this prop is required (no defaulting to a hard-coded 'USD' string).
     */
    currency: string;
    /**
     * All price adjustments tied to the basket — both order-level (`basket.orderPriceAdjustments`)
     * and line-item-level (flattened from `basket.productItems[].priceAdjustments`). Pass them
     * concatenated; SCAPI splits coupon discounts across both arrays depending on whether the
     * promotion targets the whole order or specific products.
     */
    priceAdjustments?: NonNullable<Basket['orderPriceAdjustments']>;
}

// Props interface for PromoCodeFields component
export interface PromoCodeFieldsProps {
    form: UseFormReturn<PromoCodeFormData>;
    applyFetcher: FetcherWithComponents<PromoCodeFetcherData>;
}
