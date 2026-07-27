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
/** @sfdc-extension-file SFDC_EXT_SHIPPING_DELIVERY */
import { data } from 'react-router';
import type { Route } from './+types/resource.shipping-estimate';
import { extractResponseError } from '@/lib/utils';
import { getLogger } from '@/lib/logger.server';
import {
    getShippingEstimates,
    type ShippingEstimate,
} from '@/extensions/shipping-delivery/lib/api/shipping-delivery.server';

const US_POSTAL_CODE_REGEX = /^\d{5}(-\d{4})?$/;

export type ShippingEstimateResult =
    | { success: true; zipcode: string; estimate: ShippingEstimate }
    | { success: false; zipcode: string; error: string };

export async function loader({
    request,
    context,
}: Route.LoaderArgs): Promise<ReturnType<typeof data<ShippingEstimateResult>>> {
    const logger = getLogger(context);
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    const zipcode = url.searchParams.get('zipcode') ?? '';

    if (!productId || !zipcode) {
        return data({ success: false, zipcode, error: 'productId and zipcode are required' }, { status: 400 });
    }

    if (!US_POSTAL_CODE_REGEX.test(zipcode)) {
        return data({ success: false, zipcode, error: 'Invalid ZIP code format' }, { status: 400 });
    }

    try {
        const estimate = await getShippingEstimates(productId, zipcode);
        return data({ success: true, zipcode, estimate });
    } catch (error) {
        logger.error('ShippingEstimate: lookup failed', { error });
        let responseMessage: string;
        let statusCode = 500;
        try {
            const extracted = await extractResponseError(error as Error);
            responseMessage = extracted.responseMessage ?? 'Unknown error';
            statusCode = Number(extracted.status_code) || 500;
        } catch {
            responseMessage = error instanceof Error ? error.message : 'Unknown error';
        }
        return data({ success: false, zipcode, error: responseMessage }, { status: statusCode });
    }
}
