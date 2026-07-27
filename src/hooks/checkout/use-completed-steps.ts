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

/**
 * Custom hook to get completed steps for the timeline
 */

import { useContext } from 'react';
import { CheckoutContext } from '@/components/checkout/utils/checkout-context-types';
import { useBasket } from '@/providers/basket';
import { getCompletedSteps } from '@/components/checkout/utils/checkout-utils';

export function useCompletedSteps() {
    const context = useContext(CheckoutContext);
    const basket = useBasket();

    if (!context) {
        throw new Error('useCompletedSteps must be used within a CheckoutProvider');
    }

    return getCompletedSteps(basket, context.shipmentDistribution, context.step);
}
