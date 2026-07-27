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
import type translations from '@/locales/en-GB/translations.json';

// Derive country codes from translations.json
export type CountryCode = keyof typeof translations.countries;

// Derive state codes from translations.json
type USStateCode = keyof typeof translations.countries.US.states;
type CAStateCode = keyof typeof translations.countries.CA.states;

// Type for state/province code based on country
export type StateCode<T extends CountryCode> = T extends 'US' ? USStateCode : T extends 'CA' ? CAStateCode : never;

// List of supported country codes (names are retrieved from i18next at runtime)
export const COUNTRY_CODES: readonly CountryCode[] = ['US', 'CA'] as const;

/** Default country code for address forms */
export const DEFAULT_COUNTRY_CODE: CountryCode = 'US';

// US Postal Code validation (5 digits or 5+4 format)
export const usPostalCodeRegex = /^\d{5}(-\d{4})?$/;

// Canadian Postal Code validation (A1A 1A1 format)
export const canadianPostalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
