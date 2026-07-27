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
import type { Route } from './+types/action.payment-method-add';
import type { ShopperCustomers } from '@/scapi';
import { data } from 'react-router';
import { savePaymentMethodToCustomer } from '@/lib/api/customer.server';
import { getAuth } from '@/middlewares/auth.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';
import type { ActionResponse } from '@/routes/types/action-responses';

/**
 * Server action for adding a payment method to customer profile.
 * Dialog does validation and parsing (expiry, card type); this action only reads FormData and calls the API.
 */
export async function action({ request, context }: Route.ActionArgs): Promise<ReturnType<typeof data<ActionResponse>>> {
    const logger = getLogger(context);

    if (request.method !== 'POST') {
        logger.warn('PaymentMethodAdd: method not allowed', { method: request.method });
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
        logger.warn('PaymentMethodAdd: not authenticated');
        return data(
            {
                success: false,
                error: createActionError({ code: ErrorCode.NOT_AUTHENTICATED, message: 'Not authenticated' }),
            },
            { status: 401 }
        );
    }

    logger.debug('PaymentMethodAdd: starting', { customerId });

    try {
        const formData = await request.formData();
        const cardNumber = (formData.get('cardNumber') as string) ?? '';
        const cardholderName = (formData.get('cardholderName') as string) ?? '';
        const cardType = (formData.get('cardType') as string) ?? '';
        const expirationMonth = parseInt((formData.get('expirationMonth') as string) ?? '0', 10);
        const expirationYear = parseInt((formData.get('expirationYear') as string) ?? '0', 10);
        const saveAsDefault = formData.get('saveAsDefault') === 'on';

        const paymentInstrument: ShopperCustomers.schemas['CustomerPaymentInstrumentRequest'] = {
            paymentMethodId: 'CREDIT_CARD',
            paymentCard: {
                cardType,
                number: cardNumber,
                expirationMonth,
                expirationYear,
                holder: cardholderName,
            } as ShopperCustomers.schemas['CustomerPaymentInstrumentRequest']['paymentCard'],
            default: saveAsDefault,
        };

        const success = await savePaymentMethodToCustomer(context, customerId, paymentInstrument);

        if (!success) {
            logger.error('PaymentMethodAdd: failed to save payment method', { customerId });
            return data(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.OPERATION_FAILED,
                        message: 'Failed to save payment method',
                    }),
                },
                { status: 500 }
            );
        }

        logger.info('PaymentMethodAdd: succeeded', { customerId, cardType });
        return data({ success: true });
    } catch (error) {
        logger.error('PaymentMethodAdd: failed', { error });
        return data({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
