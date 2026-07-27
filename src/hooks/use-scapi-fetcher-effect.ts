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
import type { ScapiFetcher } from './use-scapi-fetcher';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

/**
 * Configuration object for the useScapiFetcherEffect hook
 * @template TData - The type of data returned by the fetcher
 */
export interface ScapiFetcherEffectConfig<TData = unknown> {
    /** Callback function called when the fetcher operation succeeds */
    onSuccess?: (data: TData | undefined) => void;
    /** Callback function called when the fetcher operation fails */
    onError?: (errors: string[]) => void;
}

/**
 * A helper hook that provides a convenient way to handle success and error callbacks
 * for useScapiFetcher operations. This hook watches the fetcher's state and calls
 * the appropriate callbacks when the operation completes.
 *
 * This is particularly useful for form implementations and other scenarios where
 * you need to react to the completion of fetcher operations without manually
 * checking the fetcher's state in useEffect.
 *
 * @template TData - The type of data returned by the fetcher
 * @param fetcher - The fetcher instance returned by useScapiFetcher
 * @param config - Configuration object containing onSuccess and onError callbacks
 *
 * @example
 * ```tsx
 * import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
 * import { useScapiFetcherEffect } from '@/hooks/use-scapi-fetcher-effect';
 *
 * export default function MyForm() {
 *   const fetcher = useScapiFetcher('shopperCustomers', 'updateCustomer', {
 *     params: {
 *       path: { customerId: 'customer-123' },
 *     },
 *     body: {}
 *   });
 *
 *   useScapiFetcherEffect(fetcher, {
 *     onSuccess: (data) => {
 *       console.log('Customer updated successfully:', data);
 *       // Handle success (e.g., show success message, redirect, etc.)
 *     },
 *     onError: (errors) => {
 *       console.error('Failed to update customer:', errors);
 *       // Handle error (e.g., show error message, reset form, etc.)
 *     }
 *   });
 *
 *   const handleSubmit = (formData) => {
 *     fetcher.submit(formData);
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       // form fields
 *     </form>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Using with load operations
 *
 * export default function ProductList() {
 *   const fetcher = useScapiFetcher('shopperProducts', 'getProducts', {
 *     params: {
 *       query: { ids: 'apple-ipod-shuffle,apple-ipod-nano }
 *     }
 *   });
 *
 *   useScapiFetcherEffect(fetcher, {
 *     onSuccess: (products) => {
 *       setProducts(products);
 *     },
 *     onError: (errors) => {
 *       setError(errors.join(', '));
 *     }
 *   });
 *
 *   useEffect(() => {
 *     fetcher.load();
 *   }, [fetcher]);
 *
 *   return <div>// render products</div>;
 * }
 * ```
 */
export function useScapiFetcherEffect<TData = unknown, TSubmitPayload = unknown>(
    fetcher: ScapiFetcher<TData, TSubmitPayload>,
    config: ScapiFetcherEffectConfig<TData>
): void {
    // TODO: Implement onSuccess and onError callback tracking to avoid calling callbacks when the fetcher is not in idle state.
    const { onSuccess, onError } = config;

    // Track the previous state to detect changes
    const previousStateRef = useRef<string | undefined>(fetcher.state);

    useEffect(() => {
        const currentState = fetcher.state;
        const currentData = fetcher.data;
        const currentSuccess = fetcher.success;
        const currentErrors = fetcher.errors;

        // Only process when the state has changed and we're in idle state (operation completed)
        const stateChanged = previousStateRef.current !== currentState;

        if (stateChanged && currentState === 'idle') {
            if (currentSuccess && onSuccess) {
                try {
                    onSuccess(currentData as TData | undefined);
                } catch (error) {
                    logger.error('Error in onSuccess callback', { error });
                }
            } else if (!currentSuccess && currentErrors && onError) {
                try {
                    onError(currentErrors);
                } catch (error) {
                    logger.error('Error in onError callback', { error });
                }
            }
        }

        // Update ref with current state
        previousStateRef.current = currentState;
    }, [fetcher, onSuccess, onError]);
}
