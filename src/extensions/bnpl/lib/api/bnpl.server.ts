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
 * @feature-stub Buy Now Pay Later (server module)
 * @status stub — no backend integration
 *
 * Server-only API for the BNPL extension. Ships with mock fixtures so the
 * extension is fully functional out of the box; a merchant integrating a real
 * provider (PayPal, Klarna, Affirm, etc.) should replace the body of each
 * function below — call sites in the loader and target wrapper do not change.
 *
 * Mock note: fixtures return the same payment schedule for every product. The
 * `_productId` parameter is intentionally accepted but ignored.
 *
 * See docs/README-FEATURE-STUBS.md for the full list and guidance on
 * productionizing or removing stubs.
 */

/**
 * Numeric/structural data for the inline BNPL message. Display strings
 * (e.g. "Pay in N interest-free payments of $X. Learn more") live in the
 * extension's locale files; this API only supplies the values to interpolate.
 */
export interface BuyNowPayLaterMessageData {
    paymentCount: number;
    amountPerPayment: number;
}

/**
 * Structural data for the BNPL learn-more modal. Display strings
 * (title, summary, headings) live in the extension's locale files.
 * Disclosures stay here because they're legally-binding text supplied by
 * the BNPL provider and should not be edited by translators.
 */
export interface BuyNowPayLaterLearnMoreData {
    paymentSchedule: {
        amountPerPayment: number;
        totalAmount: number;
        /** Localized due-date labels (e.g. "Today", "2 weeks", "4 weeks"). */
        schedule: string[];
    };
    /** Step-by-step instructions for using BNPL at checkout. */
    howItWorks: string[];
    /** Provider-supplied legal disclosures. */
    disclosures: string;
    disclosureLinks?: Array<{ label: string; url?: string }>;
}

const MOCK_BNPL_MESSAGE_DATA: BuyNowPayLaterMessageData = {
    paymentCount: 4,
    amountPerPayment: 12.25,
};

const MOCK_BNPL_LEARN_MORE_DATA: BuyNowPayLaterLearnMoreData = {
    paymentSchedule: {
        amountPerPayment: 12.25,
        totalAmount: 49,
        schedule: ['Today', '2 weeks', '4 weeks', '6 weeks'],
    },
    howItWorks: [
        'Choose BNPL at checkout to pay later with Pay in 4.',
        'Complete your purchase with a 25% down payment.',
        "Use autopay for the rest of your payments. It's easy!",
    ],
    disclosures:
        'Pay in 4 is available to consumers upon approval for purchases of $30 to $1,500. Pay in 4 is currently not available to residents of MO. Offer availability depends on the merchant and also may not be available for certain recurring, subscription services. When applying, a soft credit check may be needed, but will not affect your credit score. You must be 18 years old or older to apply.',
    disclosureLinks: [
        { label: 'Find more disclosures related to Pay in 4' },
        { label: 'See other ways to pay over time' },
    ],
};

/**
 * Fetch the inline BNPL message for a product. Replace the body of this function
 * with a real BNPL provider call (PayPal, Klarna, Affirm, etc.) when integrating.
 */
export function getBuyNowPayLaterMessage(_productId?: string): Promise<BuyNowPayLaterMessageData> {
    return Promise.resolve(MOCK_BNPL_MESSAGE_DATA);
}

/**
 * Fetch BNPL learn-more modal content for a product. Replace the body of this function
 * with a real BNPL provider call when integrating.
 */
export function getBuyNowPayLaterLearnMore(_productId?: string): Promise<BuyNowPayLaterLearnMoreData> {
    return Promise.resolve(MOCK_BNPL_LEARN_MORE_DATA);
}
