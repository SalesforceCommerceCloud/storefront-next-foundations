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
import { type ReactElement } from 'react';
import type { Route } from './+types/_app.account.store-preferences';
import StorePreferences from '@/components/store-preferences';
import { SeoMeta } from '@/components/seo-meta';
import { useTranslation } from 'react-i18next';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
// @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR
import { createApiClients } from '@/lib/api-clients.server';
import { selectedStoreContext } from '@/extensions/store-locator/middlewares/selected-store.server';
// @sfdc-extension-block-end SFDC_EXT_STORE_LOCATOR
import { getLogger } from '@/lib/logger.server';

/**
 * Loader function to fetch preferred store details from cookie.
 *
 * When the store-locator extension is installed, this loader reads the
 * selectedStoreInfo cookie and fetches full store details from SCAPI.
 */
export async function loader({ context }: Route.LoaderArgs) {
    const logger = getLogger(context);
    const { t } = getTranslation(context);

    // @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR
    const selectedStoreInfo = context.get(selectedStoreContext);

    if (selectedStoreInfo?.id) {
        try {
            const clients = createApiClients(context);
            const { data: storesData } = await clients.shopperStores.getStores({
                params: {
                    query: {
                        ids: selectedStoreInfo.id,
                    },
                },
            });

            const preferredStore = storesData?.data?.[0] || null;
            return { preferredStore, error: null };
        } catch (error) {
            logger.error('StorePreferences: failed to fetch preferred store', { error });
            return {
                preferredStore: null,
                error: t('storePreferences.preferredStore.error'),
            };
        }
    }
    // @sfdc-extension-block-end SFDC_EXT_STORE_LOCATOR

    return { preferredStore: null, error: null };
}

/**
 * Store Preferences route – renders at /account/store-preferences.
 */
export default function AccountStorePreferencesRoute(): ReactElement {
    const { t } = useTranslation('account');
    return (
        <>
            <SeoMeta title={t('meta.storePreferencesTitle', { defaultValue: 'Store Preferences' })} noIndex />
            <StorePreferences />
        </>
    );
}
