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
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CustomerLookupResult } from '@/hooks/use-customer-lookup';
import {
    clearCustomerLookup,
    getCustomerLookupFromStorage,
    saveCustomerLookupToStorage,
    getLoginSuggestion,
    isRegisteredCustomerLookup,
    isCurrentUserLookup,
} from './lookup-utils';

// Mock sessionStorage
const mockSessionStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true,
});

describe('Customer Lookup Utils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('clearCustomerLookup', () => {
        it('should remove customerLookupResult from sessionStorage', () => {
            clearCustomerLookup();

            expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('customerLookupResult');
        });

        it('should handle missing sessionStorage gracefully', () => {
            // Temporarily remove sessionStorage
            const originalSessionStorage = window.sessionStorage;
            // @ts-expect-error - Testing undefined sessionStorage
            delete window.sessionStorage;

            expect(() => clearCustomerLookup()).not.toThrow();

            // Restore sessionStorage
            window.sessionStorage = originalSessionStorage;
        });
    });

    describe('getCustomerLookupFromStorage', () => {
        it('should return null when sessionStorage is undefined', () => {
            // Temporarily remove sessionStorage
            const originalSessionStorage = window.sessionStorage;
            // @ts-expect-error - Testing undefined sessionStorage
            delete window.sessionStorage;

            const result = getCustomerLookupFromStorage();
            expect(result).toBeNull();

            // Restore sessionStorage
            window.sessionStorage = originalSessionStorage;
        });

        it('should return null when no data is stored', () => {
            mockSessionStorage.getItem.mockReturnValue(null);

            const result = getCustomerLookupFromStorage();
            expect(result).toBeNull();
        });

        it('should return parsed data when valid JSON is stored', () => {
            const lookupData: CustomerLookupResult = {
                isRegistered: true,
                recommendation: 'current_user',
                message: 'Using your account information',
            };

            mockSessionStorage.getItem.mockReturnValue(JSON.stringify(lookupData));

            const result = getCustomerLookupFromStorage();
            expect(result).toEqual(lookupData);
        });

        it('should return null when stored data is invalid JSON', () => {
            mockSessionStorage.getItem.mockReturnValue('invalid-json');

            const result = getCustomerLookupFromStorage();
            expect(result).toBeNull();
        });
    });

    describe('saveCustomerLookupToStorage', () => {
        it('should save data to sessionStorage', () => {
            const lookupData: CustomerLookupResult = {
                isRegistered: false,
                recommendation: 'guest',
                message: 'Continuing as guest',
            };

            saveCustomerLookupToStorage(lookupData);

            expect(mockSessionStorage.setItem).toHaveBeenCalledWith('customerLookupResult', JSON.stringify(lookupData));
        });

        it('should handle missing sessionStorage gracefully', () => {
            // Temporarily remove sessionStorage
            const originalSessionStorage = window.sessionStorage;
            // @ts-expect-error - Testing undefined sessionStorage
            delete window.sessionStorage;

            const lookupData: CustomerLookupResult = {
                isRegistered: false,
                recommendation: 'guest',
            };

            expect(() => saveCustomerLookupToStorage(lookupData)).not.toThrow();

            // Restore sessionStorage
            window.sessionStorage = originalSessionStorage;
        });

        it('should handle setItem errors gracefully', () => {
            mockSessionStorage.setItem.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            const lookupData: CustomerLookupResult = {
                isRegistered: false,
                recommendation: 'guest',
            };

            expect(() => saveCustomerLookupToStorage(lookupData)).not.toThrow();
        });
    });

    describe('getLoginSuggestion', () => {
        it('should return default state when lookupResult is null', () => {
            const result = getLoginSuggestion(null);

            expect(result).toEqual({
                shouldSuggestLogin: false,
                isCurrentUser: false,
            });
        });

        it('should suggest login for login_suggested recommendation', () => {
            const lookupResult: CustomerLookupResult = {
                isRegistered: true,
                recommendation: 'login_suggested',
                message: 'Please login to continue',
            };

            const result = getLoginSuggestion(lookupResult);

            expect(result).toEqual({
                shouldSuggestLogin: true,
                message: 'Please login to continue',
                isCurrentUser: false,
            });
        });

        it('should not suggest login for guest recommendation', () => {
            const lookupResult: CustomerLookupResult = {
                isRegistered: false,
                recommendation: 'guest',
                message: 'Continuing as guest',
            };

            const result = getLoginSuggestion(lookupResult);

            expect(result).toEqual({
                shouldSuggestLogin: false,
                message: 'Continuing as guest',
                isCurrentUser: false,
            });
        });

        it('should identify current user correctly', () => {
            const lookupResult: CustomerLookupResult = {
                isRegistered: true,
                recommendation: 'current_user',
                message: 'Using your account information',
            };

            const result = getLoginSuggestion(lookupResult);

            expect(result).toEqual({
                shouldSuggestLogin: false,
                message: 'Using your account information',
                isCurrentUser: true,
            });
        });
    });

    describe('isRegisteredCustomerLookup', () => {
        it('should return false when lookupResult is null', () => {
            const result = isRegisteredCustomerLookup(null);
            expect(result).toBe(false);
        });

        it('should return false when isRegistered is false', () => {
            const lookupResult: CustomerLookupResult = {
                isRegistered: false,
                recommendation: 'guest',
            };

            const result = isRegisteredCustomerLookup(lookupResult);
            expect(result).toBe(false);
        });

        it('should return true when isRegistered is true', () => {
            const lookupResult: CustomerLookupResult = {
                isRegistered: true,
                recommendation: 'current_user',
            };

            const result = isRegisteredCustomerLookup(lookupResult);
            expect(result).toBe(true);
        });
    });

    describe('isCurrentUserLookup', () => {
        it('should return false when lookupResult is null', () => {
            const result = isCurrentUserLookup(null);
            expect(result).toBe(false);
        });

        it('should return false when recommendation is not current_user', () => {
            const lookupResult: CustomerLookupResult = {
                isRegistered: false,
                recommendation: 'guest',
            };

            const result = isCurrentUserLookup(lookupResult);
            expect(result).toBe(false);
        });

        it('should return true when recommendation is current_user', () => {
            const lookupResult: CustomerLookupResult = {
                isRegistered: true,
                recommendation: 'current_user',
            };

            const result = isCurrentUserLookup(lookupResult);
            expect(result).toBe(true);
        });
    });
});
