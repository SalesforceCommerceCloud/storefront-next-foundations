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

import { describe, it, expect, vi } from 'vitest';
import {
    convertGoogleMapsSuggestions,
    parseAddressComponents,
    processAddressSuggestion,
    type GoogleMapsSuggestion,
    type ParsedAddressFields,
} from './address-suggestions';
import type { AddressSuggestion } from '@/components/address-suggestion-dropdown';

describe('convertGoogleMapsSuggestions', () => {
    it('should convert a single suggestion correctly', () => {
        const googleSuggestions: GoogleMapsSuggestion[] = [
            {
                placePrediction: {
                    placeId: 'ChIJ123abc',
                    text: {
                        text: '123 Main Street, New York, NY 10001, USA',
                    },
                    toPlace: vi.fn(),
                },
            },
        ];

        const result = convertGoogleMapsSuggestions(googleSuggestions);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            description: '123 Main Street, New York, NY 10001, USA',
            place_id: 'ChIJ123abc',
            structured_formatting: {
                main_text: '123 Main Street',
                secondary_text: 'New York, NY 10001, USA',
            },
            terms: [{ value: '123 Main Street' }, { value: 'New York' }, { value: 'NY 10001' }, { value: 'USA' }],
            placePrediction: googleSuggestions[0].placePrediction,
        });
    });

    it('should convert multiple suggestions correctly', () => {
        const googleSuggestions: GoogleMapsSuggestion[] = [
            {
                placePrediction: {
                    placeId: 'place_1',
                    text: { text: '100 First Ave, Seattle, WA 98101, USA' },
                    toPlace: vi.fn(),
                },
            },
            {
                placePrediction: {
                    placeId: 'place_2',
                    text: { text: '200 Second St, Portland, OR 97201, USA' },
                    toPlace: vi.fn(),
                },
            },
        ];

        const result = convertGoogleMapsSuggestions(googleSuggestions);

        expect(result).toHaveLength(2);
        expect(result[0].place_id).toBe('place_1');
        expect(result[1].place_id).toBe('place_2');
    });

    it('should handle address with no comma separators', () => {
        const googleSuggestions: GoogleMapsSuggestion[] = [
            {
                placePrediction: {
                    placeId: 'no_commas',
                    text: { text: '123 Main Street' },
                    toPlace: vi.fn(),
                },
            },
        ];

        const result = convertGoogleMapsSuggestions(googleSuggestions);

        expect(result[0]).toEqual({
            description: '123 Main Street',
            place_id: 'no_commas',
            structured_formatting: {
                main_text: '123 Main Street',
                secondary_text: '',
            },
            terms: [{ value: '123 Main Street' }],
            placePrediction: googleSuggestions[0].placePrediction,
        });
    });

    it('should handle empty suggestions array', () => {
        const result = convertGoogleMapsSuggestions([]);
        expect(result).toEqual([]);
    });

    it('should preserve placePrediction reference for later use', () => {
        const mockToPlace = vi.fn();
        const googleSuggestions: GoogleMapsSuggestion[] = [
            {
                placePrediction: {
                    placeId: 'test_id',
                    text: { text: 'Test Address, City, State' },
                    toPlace: mockToPlace,
                },
            },
        ];

        const result = convertGoogleMapsSuggestions(googleSuggestions);

        expect(result[0].placePrediction).toBe(googleSuggestions[0].placePrediction);
        expect((result[0].placePrediction as { toPlace: () => void }).toPlace).toBe(mockToPlace);
    });
});

