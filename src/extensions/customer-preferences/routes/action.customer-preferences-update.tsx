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
/** @sfdc-extension-file SFDC_EXT_CUSTOMER_PREFERENCES */
import type { Route } from './+types/action.customer-preferences-update';
import { data } from 'react-router';

import { createActionError, type ActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getAuth as getAuthServer } from '@/middlewares/auth.server';

import {
    updateCustomerInterests,
    updateCustomerPreferences,
    type CustomerInterests,
    type CustomerPreferences,
} from '@/extensions/customer-preferences/lib/api/customer-preferences.server';
import { customerPreferencesUpdateSchema } from '@/extensions/customer-preferences/lib/schemas';

export type CustomerPreferencesUpdateResponse =
    | { success: true; customerInterests: CustomerInterests; customerPreferences: CustomerPreferences }
    | { success: false; error: ActionError };

export async function action({
    request,
    context,
}: Route.ActionArgs): Promise<ReturnType<typeof data<CustomerPreferencesUpdateResponse>>> {
    if (request.method !== 'PATCH') {
        return data(
            {
                success: false,
                error: createActionError({ code: ErrorCode.METHOD_NOT_ALLOWED, message: 'Method not allowed' }),
            },
            { status: 405 }
        );
    }

    const session = getAuthServer(context);
    if (session.userType !== 'registered' || !session.customerId) {
        return data(
            {
                success: false,
                error: createActionError({
                    code: ErrorCode.NOT_AUTHENTICATED,
                    message: 'You must be signed in to update preferences',
                }),
            },
            { status: 401 }
        );
    }

    let parsed: { interestIds: string[]; preferences: Record<string, unknown> };
    try {
        const formData = await request.formData();
        const interestIdsRaw = formData.getAll('interestIds').map(String);
        const preferencesRaw = formData.get('preferences');
        parsed = {
            interestIds: interestIdsRaw,
            preferences: typeof preferencesRaw === 'string' ? JSON.parse(preferencesRaw) : {},
        };
    } catch {
        return data(
            {
                success: false,
                error: createActionError({
                    code: ErrorCode.REQUIRED_FIELD,
                    message: 'Invalid form data',
                }),
            },
            { status: 400 }
        );
    }

    const validation = customerPreferencesUpdateSchema.safeParse(parsed);
    if (!validation.success) {
        return data(
            {
                success: false,
                error: createActionError({
                    code: ErrorCode.REQUIRED_FIELD,
                    message: validation.error.issues[0]?.message ?? 'Invalid payload',
                }),
            },
            { status: 400 }
        );
    }

    try {
        const [customerInterests, customerPreferences] = await Promise.all([
            updateCustomerInterests(session.customerId, validation.data.interestIds),
            updateCustomerPreferences(session.customerId, validation.data.preferences),
        ]);
        return data({ success: true, customerInterests, customerPreferences });
    } catch (error) {
        return data({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
