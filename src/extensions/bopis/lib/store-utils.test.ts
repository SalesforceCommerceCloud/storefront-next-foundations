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

import { describe, test, expect } from 'vitest';
import { getStoreName, getPickupStoreFromMap, orderAddressFromStoreAddress, isPickupAddressSet } from './store-utils';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';
import type { ShopperBasketsV2, ShopperStores } from '@/scapi';

describe('store-utils', () => {
    describe('getStoreName', () => {
        test('should return store name when available', () => {
            const store: SelectedStoreInfo = {
                id: 'store-123',
                name: 'Downtown Store',
            };

            expect(getStoreName(store)).toBe('Downtown Store');
        });

        test('should fallback to store ID when name is not available', () => {
            const store: SelectedStoreInfo = {
                id: 'store-456',
            };

            expect(getStoreName(store)).toBe('store-456');
        });

        test('should fallback to store ID when name is empty string', () => {
            const store: SelectedStoreInfo = {
                id: 'store-789',
                name: '',
            };

            expect(getStoreName(store)).toBe('store-789');
        });
    });

    describe('getPickupStoreFromMap', () => {
        test('should return store from map when found', () => {
            const store: SelectedStoreInfo = {
                id: 'store-123',
                name: 'Downtown Store',
            };
            const pickupStores = new Map<string, SelectedStoreInfo>();
            pickupStores.set('store-123', store);

            const result = getPickupStoreFromMap('store-123', pickupStores);

            expect(result).toEqual(store);
        });

        test('should return minimal store object with ID when not found in map', () => {
            const pickupStores = new Map<string, SelectedStoreInfo>();

            const result = getPickupStoreFromMap('store-456', pickupStores);

            expect(result).toEqual({ id: 'store-456' });
        });

        test('should return undefined when pickupStoreId is undefined', () => {
            const pickupStores = new Map<string, SelectedStoreInfo>();

            const result = getPickupStoreFromMap(undefined, pickupStores);

            expect(result).toBeUndefined();
        });

        test('should return undefined when pickupStoreId is undefined and pickupStores is undefined', () => {
            const result = getPickupStoreFromMap(undefined, undefined);

            expect(result).toBeUndefined();
        });

        test('should return minimal store object when pickupStores is undefined but ID is provided', () => {
            const result = getPickupStoreFromMap('store-789', undefined);

            expect(result).toEqual({ id: 'store-789' });
        });

        test('should return undefined when pickupStoreId is empty string', () => {
            const pickupStores = new Map<string, SelectedStoreInfo>();

            const result = getPickupStoreFromMap('', pickupStores);

            expect(result).toBeUndefined();
        });
    });

    describe('orderAddressFromStoreAddress', () => {
        test('should convert complete store address to order address', () => {
            const store: ShopperStores.schemas['Store'] = {
                id: 'store-123',
                name: 'Downtown Store',
                address1: '123 Main St',
                address2: 'Suite 100',
                city: 'San Francisco',
                stateCode: 'CA',
                postalCode: '94102',
                countryCode: 'US',
            };

            const result = orderAddressFromStoreAddress(store);

            expect(result).toEqual({
                firstName: 'Downtown Store',
                lastName: 'Pickup',
                address1: '123 Main St',
                address2: 'Suite 100',
                city: 'San Francisco',
                stateCode: 'CA',
                postalCode: '94102',
                countryCode: 'US',
            });
        });

        test('should use empty string for firstName when store name is undefined', () => {
            const store: ShopperStores.schemas['Store'] = {
                id: 'store-456',
                address1: '456 Oak Ave',
                city: 'Portland',
                stateCode: 'OR',
                postalCode: '97201',
                countryCode: 'US',
            };

            const result = orderAddressFromStoreAddress(store);

            expect(result.firstName).toBe('');
            expect(result.lastName).toBe('Pickup');
        });

        test('should use empty string for firstName when store name is null', () => {
            const store: ShopperStores.schemas['Store'] = {
                id: 'store-789',
                name: null as any,
                address1: '789 Elm St',
                city: 'Seattle',
                stateCode: 'WA',
                postalCode: '98101',
                countryCode: 'US',
            };

            const result = orderAddressFromStoreAddress(store);

            expect(result.firstName).toBe('');
        });

        test('should handle store with minimal address fields', () => {
            const store: ShopperStores.schemas['Store'] = {
                id: 'store-minimal',
                address1: '999 Test Ln',
            };

            const result = orderAddressFromStoreAddress(store);

            expect(result).toEqual({
                firstName: '',
                lastName: 'Pickup',
                address1: '999 Test Ln',
                address2: '',
                city: '',
                stateCode: '',
                postalCode: '',
                countryCode: '',
            });
        });

        test('should handle store with null address fields', () => {
            const store: ShopperStores.schemas['Store'] = {
                id: 'store-null',
                name: 'Test Store',
                address1: null as any,
                address2: null as any,
                city: null as any,
                stateCode: null as any,
                postalCode: null as any,
                countryCode: null as any,
            };

            const result = orderAddressFromStoreAddress(store);

            expect(result).toEqual({
                firstName: 'Test Store',
                lastName: 'Pickup',
                address1: '',
                address2: '',
                city: '',
                stateCode: '',
                postalCode: '',
                countryCode: '',
            });
        });

        test('should handle store with undefined address fields', () => {
            const store: ShopperStores.schemas['Store'] = {
                id: 'store-undefined',
                name: 'Another Store',
                address1: undefined as any,
                address2: undefined as any,
                city: undefined as any,
                stateCode: undefined as any,
                postalCode: undefined as any,
                countryCode: undefined as any,
            };

            const result = orderAddressFromStoreAddress(store);

            expect(result).toEqual({
                firstName: 'Another Store',
                lastName: 'Pickup',
                address1: '',
                address2: '',
                city: '',
                stateCode: '',
                postalCode: '',
                countryCode: '',
            });
        });

        test('should preserve address2 when provided', () => {
            const store: ShopperStores.schemas['Store'] = {
                id: 'store-with-address2',
                name: 'Building Store',
                address1: '100 Business Blvd',
                address2: 'Floor 5, Suite 500',
                city: 'Austin',
                stateCode: 'TX',
                postalCode: '78701',
                countryCode: 'US',
            };

            const result = orderAddressFromStoreAddress(store);

            expect(result.address2).toBe('Floor 5, Suite 500');
        });

        test('should handle empty string address fields', () => {
            const store: ShopperStores.schemas['Store'] = {
                id: 'store-empty',
                name: '',
                address1: '',
                address2: '',
                city: '',
                stateCode: '',
                postalCode: '',
                countryCode: '',
            };

            const result = orderAddressFromStoreAddress(store);

            expect(result).toEqual({
                firstName: '',
                lastName: 'Pickup',
                address1: '',
                address2: '',
                city: '',
                stateCode: '',
                postalCode: '',
                countryCode: '',
            });
        });
    });

    describe('isPickupAddressSet', () => {
        const mockStoreAddress: ShopperStores.schemas['Store'] = {
            id: 'store-123',
            address1: '123 Main St',
            city: 'San Francisco',
            stateCode: 'CA',
            postalCode: '94102',
            countryCode: 'US',
        };

        const mockShippingAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
            firstName: '', // Must match empty string from orderAddressFromStoreAddress when store.name is undefined
            lastName: 'Pickup', // Must match the translation value from orderAddressFromStoreAddress
            address1: '123 Main St',
            city: 'San Francisco',
            stateCode: 'CA',
            postalCode: '94102',
            countryCode: 'US',
        };

        test('should return true when addresses match exactly', () => {
            const result = isPickupAddressSet(mockShippingAddress, mockStoreAddress);

            expect(result).toBe(true);
        });

        test('should return false when shippingAddress is undefined', () => {
            const result = isPickupAddressSet(undefined, mockStoreAddress);

            expect(result).toBe(false);
        });

        test('should return false when shippingAddress is null', () => {
            const result = isPickupAddressSet(null, mockStoreAddress);

            expect(result).toBe(false);
        });

        test('should return false when storeAddress is undefined', () => {
            const result = isPickupAddressSet(mockShippingAddress, undefined);

            expect(result).toBe(false);
        });

        test('should return false when storeAddress is null', () => {
            const result = isPickupAddressSet(mockShippingAddress, null);

            expect(result).toBe(false);
        });

        test('should return false when both addresses are undefined', () => {
            const result = isPickupAddressSet(undefined, undefined);

            expect(result).toBe(false);
        });

        test('should return false when address1 does not match', () => {
            const differentAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                ...mockShippingAddress,
                address1: '456 Oak Ave',
            };

            const result = isPickupAddressSet(differentAddress, mockStoreAddress);

            expect(result).toBe(false);
        });

        test('should return false when city does not match', () => {
            const differentAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                ...mockShippingAddress,
                city: 'Los Angeles',
            };

            const result = isPickupAddressSet(differentAddress, mockStoreAddress);

            expect(result).toBe(false);
        });

        test('should return false when stateCode does not match', () => {
            const differentAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                ...mockShippingAddress,
                stateCode: 'NY',
            };

            const result = isPickupAddressSet(differentAddress, mockStoreAddress);

            expect(result).toBe(false);
        });

        test('should return false when postalCode does not match', () => {
            const differentAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                ...mockShippingAddress,
                postalCode: '90001',
            };

            const result = isPickupAddressSet(differentAddress, mockStoreAddress);

            expect(result).toBe(false);
        });

        test('should return false when countryCode does not match', () => {
            const differentAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                ...mockShippingAddress,
                countryCode: 'CA',
            };

            const result = isPickupAddressSet(differentAddress, mockStoreAddress);

            expect(result).toBe(false);
        });

        test('should normalize undefined values to empty strings and compare correctly', () => {
            const addressWithUndefined: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: undefined as any,
                lastName: 'Pickup', // Must match the translation value from orderAddressFromStoreAddress
                address1: undefined as any,
                city: undefined as any,
                stateCode: undefined as any,
                postalCode: undefined as any,
                countryCode: undefined as any,
            };

            const storeWithUndefined: ShopperStores.schemas['Store'] = {
                id: 'store-123',
                name: undefined as any, // becomes firstName
                address1: undefined as any,
                city: undefined as any,
                stateCode: undefined as any,
                postalCode: undefined as any,
                countryCode: undefined as any,
            };

            const result = isPickupAddressSet(addressWithUndefined, storeWithUndefined);

            expect(result).toBe(true);
        });

        test('should normalize null values to empty strings and compare correctly', () => {
            const addressWithNull: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: null as any,
                lastName: 'Pickup', // Must match the translation value from orderAddressFromStoreAddress
                address1: null as any,
                city: null as any,
                stateCode: null as any,
                postalCode: null as any,
                countryCode: null as any,
            };

            const storeWithNull: ShopperStores.schemas['Store'] = {
                id: 'store-123',
                name: null as any, // becomes firstName
                address1: null as any,
                city: null as any,
                stateCode: null as any,
                postalCode: null as any,
                countryCode: null as any,
            };

            const result = isPickupAddressSet(addressWithNull, storeWithNull);

            expect(result).toBe(true);
        });

        test('should handle mixed undefined and actual values', () => {
            const addressWithMixedValues: ShopperBasketsV2.schemas['OrderAddress'] = {
                address1: '123 Main St',
                city: undefined as any,
                stateCode: 'CA',
                postalCode: undefined as any,
                countryCode: 'US',
            };

            const storeWithDifferentMixedValues: ShopperStores.schemas['Store'] = {
                id: 'store-123',
                address1: '123 Main St',
                city: 'San Francisco',
                stateCode: 'CA',
                postalCode: '94102',
                countryCode: 'US',
            };

            const result = isPickupAddressSet(addressWithMixedValues, storeWithDifferentMixedValues);

            expect(result).toBe(false);
        });
    });
});
