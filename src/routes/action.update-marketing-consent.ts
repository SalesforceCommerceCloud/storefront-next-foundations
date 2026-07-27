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
import type { Route } from './+types/action.update-marketing-consent';
import { data } from 'react-router';
import { type UpdateSubscriptionBody, updateSubscriptionsBulk } from '@/lib/api/consent.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode, type ActionError } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';

/** Response shape returned by the update-marketing-consent action. */
export type UpdateMarketingConsentResponse = {
    success: boolean;
    error?: ActionError;
    partialSuccess?: boolean;
};

const VALID_CHANNELS = ['email', 'sms', 'whatsapp'] as const;
const VALID_STATUSES = ['opt_in', 'opt_out'] as const;

type UpdateItem = Record<string, unknown>;

/** Returns first validation error message or null. */
function validateUpdatesInput(updates: unknown[]): string | null {
    if (!updates.length) return 'updates is required and must not be empty';
    const trim = (v: unknown) => String(v ?? '').trim();
    const low = (v: unknown) => String(v ?? '').toLowerCase();
    for (const u of updates) {
        const o = (u ?? {}) as UpdateItem;
        if (!trim(o.subscriptionId)) return 'subscriptionId is required';
        const ch = low(o.channel) as (typeof VALID_CHANNELS)[number];
        if (!VALID_CHANNELS.includes(ch)) return `channel must be one of: ${VALID_CHANNELS.join(', ')}`;
        if (!trim(o.contactPointValue)) return 'contactPointValue is required';
        const st = low(o.status) as (typeof VALID_STATUSES)[number];
        if (!VALID_STATUSES.includes(st)) return `status must be one of: ${VALID_STATUSES.join(', ')}`;
    }
    return null;
}

/**
 * Server action: POST JSON { updates: [{ subscriptionId, channel, contactPointValue, status }, ...] }.
 * Validates input via validateUpdatesInput; calls SCAPI bulk endpoint (1–50 per request).
 */
export async function action({
    request,
    context,
}: Route.ActionArgs): Promise<ReturnType<typeof data<UpdateMarketingConsentResponse>>> {
    const logger = getLogger(context);

    logger.debug('UpdateMarketingConsent: starting', { method: request.method });

    if (request.method !== 'POST') {
        logger.warn('UpdateMarketingConsent: method not allowed', { method: request.method });
        return data(
            {
                success: false,
                error: createActionError({ code: ErrorCode.METHOD_NOT_ALLOWED, message: 'Method not allowed' }),
            },
            { status: 405 }
        );
    }

    try {
        const body = (await request.json()) as { updates?: unknown[] };
        const updates = Array.isArray(body?.updates) ? body.updates : [];

        logger.debug('UpdateMarketingConsent: validating updates', { updateCount: updates.length });

        const validationError = validateUpdatesInput(updates);
        if (validationError) {
            logger.warn('UpdateMarketingConsent: validation failed', { error: validationError });
            return data(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.INVALID_INPUT, message: validationError }),
                },
                { status: 400 }
            );
        }

        const bodies: UpdateSubscriptionBody[] = updates.map((u) => {
            const o = u as UpdateItem;
            return {
                subscriptionId: String(o.subscriptionId ?? '').trim(),
                channel: String(o.channel ?? '').toLowerCase() as UpdateSubscriptionBody['channel'],
                contactPointValue: String(o.contactPointValue ?? '').trim(),
                status: String(o.status ?? '').toLowerCase() as UpdateSubscriptionBody['status'],
            };
        });

        const result = await updateSubscriptionsBulk(context, bodies);

        // SCAPI bulk returns 200 when all succeed; 207 when some fail. Check per-item results.
        const results = result?.results ?? [];
        const failures = results.filter((r) => !r.success);

        if (failures.length > 0) {
            const allFailed = failures.length === results.length;
            logger.warn('UpdateMarketingConsent: some or all updates failed', {
                totalUpdates: results.length,
                failedUpdates: failures.length,
                allFailed,
            });
            return data(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.OPERATION_FAILED,
                        message: allFailed
                            ? 'All updates failed'
                            : `${failures.length} of ${results.length} update(s) failed`,
                    }),
                    partialSuccess: !allFailed,
                },
                { status: allFailed ? 500 : 207 }
            );
        }

        logger.info('UpdateMarketingConsent: succeeded', { updateCount: results.length });
        return data({ success: true });
    } catch (error) {
        logger.error('UpdateMarketingConsent: failed', { error });
        return data({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
