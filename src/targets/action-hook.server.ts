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

import { runHook as _runHook } from 'virtual:action-hooks';

/**
 * All available action hook IDs. Extensions register handlers against these
 * identifiers in their `target-config.json`. Prefixed with `sfcc.` to align
 * with UI target and backend extension naming conventions.
 */
export const ACTION_HOOK_IDS = {
    CHECKOUT_FRAUD_AFTER_SUBMIT_CONTACT_INFO: 'sfcc.checkout.fraud.afterSubmitContactInfo',
    CHECKOUT_ADDRESS_VERIFICATION_AFTER_SUBMIT_SHIPPING_ADDRESS:
        'sfcc.checkout.addressVerification.afterSubmitShippingAddress',
    CHECKOUT_SHIPPING_AFTER_METHODS_FETCH: 'sfcc.checkout.shipping.afterMethodsFetch',
    CHECKOUT_SHIPPING_AFTER_METHOD_SELECT: 'sfcc.checkout.shipping.afterMethodSelect',
    CHECKOUT_PAYMENTS_AFTER_SUBMIT_PAYMENT: 'sfcc.checkout.payments.afterSubmitPayment',
    CHECKOUT_FRAUD_BEFORE_PLACE: 'sfcc.checkout.fraud.beforePlace',
    CHECKOUT_PAYMENTS_BEFORE_PLACE_ORDER: 'sfcc.checkout.payments.beforePlaceOrder',
    CHECKOUT_PAYMENTS_AFTER_PLACE_ORDER: 'sfcc.checkout.payments.afterPlaceOrder',
} as const;

export type ActionHookId = (typeof ACTION_HOOK_IDS)[keyof typeof ACTION_HOOK_IDS];

export interface ActionHookContext<T = unknown> {
    /** Data from the server action (e.g., basket, formData, response) */
    data: T;
    /** React Router action context for API access */
    actionContext: unknown;
}

export type ActionHookResult<T = unknown> = ActionHookContext<T> | void;

/**
 * Execute all registered handlers for a given action hook ID.
 *
 * Handlers run in series (waterfall) — each receives the previous handler's
 * output. If no handlers are registered, returns the original context unchanged.
 *
 * Handlers can:
 * - **Enrich**: Return modified `data` to add information
 * - **Validate**: Throw an `ActionHookError` to abort with a user-facing message
 * - **Transform**: Return modified `data` to change values for the next step
 *
 * @param hookId - The hook identifier (e.g., "sfcc.checkout.payments.afterSubmitPayment")
 * @param context - The hook context containing data and action context
 * @returns The (potentially modified) context after all handlers have run
 */
export async function runHook<T = unknown>(
    hookId: ActionHookId,
    context: ActionHookContext<T>,
    options: { blocking?: boolean } = {}
): Promise<ActionHookContext<T>> {
    return _runHook(hookId, context, options);
}

interface RunHookSafeOptions {
    hookId: ActionHookId;
    context: ActionHookContext;
    logger: { error: (msg: string, meta?: Record<string, unknown>) => void };
    /** Fallback step identifier used when ActionHookError.step is not set. */
    fallbackStep: string;
    /** When true, unexpected (non-ActionHookError) errors re-throw to fail the action. */
    blocking?: boolean;
}

/**
 * Run an action hook with standardized error handling.
 *
 * Individual handler failures within the waterfall are already isolated by the
 * virtual module — a failing non-blocking handler is skipped and the next
 * handler receives the last successful context. This wrapper handles the
 * outer result:
 *
 * - `ActionHookError` → returns a JSON error response (the hook intentionally aborted).
 * - **Blocking** (`blocking: true`) unexpected errors → re-throws to fail the action.
 * - **Non-blocking** (default) unexpected errors → logs and returns the original context.
 *
 * @returns `{ result }` on success, or `{ errorResponse }` when the hook aborted.
 */
export async function runHookSafe({
    hookId,
    context,
    logger,
    fallbackStep,
    blocking = false,
}: RunHookSafeOptions): Promise<
    { result: ActionHookContext; errorResponse?: undefined } | { result?: undefined; errorResponse: Response }
> {
    try {
        const result = await runHook(hookId, context, { blocking });
        return { result };
    } catch (error) {
        if (isActionHookError(error)) {
            return {
                errorResponse: Response.json(
                    { success: false, error: error.message, step: error.step || fallbackStep },
                    { status: 400 }
                ),
            };
        }
        if (blocking) {
            throw error;
        }
        logger.error(`${hookId} hook failed, continuing`, { error });
        return { result: context };
    }
}

/**
 * Error class for action hook handlers.
 * When thrown, the server action should catch it and return the error
 * to the client as a user-facing message.
 */
export class ActionHookError extends Error {
    public readonly step: string;
    public readonly hookId: string;

    constructor(message: string, hookId: string, step: string) {
        super(message);
        this.name = 'ActionHookError';
        this.hookId = hookId;
        this.step = step;
    }
}

/**
 * Type guard for ActionHookError that uses a discriminant property check
 * instead of `instanceof`. This avoids false negatives when extensions
 * bundle their own copy of the class (different module identity).
 */
export function isActionHookError(error: unknown): error is ActionHookError {
    return error instanceof Error && error.name === 'ActionHookError' && 'hookId' in error && 'step' in error;
}
