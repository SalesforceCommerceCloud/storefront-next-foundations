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
import { useState, useEffect } from 'react';
import { getCustomerLookupFromStorage, getLoginSuggestion } from '@/lib/customer/lookup-utils';

/**
 * Customer lookup result from the contact info submission
 */
export interface CustomerLookupResult {
    isRegistered: boolean;
    recommendation: 'guest' | 'login_suggested' | 'current_user';
    message?: string;
}

/**
 * Hook to access customer lookup results from session storage
 * This is populated when the user submits their email in the contact info step
 *
 * @returns CustomerLookupResult or null if not available
 */
export function useCustomerLookup(): CustomerLookupResult | null {
    const [lookupResult, setLookupResult] = useState<CustomerLookupResult | null>(null);

    useEffect(() => {
        const result = getCustomerLookupFromStorage();
        setLookupResult(result);
    }, []);

    return lookupResult;
}

/**
 * Hook to determine if the current customer should be prompted to login
 * Based on customer lookup results and current authentication state
 *
 * @returns Object with login suggestion state and message
 */
export function useLoginSuggestion(): {
    shouldSuggestLogin: boolean;
    message?: string;
    isCurrentUser: boolean;
} {
    const lookupResult = useCustomerLookup();
    return getLoginSuggestion(lookupResult);
}

// Re-export utility functions for convenience
export {
    clearCustomerLookup,
    saveCustomerLookupToStorage,
    isRegisteredCustomerLookup,
    isCurrentUserLookup,
} from '@/lib/customer/lookup-utils';