describe('parseAddressComponents', () => {
    it('should parse a complete US address correctly', () => {
        const addressComponents = [
            { longText: '123', shortText: '123', types: ['street_number'] },
            { longText: 'Main Street', shortText: 'Main St', types: ['route'] },
            { longText: 'New York', shortText: 'New York', types: ['locality'] },
            { longText: 'New York', shortText: 'NY', types: ['administrative_area_level_1'] },
            { longText: '10001', shortText: '10001', types: ['postal_code'] },
            { longText: 'United States', shortText: 'US', types: ['country'] },
        ];

        const result = parseAddressComponents(addressComponents);

        expect(result).toEqual({
            address1: '123 Main Street',
            city: 'New York',
            stateCode: 'NY',
            postalCode: '10001',
            countryCode: 'US',
        });
    });

    it('should handle address with only street_number', () => {
        const addressComponents = [{ longText: '456', shortText: '456', types: ['street_number'] }];

        const result = parseAddressComponents(addressComponents);

        expect(result.address1).toBe('456');
    });

    it('should handle address with only route', () => {
        const addressComponents = [{ longText: 'Oak Avenue', shortText: 'Oak Ave', types: ['route'] }];

        const result = parseAddressComponents(addressComponents);

        expect(result.address1).toBe('Oak Avenue');
    });

    it('should return empty address1 when no street components exist', () => {
        const addressComponents = [{ longText: 'San Francisco', shortText: 'San Francisco', types: ['locality'] }];

        const result = parseAddressComponents(addressComponents);

        expect(result.address1).toBe('');
    });

    it('should use postal_town as city fallback', () => {
        const addressComponents = [
            { longText: 'London', shortText: 'London', types: ['postal_town'] },
            { longText: 'England', shortText: 'England', types: ['administrative_area_level_1'] },
        ];

        const result = parseAddressComponents(addressComponents);

        expect(result.city).toBe('London');
    });

    it('should use administrative_area_level_3 as city fallback', () => {
        const addressComponents = [
            { longText: 'Small Town', shortText: 'Small Town', types: ['administrative_area_level_3'] },
        ];

        const result = parseAddressComponents(addressComponents);

        expect(result.city).toBe('Small Town');
    });

    it('should use sublocality as city fallback', () => {
        const addressComponents = [
            { longText: 'Brooklyn', shortText: 'Brooklyn', types: ['sublocality', 'sublocality_level_1'] },
        ];

        const result = parseAddressComponents(addressComponents);

        expect(result.city).toBe('Brooklyn');
    });

    it('should use neighborhood as city fallback', () => {
        const addressComponents = [{ longText: 'Downtown', shortText: 'Downtown', types: ['neighborhood'] }];

        const result = parseAddressComponents(addressComponents);

        expect(result.city).toBe('Downtown');
    });

    it('should prioritize locality over postal_town', () => {
        const addressComponents = [
            { longText: 'Primary City', shortText: 'Primary City', types: ['locality'] },
            { longText: 'Postal Town', shortText: 'Postal Town', types: ['postal_town'] },
        ];

        const result = parseAddressComponents(addressComponents);

        expect(result.city).toBe('Primary City');
    });

    it('should handle null addressComponents', () => {
        const result = parseAddressComponents(null);

        expect(result).toEqual({
            address1: '',
            city: '',
        });
    });

    it('should handle undefined addressComponents', () => {
        const result = parseAddressComponents(undefined);

        expect(result).toEqual({
            address1: '',
            city: '',
        });
    });

    it('should handle empty addressComponents array', () => {
        const result = parseAddressComponents([]);

        expect(result).toEqual({
            address1: '',
            city: '',
            stateCode: '',
            postalCode: '',
            countryCode: '',
        });
    });

    it('should use shortText for stateCode and countryCode', () => {
        const addressComponents = [
            { longText: 'California', shortText: 'CA', types: ['administrative_area_level_1'] },
            { longText: 'United States', shortText: 'US', types: ['country'] },
        ];

        const result = parseAddressComponents(addressComponents);

        expect(result.stateCode).toBe('CA');
        expect(result.countryCode).toBe('US');
    });

    it('should handle components with multiple types', () => {
        const addressComponents = [
            { longText: '100', shortText: '100', types: ['street_number'] },
            { longText: 'Broadway', shortText: 'Broadway', types: ['route', 'establishment'] },
            { longText: 'Manhattan', shortText: 'Manhattan', types: ['sublocality', 'political'] },
        ];

        const result = parseAddressComponents(addressComponents);

        expect(result.address1).toBe('100 Broadway');
        expect(result.city).toBe('Manhattan');
    });

    it('should handle international address with administrative_area_level_4', () => {
        const addressComponents = [
            { longText: '1', shortText: '1', types: ['street_number'] },
            { longText: 'Rue de Paris', shortText: 'Rue de Paris', types: ['route'] },
            { longText: 'Commune', shortText: 'Commune', types: ['administrative_area_level_4'] },
            { longText: 'France', shortText: 'FR', types: ['country'] },
        ];

        const result = parseAddressComponents(addressComponents);

        expect(result.address1).toBe('1 Rue de Paris');
        expect(result.city).toBe('Commune');
        expect(result.countryCode).toBe('FR');
    });
});

