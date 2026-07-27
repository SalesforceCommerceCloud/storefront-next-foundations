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
import type { ShopperBasketsV2, ShopperOrders } from '@/scapi';

/**
 * Safely extracts and formats a masked credit card number from various payment instrument structures
 * @param paymentInstrument - Payment instrument from basket or order
 * @returns Formatted masked card number (e.g., "**** **** **** 1234")
 */
export function getFormattedMaskedCardNumber(
    paymentInstrument:
        | ShopperBasketsV2.schemas['OrderPaymentInstrument']
        | ShopperOrders.schemas['OrderPaymentInstrument']
        | undefined
): string {
    if (!paymentInstrument) {
        return '**** **** **** ****';
    }

    const maskedNumber = paymentInstrument.paymentCard?.maskedNumber || paymentInstrument.paymentCard?.numberLastDigits;

    if (maskedNumber) {
        // If it's already in masked format (contains asterisks), use it as-is
        if (maskedNumber.includes('*')) {
            return maskedNumber;
        }
        // If it's a full number (shouldn't happen in production), mask all but last 4
        return `**** **** **** ${maskedNumber.slice(-4)}`;
    }

    // Fallback if no masked number is found
    return '**** **** **** ****';
}

/**
 * Extracts the last 4 digits for display. Prefer numberLastDigits when present and valid
 * (e.g. from customer payment instruments); otherwise derive from maskedNumber.
 *
 * @param maskedNumber - Masked card number string (e.g. "************1234")
 * @param numberLastDigits - Optional last 4 digits from API (e.g. "1234")
 * @returns Last 4 digits or '****' if not found
 */
export function getLastFourDigits(maskedNumber: string | undefined, numberLastDigits?: string): string {
    if (numberLastDigits && /^\d{4}$/.test(numberLastDigits)) {
        return numberLastDigits;
    }
    if (!maskedNumber) {
        return '****';
    }

    // Extract the last 4 characters, assuming they are digits
    const lastFour = maskedNumber.slice(-4);

    // Verify they are actually digits
    if (/^\d{4}$/.test(lastFour)) {
        return lastFour;
    }

    // If not digits, try to find digits in the string
    const digits = maskedNumber.replace(/\D/g, '');
    if (digits.length >= 4) {
        return digits.slice(-4);
    }

    return '****';
}

/**
 * Gets a display-friendly card type from the payment instrument
 * @param paymentInstrument - Payment instrument from basket or order
 * @returns Card type (e.g., "Visa", "Mastercard") or default fallback
 */
export function getCardTypeDisplay(
    paymentInstrument:
        | ShopperBasketsV2.schemas['OrderPaymentInstrument']
        | ShopperOrders.schemas['OrderPaymentInstrument']
        | undefined,
    fallback: string = 'Credit Card'
): string {
    if (!paymentInstrument) {
        return fallback;
    }

    // Try different possible sources for the card type
    const cardType = paymentInstrument.paymentCard?.cardType || paymentInstrument.paymentMethodId;

    if (cardType) {
        // Normalize common card type values
        const normalizedType = cardType.toLowerCase();

        if (normalizedType.includes('visa')) return 'Visa';
        if (normalizedType.includes('mastercard') || normalizedType.includes('master')) return 'Mastercard';
        if (normalizedType.includes('amex') || normalizedType.includes('american')) return 'American Express';
        if (normalizedType.includes('discover')) return 'Discover';
        if (normalizedType.includes('diners')) return 'Diners Club';
        if (normalizedType.includes('jcb')) return 'JCB';
        if (normalizedType.includes('unionpay')) return 'UnionPay';

        // Return the original if no normalization applied
        return cardType;
    }

    return fallback;
}

/**
 * Normalizes a card type string to the SFCC-expected capitalization.
 * SFCC Business Manager configures card types; capitalization must match exactly.
 * Common BM values: Visa, MasterCard, Amex, Discover, DinersClub, JCB, UnionPay.
 */
