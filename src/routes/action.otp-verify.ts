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
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { extractErrorMessage } from '@/lib/auth/error-handler';
import { getLogger } from '@/lib/logger.server';
import { verifyOtp } from '@/middlewares/auth.server';

/**
 * Server action to verify OTP code for email editing.
 * This uses the dedicated OTP verify endpoint to validate the code
 * without creating a new authentication session.
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const logger = getLogger(context);

    try {
        const formData = await request.formData();
        const otpCode = formData.get('otpCode')?.toString();
        const email = formData.get('email')?.toString();

        if (!otpCode) {
            return Response.json(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'OTP code is required' }),
                },
                { status: 400 }
            );
        }

        if (!email) {
            return Response.json(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'Email is required' }),
                },
                { status: 400 }
            );
        }

        await verifyOtp(context, { pwdActionToken: otpCode, email });

        return Response.json({ success: true });
    } catch (error: unknown) {
        logger.error('OtpVerify: failed', { error });
        const errorMessage = extractErrorMessage(error);

        return Response.json(
            {
                success: false,
                error: createActionError({ code: ErrorCode.OPERATION_FAILED, message: errorMessage }),
            },
            { status: 500 }
        );
    }
}
