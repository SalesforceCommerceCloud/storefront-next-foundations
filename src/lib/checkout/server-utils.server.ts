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

/**
 * Server-side checkout utilities for SSR support
 *
 * This module provides server-compatible versions of checkout functions
 * that don't rely on browser APIs like localStorage or document.cookie.
 */

import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperBasketsV2 } from '@/scapi';
import type { SessionData as AuthData } from '@/lib/api/types';
import type { CustomerProfile } from '@/components/checkout/utils/checkout-context-types';
import { createApiClients } from '@/lib/api-clients.server';
import { getBasket } from '@/middlewares/basket.server';
import { fetchShippingMethodsMapForBasket } from '@/lib/checkout/loaders.server';

/**
 * Server-side customer profile retrieval using validated auth session
 *
 * Fetches customer profile data using the validated auth session from middleware.
 */
export function getServerCustomerProfile(
    context: LoaderFunctionArgs['context'],
    authSession: AuthData
): Promise<CustomerProfile | null> {
    try {
        if (!authSession || !authSession.customerId) {
            return Promise.resolve(null);
        }

        // Check if user is actually a registered customer (not just auto-registered guest)
        const userIsRegistered = authSession.userType === 'registered';
        if (!userIsRegistered) {
            return Promise.resolve(null);
        }

        // Use the provided auth session and proper context
        const clients = createApiClients(context);

        // Fetch customer data and return promise for streaming
        return clients.shopperCustomers
            .getCustomer({
                params: {
                    path: {
                        customerId: authSession.customerId,
                    },
                },
            })
            .then(({ data: customer }) => {
                const addresses = customer.addresses || [];
                return {
                    customer,
                    addresses,
                    paymentInstruments: customer.paymentInstruments || [],
                    preferredShippingAddress: addresses.find((addr) => addr.preferred) || addresses[0],
                    preferredBillingAddress: addresses.find((addr) => addr.preferred) || addresses[0],
                };
            });
    } catch {
        // Failed to fetch customer profile
        return Promise.resolve(null);
    }
}

/**
 * Fetches shipping methods for all shipments in the basket (server-side wrapper)
 * Gets the basket from middleware and delegates to shared utility
 */
export async function getServerShippingMethodsMap(
    context: LoaderFunctionArgs['context']
): Promise<Record<string, ShopperBasketsV2.schemas['ShippingMethodResult']>> {
    try {
        // Get basket using existing basket middleware
        const basket = (await getBasket(context)).current;
        return await fetchShippingMethodsMapForBasket(context, basket);
    } catch {
        // Failed to fetch shipping methods
        return {};
    }
}

/**
 * Server-side checkout data structure
 *
 * This mirrors the CheckoutPageData type but with resolved data instead of promises,
 * since server-side rendering should resolve data before sending to client.
 */
export type ServerCheckoutData = {
    basket?: ShopperBasketsV2.schemas['Basket'] | null;
    customerProfile?: Promise<CustomerProfile | null>;
    shippingMethodsMap?: Promise<Record<string, ShopperBasketsV2.schemas['ShippingMethodResult']>>;
    isRegisteredCustomer?: boolean;
};

/**
 * Server-side checkout data fetcher
 *
 * Fetches all necessary checkout data using validated auth sessions.
 * This function uses the standard auth middleware and ensures token freshness.
 */
export async function getServerCheckoutData(
    { context }: LoaderFunctionArgs,
    authSession: AuthData
): Promise<ServerCheckoutData> {
    try {
        if (!authSession) {
            return {
                basket: null,
                customerProfile: Promise.resolve(null),
                shippingMethodsMap: Promise.resolve({}),
                isRegisteredCustomer: false,
            };
        }

        const isRegistered = authSession.userType === 'registered';

        const basket = (await getBasket(context)).current;

        // Fetch all dependent data in parallel
        const customerProfilePromise = isRegistered
            ? getServerCustomerProfile(context, authSession)
            : Promise.resolve(null);

        const shippingMethodsMapPromise =
            basket?.basketId && basket.shipments && basket.shipments.length > 0
                ? fetchShippingMethodsMapForBasket(context, basket)
                : Promise.resolve({});

        // Execute all remaining fetches in parallel - return promises directly for streaming
        return {
            basket,
            customerProfile: customerProfilePromise,
            shippingMethodsMap: shippingMethodsMapPromise,
            isRegisteredCustomer: isRegistered,
        };
    } catch {
        // Return empty data on error - client-side will handle fallback
        return {
            basket: null,
            customerProfile: Promise.resolve(null),
            shippingMethodsMap: Promise.resolve({}),
            isRegisteredCustomer: false,
        };
    }
}
