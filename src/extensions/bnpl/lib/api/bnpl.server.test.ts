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

import { describe, it, expect } from 'vitest';
import { getBuyNowPayLaterMessage, getBuyNowPayLaterLearnMore } from './bnpl.server';

describe('bnpl.server', () => {
    describe('getBuyNowPayLaterMessage', () => {
        it('returns inline message data with payment count and per-payment amount', async () => {
            const data = await getBuyNowPayLaterMessage('product-123');
            expect(data.paymentCount).toBeGreaterThan(0);
            expect(typeof data.amountPerPayment).toBe('number');
        });

        it('returns the same fixture regardless of productId', async () => {
            const a = await getBuyNowPayLaterMessage('product-1');
            const b = await getBuyNowPayLaterMessage('product-2');
            expect(a).toEqual(b);
        });
    });

    describe('getBuyNowPayLaterLearnMore', () => {
        it('returns learn-more modal content with payment schedule and disclosures', async () => {
            const data = await getBuyNowPayLaterLearnMore('product-123');
            expect(data.paymentSchedule.totalAmount).toBeGreaterThan(0);
            expect(data.paymentSchedule.amountPerPayment).toBeGreaterThan(0);
            expect(data.paymentSchedule.schedule.length).toBeGreaterThan(0);
            expect(data.howItWorks.length).toBeGreaterThan(0);
            expect(data.disclosures).toBeTruthy();
        });
    });
});
