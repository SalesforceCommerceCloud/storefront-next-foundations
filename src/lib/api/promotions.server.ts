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
import type { ShopperPromotions } from '@/scapi';
import { createApiClients } from '@/lib/api-clients.server';
import { getLogger } from '@/lib/logger.server';
import { NormalizedApiError } from '@/lib/api/normalized-api-error';

/**
 * Fetch multiple promotions by IDs.
 *
 * Wraps SCAPI's `shopperPromotions.getPromotions` with operation-context logging and
 * normalizes any thrown error into `NormalizedApiError` for consistent downstream handling.
 *
 * @param context - Router context
 * @param ids - Array of promotion IDs
 * @returns Array of promotion data (empty when input is empty or response has no data)
 * @throws {NormalizedApiError} When the API request fails
 */
export async function fetchPromotionsByIds(
    context: LoaderFunctionArgs['context'],
    ids: string[]
): Promise<ShopperPromotions.schemas['Promotion'][]> {
    if (!ids.length) {
        return [];
    }

    const logger = getLogger(context);
    const clients = createApiClients(context);

    try {
        const { data } = await clients.shopperPromotions.getPromotions({
            params: {
                query: { ids },
            },
        });

        return data?.data ?? [];
    } catch (error) {
        logger.error('shopperPromotions.getPromotions failed', { ids });
        throw new NormalizedApiError(error);
    }
}
