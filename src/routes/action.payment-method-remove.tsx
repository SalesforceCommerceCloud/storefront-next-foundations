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
import type { Route } from './+types/action.payment-method-remove';
import { data } from 'react-router';
import { deleteCustomerPaymentInstrument } from '@/lib/api/customer.server';
import { getAuth } from '@/middlewares/auth.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';
import type { ActionResponse } from '@/routes/types/action-responses';

/**
 * Server action for removing a payment method from customer profile
 */
export async function action({ request, context }: Route.ActionArgs): Promise<ReturnType<typeof data<ActionResponse>>> {
    const logger = getLogger(context);

    if (request.method !== 'POST') {
        logger.warn('PaymentMethodRemove: method not allowed', { method: request.method });
        return data(
            {
                success: false,
                error: createActionError({ code: ErrorCode.METHOD_NOT_ALLOWED, message: 'Method not allowed' }),
            },
            { status: 405 }
        );
    }

    const auth = getAuth(context);
    const customerId = auth?.customerId;

    if (!customerId) {
        logger.warn('PaymentMethodRemove: not authenticated');
        return data(
            {
                success: false,
                error: createActionError({ code: ErrorCode.NOT_AUTHENTICATED, message: 'Not authenticated' }),
            },
            { status: 401 }
        );
    }

    logger.debug('PaymentMethodRemove: starting', { customerId });

    try {
        const formData = await request.formData();
        const paymentInstrumentId = formData.get('paymentInstrumentId') as string;

        if (!paymentInstrumentId) {
            logger.warn('PaymentMethodRemove: missing payment instrument ID');
            return data(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.REQUIRED_FIELD,
                        message: 'Payment instrument ID is required',
                    }),
                },
                { status: 400 }
            );
        }

        const success = await deleteCustomerPaymentInstrument(context, customerId, paymentInstrumentId);

        if (!success) {
            logger.error('PaymentMethodRemove: failed to remove payment method', { customerId, paymentInstrumentId });
            return data(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.OPERATION_FAILED,
                        message: 'Failed to remove payment method',
                    }),
                },
                { status: 500 }
            );
        }

        logger.info('PaymentMethodRemove: succeeded', { customerId, paymentInstrumentId });
        return data({ success: true });
    } catch (error) {
        logger.error('PaymentMethodRemove: failed', { error });
        return data({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
