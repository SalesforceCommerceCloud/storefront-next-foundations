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
import type { CustomerLookupResult } from '@/hooks/use-customer-lookup';

/**
 * Clear customer lookup results from session storage
 * Useful when starting a new checkout session or logging out
 */
export function clearCustomerLookup(): void {
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('customerLookupResult');
    }
}

/**
 * Get customer lookup result from session storage
 * @returns CustomerLookupResult or null if not available or invalid
 */
export function getCustomerLookupFromStorage(): CustomerLookupResult | null {
    if (typeof sessionStorage === 'undefined') {
        return null;
    }

    try {
        const stored = sessionStorage.getItem('customerLookupResult');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Failed to parse customer lookup result, ignore silently
    }

    return null;
}

/**
 * Save customer lookup result to session storage
 * @param result - Customer lookup result to save
 */
export function saveCustomerLookupToStorage(result: CustomerLookupResult): void {
    if (typeof sessionStorage !== 'undefined') {
        try {
            sessionStorage.setItem('customerLookupResult', JSON.stringify(result));
        } catch {
            // Failed to save to session storage, ignore silently
        }
    }
}

/**
 * Determine if login should be suggested based on customer lookup result
 * @param lookupResult - Customer lookup result
 * @returns Object with login suggestion state
 */
export function getLoginSuggestion(lookupResult: CustomerLookupResult | null): {
    shouldSuggestLogin: boolean;
    message?: string;
    isCurrentUser: boolean;
} {
    if (!lookupResult) {
        return {
            shouldSuggestLogin: false,
            isCurrentUser: false,
        };
    }

    return {
        shouldSuggestLogin: lookupResult.recommendation === 'login_suggested',
        message: lookupResult.message,
        isCurrentUser: lookupResult.recommendation === 'current_user',
    };
}

/**
 * Check if customer lookup result indicates a registered user
 * @param lookupResult - Customer lookup result
 * @returns true if the customer is registered
 */
export function isRegisteredCustomerLookup(lookupResult: CustomerLookupResult | null): boolean {
    return lookupResult?.isRegistered === true;
}

/**
 * Check if customer lookup result indicates the current logged-in user
 * @param lookupResult - Customer lookup result
 * @returns true if this is the current user's email
 */
export function isCurrentUserLookup(lookupResult: CustomerLookupResult | null): boolean {
    return lookupResult?.recommendation === 'current_user';
}
