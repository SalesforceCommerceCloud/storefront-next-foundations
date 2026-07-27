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
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { useNavigate } from '@/hooks/use-navigate';
import { getSearchWithoutActionParams } from './use-filters-panel-state';

interface CheckAndExecutePendingActionOptions {
    /** The action name to match (e.g., 'addToCart', 'updateQuantity', 'removeItem') */
    actionName: string;
    /**
     * Function that determines if the pending action matches this component.
     * Receives the parsed action params from the URL and should return true if the action should execute.
     *
     * @example
     * // Match by productId
     * shouldExecute: (params) => params.productId === currentProductId
     *
     * @example
     * // Match by multiple criteria
     * shouldExecute: (params) => params.itemId === currentItemId && params.quantity === 1
     */
    shouldExecute: (actionParams: Record<string, unknown>) => boolean;
    /** Callback to execute if action matches - receives the parsed action params */
    onMatch: (actionParams: Record<string, unknown>) => void | Promise<void>;
}

/**
 * Generic helper hook that checks URL query params for pending actions and executes them if they match.
 *
 * This is used by components to execute pending actions that were initiated before authentication.
 * The component must be mounted and ready before this hook executes the action.
 *
 * @example
 * ```tsx
 * // Match by productId
 * useCheckAndExecutePendingAction({
 *   actionName: 'addToCart',
 *   shouldExecute: (params) => params.productId === currentProductId,
 *   onMatch: async (params) => {
 *     setIsLoading(true);
 *     await handleAddToCart(product);
 *   }
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Match by multiple criteria
 * useCheckAndExecutePendingAction({
 *   actionName: 'updateQuantity',
 *   shouldExecute: (params) => params.itemId === currentItemId && params.variantId === currentVariantId,
 *   onMatch: async (params) => {
 *     setIsUpdating(true);
 *     await handleUpdateQuantity(params.itemId, params.quantity);
 *   }
 * });
 * ```
 */
export function useCheckAndExecutePendingAction({
    actionName,
    shouldExecute,
    onMatch,
}: CheckAndExecutePendingActionOptions) {
    const location = useLocation();
    const navigate = useNavigate();
    const hasExecutedRef = useRef(false);

    useEffect(() => {
        // Only execute once per mount
        if (hasExecutedRef.current) {
            return;
        }

        // Check for pending action in URL params
        const urlParams = new URLSearchParams(location.search);
        const urlAction = urlParams.get('action');
        const urlActionParamsStr = urlParams.get('actionParams');

        // Check if this is the action we're looking for
        if (urlAction === actionName && urlActionParamsStr) {
            try {
                const urlActionParams = JSON.parse(urlActionParamsStr);

                // Use the provided matcher function to determine if we should execute
                if (shouldExecute(urlActionParams)) {
                    hasExecutedRef.current = true;

                    // Execute the action — URL param cleanup is left to the consumer
                    void (async () => {
                        try {
                            await onMatch(urlActionParams);
                        } catch (error) {
                            hasExecutedRef.current = false;
                            throw error;
                        }
                    })();
                }
            } catch {
                // Invalid JSON or other error - clear URL params
                void navigate(
                    { pathname: location.pathname, search: getSearchWithoutActionParams(location.search) },
                    { replace: true }
                );
            }
        }
    }, [actionName, shouldExecute, location.pathname, location.search, onMatch, navigate]);
}
