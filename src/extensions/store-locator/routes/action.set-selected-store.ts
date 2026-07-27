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
/** @sfdc-extension-file SFDC_EXT_STORE_LOCATOR */
import { data } from 'react-router';
import type { Route } from './+types/action.set-selected-store';
import { updateSelectedStore } from '@/extensions/store-locator/middlewares/selected-store.server';
import { getLogger } from '@/lib/logger.server';

/**
 * Server action to set or clear the selected store cookie.
 *
 * Called when the user selects or clears a store from the store locator.
 * Validates the store info and delegates to middleware for Set-Cookie.
 *
 * Form data:
 * - `storeInfo`: JSON string of SelectedStoreInfo, or empty string to clear
 */
export const action = async ({ request, context }: Route.ActionArgs) => {
    const logger = getLogger(context);
    const formData = await request.formData();
    const storeInfoRaw = formData.get('storeInfo') as string;

    logger.debug('SetSelectedStore: starting', { hasStoreInfo: storeInfoRaw !== null && storeInfoRaw !== undefined });

    if (storeInfoRaw === null || storeInfoRaw === undefined) {
        logger.warn('SetSelectedStore: storeInfo parameter missing');
        throw new Response('storeInfo is required', { status: 400 });
    }

    if (!storeInfoRaw) {
        logger.info('SetSelectedStore: clearing selected store');
        // Clear the selected store
        updateSelectedStore(context, null);
        return data({ success: true });
    }

    let storeInfo: { id?: string; name?: string; inventoryId?: string };
    try {
        storeInfo = JSON.parse(storeInfoRaw);
    } catch (error) {
        logger.warn('SetSelectedStore: invalid JSON', { error });
        throw new Response('Invalid storeInfo JSON', { status: 400 });
    }

    if (!storeInfo.id) {
        logger.warn('SetSelectedStore: storeInfo missing id');
        throw new Response('storeInfo must have an id', { status: 400 });
    }

    logger.info('SetSelectedStore: succeeded', {
        storeId: storeInfo.id,
        hasName: !!storeInfo.name,
        hasInventoryId: !!storeInfo.inventoryId,
    });

    updateSelectedStore(context, { id: storeInfo.id, name: storeInfo.name, inventoryId: storeInfo.inventoryId });

    return data({ success: true });
};
