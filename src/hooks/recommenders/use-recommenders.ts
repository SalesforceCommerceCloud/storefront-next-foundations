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

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ShopperProducts, ShopperSearch } from '@/scapi';
import { getBasePath } from '@/lib/utils';
import { useSite } from '@salesforce/storefront-next-runtime/site-context';
import { resourceRoutes } from '@/route-paths';

/**
 * Union type for products from either Shopper Products API or Shopper Search API.
 * Used as input to `getRecommendations`/`getZoneRecommendations` to give the
 * server a hint about anchor products (e.g. PDP "similar items").
 */
export type Product = ShopperProducts.schemas['Product'] | ShopperSearch.schemas['ProductSearchHit'];

/**
 * Recommendation response from the BFF. After server-side enrichment, `recs`
 * contains plain `ProductSearchHit` objects — the orchestrator joins each
 * vendor recommendation against SCAPI before returning, so the carousel can
 * consume the same shape it uses everywhere else.
 */
export type Recommendation = {
    recoUUID?: string;
    recommenderName?: string;
    displayMessage?: string;
    recs?: ShopperSearch.schemas['ProductSearchHit'][];
};

const RESOURCE_PATH = resourceRoutes.recommendations;

/**
 * Hook for client-driven recommendation fetches via the
 * `/resource/recommendations` BFF route. Identity (cookieId/userId/clientIp)
 * is stamped server-side and is never sent from the browser.
 */
export const useRecommenders = (isEnabled: boolean = true) => {
    const { currency } = useSite();
    const [isLoading, setIsLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<Recommendation>({});
    const [error, setError] = useState<Error | null>(null);

    const inflightRef = useRef<AbortController | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            inflightRef.current?.abort();
        };
    }, []);

    const fetchFromBff = useCallback(
        async (
            recommenderName: string,
            type: 'recommender' | 'zone',
            products?: Product[],
            args?: Record<string, unknown>
        ) => {
            if (!isEnabled) {
                return;
            }

            inflightRef.current?.abort();
            const ac = new AbortController();
            inflightRef.current = ac;

            setIsLoading(true);
            setError(null);

            const url = new URL(`${getBasePath()}${RESOURCE_PATH}`, window.location.origin);
            url.searchParams.set('recommenderName', recommenderName);
            if (type === 'zone') {
                url.searchParams.set('type', 'zone');
            }
            if (currency) {
                url.searchParams.set('currency', currency);
            }
            if (products && products.length > 0) {
                url.searchParams.set('products', JSON.stringify(products));
            }
            if (args && Object.keys(args).length > 0) {
                url.searchParams.set('args', JSON.stringify(args));
            }

            try {
                const res = await fetch(url.toString(), {
                    method: 'GET',
                    credentials: 'same-origin',
                    signal: ac.signal,
                });
                if (!res.ok) {
                    if (mountedRef.current) {
                        setError(new Error(`Recommendations request failed with status ${res.status}`));
                        setIsLoading(false);
                    }
                    return;
                }
                const data = (await res.json()) as Recommendation;
                if (mountedRef.current) {
                    setRecommendations({ ...data, recommenderName });
                    setIsLoading(false);
                }
            } catch (err) {
                if ((err as Error).name === 'AbortError') {
                    return;
                }
                if (mountedRef.current) {
                    setError(err instanceof Error ? err : new Error('Failed to fetch recommendations'));
                    setIsLoading(false);
                }
            }
        },
        [isEnabled, currency]
    );

    const getRecommendations = useCallback(
        (recommenderName: string, products?: Product[], args?: Record<string, unknown>) =>
            fetchFromBff(recommenderName, 'recommender', products, args),
        [fetchFromBff]
    );

    const getZoneRecommendations = useCallback(
        (zoneName: string, products?: Product[], args?: Record<string, unknown>) =>
            fetchFromBff(zoneName, 'zone', products, args),
        [fetchFromBff]
    );

    return {
        isLoading,
        isEnabled,
        recommendations,
        error,
        getRecommendations,
        getZoneRecommendations,
    };
};