describe('processAddressSuggestion', () => {
    it('should extract address fields from a suggestion', async () => {
        const mockFetchFields = vi.fn().mockResolvedValue(undefined);
        const mockPlace = {
            addressComponents: [
                { longText: '456', shortText: '456', types: ['street_number'] },
                { longText: 'Oak Avenue', shortText: 'Oak Ave', types: ['route'] },
                { longText: 'Los Angeles', shortText: 'Los Angeles', types: ['locality'] },
                { longText: 'California', shortText: 'CA', types: ['administrative_area_level_1'] },
                { longText: '90001', shortText: '90001', types: ['postal_code'] },
                { longText: 'United States', shortText: 'US', types: ['country'] },
            ],
            fetchFields: mockFetchFields,
        };

        const mockToPlace = vi.fn().mockReturnValue(mockPlace);

        const suggestion: AddressSuggestion = {
            description: '456 Oak Avenue, Los Angeles, CA 90001, USA',
            place_id: 'test_place_id',
            placePrediction: {
                placeId: 'test_place_id',
                text: { text: '456 Oak Avenue, Los Angeles, CA 90001, USA' },
                toPlace: mockToPlace,
            },
        };

        const result = await processAddressSuggestion(suggestion);

        expect(mockToPlace).toHaveBeenCalled();
        expect(mockFetchFields).toHaveBeenCalledWith({ fields: ['addressComponents'] });
        expect(result).toEqual({
            address1: '456 Oak Avenue',
            city: 'Los Angeles',
            stateCode: 'CA',
            postalCode: '90001',
            countryCode: 'US',
        });
    });

    it('should handle suggestion with empty addressComponents after fetch', async () => {
        const mockPlace = {
            addressComponents: [],
            fetchFields: vi.fn().mockResolvedValue(undefined),
        };

        const suggestion: AddressSuggestion = {
            description: 'Test Address',
            place_id: 'empty_test',
            placePrediction: {
                placeId: 'empty_test',
                text: { text: 'Test Address' },
                toPlace: vi.fn().mockReturnValue(mockPlace),
            },
        };

        const result = await processAddressSuggestion(suggestion);

        expect(result).toEqual({
            address1: '',
            city: '',
            stateCode: '',
            postalCode: '',
            countryCode: '',
        });
    });

    it('should call fetchFields with addressComponents field', async () => {
        const mockFetchFields = vi.fn().mockResolvedValue(undefined);
        const mockPlace = {
            addressComponents: [{ longText: '123', shortText: '123', types: ['street_number'] }],
            fetchFields: mockFetchFields,
        };

        const suggestion: AddressSuggestion = {
            description: 'Test',
            place_id: 'fetch_test',
            placePrediction: {
                placeId: 'fetch_test',
                text: { text: 'Test' },
                toPlace: vi.fn().mockReturnValue(mockPlace),
            },
        };

        await processAddressSuggestion(suggestion);

        expect(mockFetchFields).toHaveBeenCalledWith({ fields: ['addressComponents'] });
    });

    it('should propagate errors from fetchFields', async () => {
        const mockError = new Error('API Error');
        const mockPlace = {
            addressComponents: [],
            fetchFields: vi.fn().mockRejectedValue(mockError),
        };

        const suggestion: AddressSuggestion = {
            description: 'Error Test',
            place_id: 'error_test',
            placePrediction: {
                placeId: 'error_test',
                text: { text: 'Error Test' },
                toPlace: vi.fn().mockReturnValue(mockPlace),
            },
        };

        await expect(processAddressSuggestion(suggestion)).rejects.toThrow('API Error');
    });

    it('should handle UK address format', async () => {
        const mockPlace = {
            addressComponents: [
                { longText: '10', shortText: '10', types: ['street_number'] },
                { longText: 'Downing Street', shortText: 'Downing St', types: ['route'] },
                { longText: 'London', shortText: 'London', types: ['postal_town'] },
                { longText: 'England', shortText: 'England', types: ['administrative_area_level_1'] },
                { longText: 'SW1A 2AA', shortText: 'SW1A 2AA', types: ['postal_code'] },
                { longText: 'United Kingdom', shortText: 'GB', types: ['country'] },
            ],
            fetchFields: vi.fn().mockResolvedValue(undefined),
        };

        const suggestion: AddressSuggestion = {
            description: '10 Downing Street, London, SW1A 2AA, UK',
            place_id: 'uk_address',
            placePrediction: {
                placeId: 'uk_address',
                text: { text: '10 Downing Street, London, SW1A 2AA, UK' },
                toPlace: vi.fn().mockReturnValue(mockPlace),
            },
        };

        const result = await processAddressSuggestion(suggestion);

        expect(result).toEqual({
            address1: '10 Downing Street',
            city: 'London',
            stateCode: 'England',
            postalCode: 'SW1A 2AA',
            countryCode: 'GB',
        });
    });
});

describe('ParsedAddressFields type', () => {
    it('should have correct required and optional fields', () => {
        // This test verifies the type structure at compile time
        const minimalAddress: ParsedAddressFields = {
            address1: '123 Main St',
        };

        const fullAddress: ParsedAddressFields = {
            address1: '123 Main St',
            city: 'City',
            stateCode: 'ST',
            postalCode: '12345',
            countryCode: 'US',
        };

        expect(minimalAddress.address1).toBe('123 Main St');
        expect(fullAddress.countryCode).toBe('US');
    });
});
