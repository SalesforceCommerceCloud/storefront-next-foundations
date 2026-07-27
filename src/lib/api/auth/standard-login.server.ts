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
import type { ActionFunctionArgs } from 'react-router';
import type { ShopperLogin } from '@/scapi';
import type { CustomQueryParameters } from '@/lib/api/types';
import { updateAuth, loginRegisteredUser as authLoginRegisteredUser } from '@/middlewares/auth.server';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { getLogger } from '@/lib/logger.server';

export const loginRegisteredUser = async (
    context: ActionFunctionArgs['context'],
    credentials: { email: string; password: string },
    options?: { customParameters?: CustomQueryParameters; skipUsid?: boolean }
): Promise<{
    success: boolean;
    error?: string;
    errorDetails?: string;
}> => {
    const logger = getLogger(context);
    const { t } = getTranslation(context);

    try {
        const tokenResponse: ShopperLogin.schemas['TokenResponse'] = await authLoginRegisteredUser(
            context,
            credentials.email,
            credentials.password,
            options
        );
        // Update session with user tokens and info. userType, customerId, usid, and the
        // refresh-token expiry cap all derive from the access-token JWT inside updateAuth —
        // no follow-up call is needed.
        updateAuth(context, tokenResponse);

        logger.info('StandardLogin: succeeded');
        return {
            success: true,
        };
    } catch (error) {
        const errorMessageDetails = error instanceof Error ? error.message : String(error);
        logger.error('StandardLogin: failed', { error });

        const errorMessage = t('errors:loginFailed');
        return {
            success: false,
            error: errorMessage,
            errorDetails: errorMessageDetails, // Include detailed error for debugging
        };
    }
};
