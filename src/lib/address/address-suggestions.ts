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

import type { AddressSuggestion } from '@/components/address-suggestion-dropdown';

/**
 * Parsed address fields structure
 */
export interface ParsedAddressFields {
    address1: string;
    city?: string;
    stateCode?: string;
    postalCode?: string;
    countryCode?: string;
}

/**
 * Google Maps address component structure (Places API New)
 */
interface AddressComponent {
    longText: string;
    shortText: string;
    types: string[];
}

/**
 * Google Maps Place object returned by placePrediction.toPlace()
 */
interface GooglePlace {
    addressComponents?: AddressComponent[];
    fetchFields: (options: { fields: string[] }) => Promise<void>;
}

/**
 * Google Maps Place Prediction type from @vis.gl/react-google-maps
 */
interface PlacePrediction {
    placeId: string;
    text: {
        text: string;
    };
    toPlace: () => GooglePlace;
}

/**
 * Google Maps API suggestion response structure
 */
export interface GoogleMapsSuggestion {
    placePrediction: PlacePrediction;
}

/**
 * Convert Google Maps API suggestions to the AddressSuggestion format
 * Used by the AddressSuggestionDropdown component
 *
 * @param suggestions - Array of suggestions from Google Maps API
 * @returns Converted suggestions in AddressSuggestion format
 */
export function convertGoogleMapsSuggestions(suggestions: GoogleMapsSuggestion[]): AddressSuggestion[] {
    return suggestions.map((suggestion) => {
        const fullText = suggestion.placePrediction.text.text;
        const textParts = fullText.split(',');

        return {
            description: fullText,
            place_id: suggestion.placePrediction.placeId,
            structured_formatting: {
                main_text: textParts[0] || fullText,
                secondary_text: textParts.slice(1).join(',').trim(),
            },
            terms: textParts.map((term) => ({ value: term.trim() })),
            placePrediction: suggestion.placePrediction,
        };
    });
}

/**
 * Parses Google Places API address components into a structured address object.
 * @see https://developers.google.com/maps/documentation/javascript/examples/places-autocomplete-addressform
 *
 * @param addressComponents - Address components from Google Places API
 * @returns Parsed address object
 */
export function parseAddressComponents(addressComponents: AddressComponent[] | null | undefined): ParsedAddressFields {
    if (!addressComponents) {
        return {
            address1: '',
            city: '',
        };
    }

    // Helper to get longText value for a component type
    const getComponent = (type: string): string => {
        const component = addressComponents.find((c) => c.types.includes(type));
        return component?.longText || '';
    };

    // Helper to get shortText value for a component type (used for state codes)
    const getComponentShort = (type: string): string => {
        const component = addressComponents.find((c) => c.types.includes(type));
        return component?.shortText || '';
    };

    // Helper to get first available component from a priority list of types (used for city)
    const getFirstAvailable = (types: string[]): string => {
        for (const type of types) {
            const value = getComponent(type);
            if (value) return value;
        }
        return '';
    };

    const streetNumber = getComponent('street_number');
    const route = getComponent('route');
    const address1 = [streetNumber, route].filter(Boolean).join(' ');

    const city = getFirstAvailable([
        'locality',
        'postal_town',
        'administrative_area_level_3',
        'administrative_area_level_4',
        'administrative_area_level_5',
        'administrative_area_level_6',
        'administrative_area_level_7',
        'sublocality',
        'sublocality_level_1',
        'sublocality_level_2',
        'sublocality_level_3',
        'sublocality_level_4',
        'sublocality_level_5',
        'neighborhood',
    ]);

    return {
        address1,
        city,
        stateCode: getComponentShort('administrative_area_level_1'),
        postalCode: getComponent('postal_code'),
        countryCode: getComponentShort('country'),
    };
}

/**
 * Extract address fields from a Google Place object with address_components.
 *
 * @param place - Google Place object from placePrediction.toPlace()
 * @returns Promise resolving to parsed address fields
 */
async function extractAddressFieldsFromPlace(place: GooglePlace): Promise<ParsedAddressFields> {
    // Fetch the address fields from the place
    await place.fetchFields({
        fields: ['addressComponents'],
    });

    return parseAddressComponents(place.addressComponents);
}

/**
 * Process address suggestion and extract structured address fields.
 *
 * @param suggestion - Address suggestion object from the API
 * @returns Promise resolving to structured address fields
 */
export async function processAddressSuggestion(suggestion: AddressSuggestion): Promise<ParsedAddressFields> {
    const place = (suggestion.placePrediction as PlacePrediction).toPlace();
    return await extractAddressFieldsFromPlace(place);
}