export function normalizeCardType(cardType: string | undefined): string | undefined {
    if (!cardType) return undefined;
    const lower = cardType.toLowerCase().replace(/[_\s-]+/g, '');
    if (lower === 'visa') return 'Visa';
    if (lower === 'mastercard' || lower === 'master') return 'Master Card';
    if (lower === 'amex' || lower === 'americanexpress') return 'Amex';
    if (lower === 'discover') return 'Discover';
    if (lower === 'dinersclub' || lower === 'diners') return 'DinersClub';
    if (lower === 'jcb') return 'JCB';
    if (lower === 'unionpay') return 'UnionPay';
    return cardType;
}

/**
 * Detects the card type from a card number using standard BIN (Bank Identification Number) ranges
 * @param cardNumber - Card number (with or without spaces/dashes)
 * @returns Detected card type
 */
export function detectCardType(cardNumber: string): string {
    if (!cardNumber) {
        return 'Unknown';
    }

    // Remove all non-digit characters
    const cleanNumber = cardNumber.replace(/\D/g, '');

    // Visa: starts with 4, length 13, 16, or 19
    if (/^4/.test(cleanNumber) && [13, 16, 19].includes(cleanNumber.length)) {
        return 'Visa';
    }

    // Mastercard: starts with 5[1-5] or 2[2-7], length 16
    if ((/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) && cleanNumber.length === 16) {
        return 'Mastercard';
    }

    // American Express: starts with 34 or 37, length 15
    if (/^3[47]/.test(cleanNumber) && cleanNumber.length === 15) {
        return 'American Express';
    }

    // Diners Club: starts with 30[0-5], 36, or 38, length 14 (check before other 3x)
    if ((/^30[0-5]/.test(cleanNumber) || /^3[68]/.test(cleanNumber)) && cleanNumber.length === 14) {
        return 'Diners Club';
    }

    // JCB: starts with 35, length 16
    if (/^35/.test(cleanNumber) && cleanNumber.length === 16) {
        return 'JCB';
    }

    // UnionPay: starts with 62, length 16–19
    if (/^62/.test(cleanNumber) && cleanNumber.length >= 16 && cleanNumber.length <= 19) {
        return 'UnionPay';
    }

    // Discover: 6011, 644–649, 65xx, length 16 (exclude 62 UnionPay)
    if (
        cleanNumber.length === 16 &&
        (/^6011/.test(cleanNumber) || /^64[4-9]/.test(cleanNumber) || /^65/.test(cleanNumber))
    ) {
        return 'Discover';
    }

    // If no pattern matches, return generic
    return 'Credit Card';
}

/**
 * Checks if a payment instrument has valid card information
 * @param paymentInstrument - Payment instrument to validate
 * @returns True if payment instrument has valid card data
 */
export function hasValidPaymentCard(
    paymentInstrument: ShopperBasketsV2.schemas['OrderPaymentInstrument'] | undefined
): boolean {
    if (!paymentInstrument) {
        return false;
    }

    // For saved payment methods (when using customerPaymentInstrumentId),
    // Commerce Cloud may not return masked card numbers but will have paymentInstrumentId
    const isSavedPaymentMethod = !!paymentInstrument.paymentInstrumentId;

    if (isSavedPaymentMethod) {
        // For saved payment methods, verify we have basic card info
        return !!(
            paymentInstrument.paymentMethodId?.startsWith('CREDIT_CARD') && paymentInstrument.paymentCard?.cardType
        );
    }

    // For new payment methods, check if any form of masked card number exists
    const pi = paymentInstrument as Record<string, unknown>;
    const card = paymentInstrument.paymentCard as Record<string, unknown> | undefined;
    const hasCardNumber = !!(
        pi.maskedCreditCardNumber ||
        card?.maskedCreditCardNumber ||
        paymentInstrument.paymentCard?.maskedNumber
    );

    return hasCardNumber;
}
