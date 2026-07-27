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
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCustomerLookup, useLoginSuggestion } from './use-customer-lookup';

// Mock the utility functions
vi.mock('@/lib/customer/lookup-utils', () => ({
    getCustomerLookupFromStorage: vi.fn(),
    getLoginSuggestion: vi.fn(),
}));

describe('Customer Lookup Hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useCustomerLookup', () => {
        test('should return data from getCustomerLookupFromStorage', async () => {
            const lookupData = {
                isRegistered: true,
                recommendation: 'current_user' as const,
                message: 'Using your account information',
            };

            const { getCustomerLookupFromStorage } = await import('@/lib/customer/lookup-utils');
            vi.mocked(getCustomerLookupFromStorage).mockReturnValue(lookupData);

            const { result } = renderHook(() => useCustomerLookup());

            expect(result.current).toEqual(lookupData);
            expect(getCustomerLookupFromStorage).toHaveBeenCalled();
        });

        test('should return null when utility returns null', async () => {
            const { getCustomerLookupFromStorage } = await import('@/lib/customer/lookup-utils');
            vi.mocked(getCustomerLookupFromStorage).mockReturnValue(null);

            const { result } = renderHook(() => useCustomerLookup());

            expect(result.current).toBeNull();
            expect(getCustomerLookupFromStorage).toHaveBeenCalled();
        });
    });

    describe('useLoginSuggestion', () => {
        test('should return result from getLoginSuggestion utility', async () => {
            const lookupData = {
                isRegistered: true,
                recommendation: 'login_suggested' as const,
                message: 'Please login to continue',
            };

            const expectedResult = {
                shouldSuggestLogin: true,
                message: 'Please login to continue',
                isCurrentUser: false,
            };

            const { getCustomerLookupFromStorage, getLoginSuggestion } = await import('@/lib/customer/lookup-utils');
            vi.mocked(getCustomerLookupFromStorage).mockReturnValue(lookupData);
            vi.mocked(getLoginSuggestion).mockReturnValue(expectedResult);

            const { result } = renderHook(() => useLoginSuggestion());

            expect(result.current).toEqual(expectedResult);
            expect(getLoginSuggestion).toHaveBeenCalledWith(lookupData);
        });

        test('should handle null lookup result', async () => {
            const expectedResult = {
                shouldSuggestLogin: false,
                isCurrentUser: false,
            };

            const { getCustomerLookupFromStorage, getLoginSuggestion } = await import('@/lib/customer/lookup-utils');
            vi.mocked(getCustomerLookupFromStorage).mockReturnValue(null);
            vi.mocked(getLoginSuggestion).mockReturnValue(expectedResult);

            const { result } = renderHook(() => useLoginSuggestion());

            expect(result.current).toEqual(expectedResult);
            expect(getLoginSuggestion).toHaveBeenCalledWith(null);
        });

        test('should handle current user recommendation', async () => {
            const lookupData = {
                isRegistered: true,
                recommendation: 'current_user' as const,
                message: 'Using your account information',
            };

            const expectedResult = {
                shouldSuggestLogin: false,
                message: 'Using your account information',
                isCurrentUser: true,
            };

            const { getCustomerLookupFromStorage, getLoginSuggestion } = await import('@/lib/customer/lookup-utils');
            vi.mocked(getCustomerLookupFromStorage).mockReturnValue(lookupData);
            vi.mocked(getLoginSuggestion).mockReturnValue(expectedResult);

            const { result } = renderHook(() => useLoginSuggestion());

            expect(result.current).toEqual(expectedResult);
            expect(getLoginSuggestion).toHaveBeenCalledWith(lookupData);
        });

        test('should handle guest recommendation', async () => {
            const lookupData = {
                isRegistered: false,
                recommendation: 'guest' as const,
                message: 'Continuing as guest',
            };

            const expectedResult = {
                shouldSuggestLogin: false,
                message: 'Continuing as guest',
                isCurrentUser: false,
            };

            const { getCustomerLookupFromStorage, getLoginSuggestion } = await import('@/lib/customer/lookup-utils');
            vi.mocked(getCustomerLookupFromStorage).mockReturnValue(lookupData);
            vi.mocked(getLoginSuggestion).mockReturnValue(expectedResult);

            const { result } = renderHook(() => useLoginSuggestion());

            expect(result.current).toEqual(expectedResult);
            expect(getLoginSuggestion).toHaveBeenCalledWith(lookupData);
        });
    });
});
