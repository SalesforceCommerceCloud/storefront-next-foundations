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

import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { resourceRoutes } from '@/route-paths';
import type { useToast } from '@/components/toast';
import type { ActionError } from '@/lib/error-codes';
/**
 * Type definition for action response
 */
export type ActionResponse = {
    success: boolean;
    error?: ActionError;
    [key: string]: unknown;
};

/**
 * Action handler configuration
 */
export interface ActionHandler {
    /** Action route URL */
    actionRoute: string;
    /** Build FormData from action parameters */
    buildFormData: (params: Record<string, unknown>) => FormData;
    /** Handle successful response */
    handleSuccess: (
        result: ActionResponse,
        params: Record<string, unknown>,
        addToast: ReturnType<typeof useToast>['addToast']
    ) => void;
    /** Handle error response */
    handleError: (
        result: ActionResponse,
        params: Record<string, unknown>,
        addToast: ReturnType<typeof useToast>['addToast']
    ) => void;
}

/**
 * Action registry - maps action names to their handlers
 * Extend this to support new actions (e.g., addToCart, etc.)
 *
 * This registry is lazy-loaded to avoid bundling it in the initial page load.
 * It's only loaded when there's actually a pending action to execute.
 */
export const actionRegistry: Record<string, ActionHandler> = {
    addToWishlist: {
        actionRoute: resourceRoutes.wishlistAdd,
        buildFormData: (params) => {
            const formData = new FormData();
            if (params.productId) {
                formData.append('productId', String(params.productId));
            }
            return formData;
        },
        handleSuccess: (result, params, addToast) => {
            const { t } = getTranslation();
            const productName = params.productName as string | undefined;
            if ((result as { alreadyInWishlist?: boolean }).alreadyInWishlist) {
                addToast(
                    productName ? t('product:alreadyInWishlist', { productName }) : t('product:itemAlreadyInWishlist'),
                    'info'
                );
            } else {
                addToast(
                    productName ? t('product:addedToWishlist', { productName }) : t('product:addedToWishlistGeneric'),
                    'success'
                );
            }
        },
        handleError: (result, _params, addToast) => {
            const { t } = getTranslation();
            addToast(result.error?.message || t('product:failedToAddToWishlist'), 'error');
        },
    },
};
