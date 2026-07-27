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
import { describe, expect, it } from 'vitest';
import { getStatesForCountry, getCountryName, getStateName, type CountryCode } from './utils';

// Note: i18next is already initialized globally in vitest.setup.ts with all translations

describe('utils', () => {
    describe('getStatesForCountry', () => {
        it('should return states for a valid country code (US)', () => {
            const result = getStatesForCountry('US' as CountryCode);

            // Should return all US states from translations.json
            expect(result.length).toBeGreaterThan(0);
            expect(result).toContainEqual({ code: 'AL', name: 'Alabama' });
            expect(result).toContainEqual({ code: 'CA', name: 'California' });
            expect(result).toContainEqual({ code: 'NY', name: 'New York' });
            expect(result).toContainEqual({ code: 'TX', name: 'Texas' });
        });

        it('should return states for a valid country code (CA)', () => {
            const result = getStatesForCountry('CA' as CountryCode);

            // Should return all Canadian provinces from translations.json
            expect(result.length).toBeGreaterThan(0);
            expect(result).toContainEqual({ code: 'AB', name: 'Alberta' });
            expect(result).toContainEqual({ code: 'BC', name: 'British Columbia' });
            expect(result).toContainEqual({ code: 'ON', name: 'Ontario' });
            expect(result).toContainEqual({ code: 'QC', name: 'Quebec' });
        });

        it('should return empty array for invalid country code', () => {
            const result = getStatesForCountry('XX' as CountryCode);

            expect(result).toEqual([]);
        });

        it('should return states in correct format with code and name', () => {
            const result = getStatesForCountry('US' as CountryCode);

            expect(result.length).toBeGreaterThan(0);
            result.forEach((state) => {
                expect(state).toHaveProperty('code');
                expect(state).toHaveProperty('name');
                expect(typeof state.code).toBe('string');
                expect(typeof state.name).toBe('string');
            });
        });
    });

    describe('getCountryName', () => {
        it('should return country name for valid country code (US)', () => {
            const result = getCountryName('US' as CountryCode);

            expect(result).toBe('United States');
        });

        it('should return country name for valid country code (CA)', () => {
            const result = getCountryName('CA' as CountryCode);

            expect(result).toBe('Canada');
        });

        it('should return country code for invalid country code', () => {
            const result = getCountryName('XX' as CountryCode);

            expect(result).toBe('XX');
        });
    });

    describe('getStateName', () => {
        it('should return state name for valid country and state code (US)', () => {
            const result = getStateName('US' as CountryCode, 'CA');

            expect(result).toBe('California');
        });

        it('should return state name for valid country and state code (CA)', () => {
            const result = getStateName('CA' as CountryCode, 'ON');

            expect(result).toBe('Ontario');
        });

        it('should return state name for different state codes', () => {
            expect(getStateName('US' as CountryCode, 'NY')).toBe('New York');
            expect(getStateName('US' as CountryCode, 'TX')).toBe('Texas');
            expect(getStateName('CA' as CountryCode, 'AB')).toBe('Alberta');
            expect(getStateName('CA' as CountryCode, 'QC')).toBe('Quebec');
        });

        it('should return state code as string for invalid state code with valid country', () => {
            const result = getStateName('US' as CountryCode, 'XX');

            expect(result).toBe('XX');
        });

        it('should return state code as string for invalid country', () => {
            const result = getStateName('XX' as CountryCode, 'CA');

            expect(result).toBe('CA');
        });

        it('should handle string state codes', () => {
            const result = getStateName('US' as CountryCode, 'CA' as string);

            expect(result).toBe('California');
        });

        it('should return state code when both country and state are invalid', () => {
            const result = getStateName('XX' as CountryCode, 'YY');

            expect(result).toBe('YY');
        });
    });
});
