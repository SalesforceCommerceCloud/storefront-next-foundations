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
import type { RouterContextProvider } from 'react-router';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { ShopperProducts, ShopperSearch } from '@/scapi';
import { getAuth } from '@/middlewares/auth.server';
import { getClientRequestInfo } from '@/lib/client-request-info.server';
import { createTimeoutFetch, getMrtRequestTimeoutMs } from '@/lib/api-clients.server';
import { validateEinsteinConfig } from '@/lib/adapters/engagement/einstein-config';
import type { Product } from '@/hooks/recommenders/use-recommenders';

/**
 * Raw Einstein recommendation response (camelCased). `recs[]` carries vendor recommendation ids
 * — the orchestrator joins each id against SCAPI to build the public `ProductSearchHit`-shaped
 * carousel payload, so the public `Recommendation` type intentionally does not surface this shape.
 */
export type EinsteinRecommendationResponse = {
    recoUUID?: string;
    recommenderName?: string;
    displayMessage?: string;
    recs?: { id?: string }[];
};

/**
 * Reserved body keys derived server-side. Caller-supplied `args` may not override these:
 * identity (`cookieId`, `userId`), segmentation (`clientIp`, `clientUserAgent`),
 * environment (`instanceType`), tenancy (`realm`), or routing (`type`, used to select recommender vs zone).
 */
const RESERVED_KEYS = ['cookieId', 'userId', 'clientIp', 'clientUserAgent', 'instanceType', 'realm', 'type'] as const;

function sanitizeArgs(args: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!args) return {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
        if ((RESERVED_KEYS as readonly string[]).includes(k)) continue;
        out[k] = v;
    }
    return out;
}

type EinsteinProductBody = { id: string; sku?: string; altId?: string; type?: string; price?: number };

function getProductMapping(product: Partial<ShopperProducts.schemas['Product']>, price?: number): EinsteinProductBody {
    const productId = product.id || '';
    const masterId = product.master?.masterId ?? productId;
    let mapping: EinsteinProductBody;
    if (product.type?.variant) {
        mapping = { id: masterId, sku: productId };
    } else if (product.type?.variationGroup) {
        mapping = { id: masterId, sku: productId, altId: productId, type: 'vgroup' };
    } else {
        mapping = { id: productId };
    }
    if (price !== undefined) mapping.price = price;
    return mapping;
}

function transformProductToEinsteinProduct(
    product: Product | ShopperSearch.schemas['ProductSearchHit']
): EinsteinProductBody {
    if ('hitType' in product || 'productId' in product) {
        return {
            id: (product as ShopperSearch.schemas['ProductSearchHit']).productId,
            sku: (product as ShopperSearch.schemas['ProductSearchHit']).productId,
        };
    }
    const fullProduct = product;
    return getProductMapping(fullProduct, fullProduct.price);
}

function keysToCamel(obj: unknown): EinsteinRecommendationResponse {
    if (Array.isArray(obj)) {
        return obj.map((item) => keysToCamel(item)) as EinsteinRecommendationResponse;
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce(
            (result, key) => {
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                result[camelKey] = keysToCamel((obj as Record<string, unknown>)[key]);
                return result;
            },
            {} as Record<string, unknown>
        ) as EinsteinRecommendationResponse;
    }
    return obj as EinsteinRecommendationResponse;
}

export type GetEinsteinRecommendationsArgs = {
    context: Readonly<RouterContextProvider>;
    request: Request;
    name: string;
    products?: Product[];
    args?: Record<string, unknown>;
    signal?: AbortSignal;
};

/**
 * Server-side Einstein recommendations call. The only place that talks to the Einstein recs vendor.
 *
 * Identity (`cookieId`, optional `userId`) is derived from `getAuth(context)`; segmentation
 * (`clientIp`, `clientUserAgent`) from request headers via `getClientRequestInfo`; `instanceType`
 * from `config.isProduction`. Caller-supplied `args` is sanitized of reserved keys before merge.
 *
 * Routes `args.type === 'zone'` to the zone endpoint; otherwise the recommender endpoint. Outbound
 * fetch is wrapped with `createTimeoutFetch(MRT_REQUEST_TIMEOUT)` and forwards `signal ?? request.signal`.
 * `AbortError` / `TimeoutError` propagate to the caller (the orchestrator silences them).
 *
 * Not an adapter method — imported directly by the orchestrator.
 * @see {@link https://developer.salesforce.com/docs/commerce/einstein-api/references/einstein-recommendations?meta=getRecommendations}
 * @see {@link https://developer.salesforce.com/docs/commerce/einstein-api/references/einstein-recommendations?meta=getZoneRecommendations}
 */
export async function getEinsteinRecommendations({
    context,
    request,
    name,
    products,
    args,
    signal,
}: GetEinsteinRecommendationsArgs): Promise<EinsteinRecommendationResponse> {
    const appConfig = getConfig(context);
    const config = appConfig.engagement?.adapters?.einstein;
    if (!config?.enabled || !validateEinsteinConfig(config).valid) {
        return {};
    }

    const auth = getAuth(context);
    const { clientIp, clientUserAgent } = getClientRequestInfo(request);
    const sanitized = sanitizeArgs(args);
    const isZone = args?.type === 'zone';
    const siteIdentifier = `${config.realm}-${config.siteId}`;
    const endpoint = isZone
        ? `/personalization/${siteIdentifier}/zones/${name}/recs`
        : `/personalization/recs/${siteIdentifier}/${name}`;
    const url = `${config.host}/v3${endpoint}`;

    const body: Record<string, unknown> = {
        ...sanitized,
        cookieId: auth.usid,
        instanceType: config.isProduction ? 'prd' : 'sbx',
        realm: config.realm,
        ...(auth.userType === 'registered' && auth.customerId ? { userId: auth.customerId } : {}),
        ...(clientIp ? { clientIp } : {}),
        ...(clientUserAgent ? { clientUserAgent } : {}),
    };
    if (products && products.length > 0) {
        body.products = products.map(transformProductToEinsteinProduct);
    }

    const fetchImpl = createTimeoutFetch(context, globalThis.fetch, getMrtRequestTimeoutMs());
    const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cq-client-id': config.einsteinId },
        body: JSON.stringify(body),
        signal: signal ?? request.signal,
    });
    if (!response.ok) {
        return {};
    }
    const responseJson = await response.json();
    return keysToCamel(responseJson);
}
