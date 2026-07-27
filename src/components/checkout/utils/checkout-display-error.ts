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

type CheckoutErrorData =
    | {
          error?: string | { code: string; message: string };
          formError?: string;
          step?: string;
      }
    | null
    | undefined;

type StepCodeMap = Record<string, Record<string, string>>;

const STEP_ERROR_KEYS: StepCodeMap = {
    contactInfo: {
        OPERATION_FAILED: 'errors:checkout.contactInfoFailed',
    },
    shippingAddress: {
        OPERATION_FAILED: 'errors:checkout.addressValidationFailed',
    },
    shippingOptions: {
        OPERATION_FAILED: 'errors:checkout.shippingMethodNotAvailable',
    },
    payment: {
        NOT_FOUND: 'errors:checkout.paymentProcessingFailed',
        REQUIRED_FIELD: 'errors:checkout.paymentProcessingFailed',
        OPERATION_FAILED: 'errors:checkout.paymentProcessingFailed',
    },
    placeOrder: {
        REQUIRED_FIELD: 'errors:checkout.checkoutIncomplete',
        OPERATION_FAILED: 'errors:checkout.orderCreationFailed',
    },
};

const GLOBAL_ERROR_KEYS: Record<string, string> = {
    NOT_FOUND: 'errors:api.basketNotFound',
    NOT_AUTHENTICATED: 'errors:api.unauthorized',
    NOT_AUTHORIZED: 'errors:api.unauthorized',
    EXPIRED: 'errors:api.unauthorized',
    INVALID_INPUT: 'errors:api.badRequest',
    OUT_OF_STOCK: 'errors:checkout.stockNotAvailable',
};

const DEFAULT_ERROR_KEY = 'errors:api.serverError';

const UNAUTHORIZED_CODES = new Set(['NOT_AUTHENTICATED', 'NOT_AUTHORIZED', 'EXPIRED']);

/**
 * Returns true when the fetcher data carries an auth/session-expired error code,
 * meaning the shopper's session is no longer valid.
 */
export function isUnauthorizedError(data: CheckoutErrorData): boolean {
    if (!data) return false;
    const raw = data.error ?? data.formError;
    if (raw && typeof raw === 'object' && 'code' in raw) {
        return UNAUTHORIZED_CODES.has((raw as { code: string }).code);
    }
    return false;
}

/**
 * Resolves an error code to a translated user-facing message using a two-level lookup:
 * 1. Step-specific override (e.g. OPERATION_FAILED at payment -> "Payment processing failed")
 * 2. Global code mapping (e.g. NOT_AUTHENTICATED -> "Session expired")
 * 3. Default fallback ("Server error")
 */
function resolveErrorMessage(code: string, step: string | undefined, t: (key: string) => string): string {
    const stepKey = step && STEP_ERROR_KEYS[step]?.[code];
    if (stepKey) return t(stepKey);

    const globalKey = GLOBAL_ERROR_KEYS[code];
    if (globalKey) return t(globalKey);

    return t(DEFAULT_ERROR_KEY);
}

export function getCheckoutDisplayError(
    data: CheckoutErrorData,
    step?: string,
    t?: (key: string) => string
): string | undefined {
    if (!data) return undefined;
    if (step !== undefined && data.step !== step) return undefined;
    const raw = data.error ?? data.formError;

    if (raw && typeof raw === 'object' && 'code' in raw) {
        const actionError = raw as { code: string; message: string };
        if (t) return resolveErrorMessage(actionError.code, data.step, t);
        return actionError.message && actionError.message.length > 0 ? actionError.message : undefined;
    }

    if (typeof raw === 'string') {
        return raw.length > 0 ? raw : undefined;
    }

    return undefined;
}
