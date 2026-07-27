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
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperConsents } from '@/scapi';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import { siteContext, type SiteContext } from '@salesforce/storefront-next-runtime/site-context';
import { createApiClients } from '@/lib/api-clients.server';

/** Expand param for getSubscriptions: include consentStatus so responses have per-channel opt-in/opt-out. */
const GET_SUBSCRIPTIONS_EXPAND = ['consentStatus'] as const;

export type UpdateSubscriptionBody = ShopperConsents.schemas['ConsentSubscriptionRequest'];

/**
 * Get shopper consent subscription preferences (server-side).
 *
 * Use in loaders when you need subscriptions as part of page data. For client-side
 * fetching from a component, use useScapiFetcher('shopperConsents', 'getSubscriptions', ...) instead.
 *
 * @param context - React Router context from loader/action
 * @returns Subscription response or null on error (e.g. missing scope, 403)
 * @see https://developer.salesforce.com/docs/commerce/commerce-api/references/consents?meta=getSubscriptions
 */
export async function getSubscriptions(
    context: LoaderFunctionArgs['context']
): Promise<ShopperConsents.schemas['ConsentSubscriptionResponse'] | null> {
    try {
        const config = getConfig(context);
        const clients = createApiClients(context);
        const { site } = context.get(siteContext) as SiteContext;
        const { data } = await clients.shopperConsents.getSubscriptions({
            params: {
                path: { organizationId: config.commerce.api.organizationId },
                query: { siteId: site.id, expand: [...GET_SUBSCRIPTIONS_EXPAND] },
            },
        });
        return data ?? null;
    } catch {
        return null;
    }
}

/**
 * Update multiple consent subscriptions in one bulk request (server-side).
 *
 * Uses SCAPI POST .../subscriptions/actions/bulk. Supports 1–50 updates per request.
 * Returns 200 when all succeed; 207 with per-item results when some fail.
 *
 * @param context - React Router context from loader/action
 * @param bodies - Array of subscriptionId, channel, contactPointValue, status
 * @returns Bulk response with results per subscription
 * @throws ApiError when the bulk request fails (e.g. 400)
 * @see https://developer.salesforce.com/docs/commerce/commerce-api/references/shopper-consents?meta=updateSubscriptions
 */
export async function updateSubscriptionsBulk(
    context: LoaderFunctionArgs['context'],
    bodies: UpdateSubscriptionBody[]
): Promise<ShopperConsents.schemas['ConsentSubscriptionBulkResponse']> {
    const config = getConfig(context);
    const clients = createApiClients(context);
    const { site } = context.get(siteContext) as SiteContext;
    const { data } = await clients.shopperConsents.updateSubscriptions({
        params: {
            path: { organizationId: config.commerce.api.organizationId },
            query: { siteId: site.id },
        },
        body: { subscriptions: bodies },
    });
    return data;
}
