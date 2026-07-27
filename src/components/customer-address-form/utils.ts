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
import type { ParseKeys } from 'i18next';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

import { type CountryCode, type StateCode } from './constants';

// Re-export types for convenience
export type { CountryCode, StateCode } from './constants';

// Get states/provinces for a specific country
export function getStatesForCountry(countryCode: CountryCode): Array<{ code: string; name: string }> {
    const { t } = getTranslation();
    // Dynamically constructed key — cast to the typed key shape for the 'countries' namespace.
    const key = `${countryCode}.states` as ParseKeys<'countries'>;
    const states = t(key, { returnObjects: true, ns: 'countries' }) as Record<string, string> | string;

    // If states is a string (like the key itself) or not an object, return empty array
    if (typeof states === 'string' || !states || typeof states !== 'object') return [];

    return Object.entries(states).map(([code, name]) => ({
        code,
        name,
    }));
}

// Get country name
export function getCountryName(countryCode: CountryCode): string {
    const { t } = getTranslation();
    const key = `${countryCode}.name` as ParseKeys<'countries'>;
    const name = t(key, { ns: 'countries', defaultValue: countryCode });
    // If the translation key wasn't found, i18next might return the key itself
    // Return the countryCode in that case
    return typeof name === 'string' && name !== key ? name : countryCode;
}

// Get state/province name
export function getStateName<T extends CountryCode>(countryCode: T, stateCode: StateCode<T> | string): string {
    const { t } = getTranslation();
    const key = `${countryCode}.states.${String(stateCode)}` as ParseKeys<'countries'>;
    const name = t(key, { ns: 'countries', defaultValue: String(stateCode) });
    return typeof name === 'string' ? name : String(stateCode);
}
