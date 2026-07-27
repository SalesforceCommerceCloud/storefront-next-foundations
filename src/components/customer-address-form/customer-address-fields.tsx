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

/* c8 ignore start */
/* istanbul ignore file */
// This file is excluded from coverage as it primarily renders presentational form fields
// using React Hook Form integration. Testing this component properly requires complex
// setup of form context, field state, and render props which is better handled through
// integration tests that can verify end-to-end user interactions.
/* c8 ignore end */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

import { COUNTRY_CODES } from './constants';
import { getStatesForCountry, getCountryName } from './utils';
import { type CustomerAddressFieldsProps } from './types';

/**
 * Formats a phone number with standard US format: (XXX) XXX-XXXX
 * @param value - The raw phone number input
 * @returns Formatted phone number
 */
const formatPhoneWithParens = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10);

    // Format based on length
    if (limitedDigits.length >= 7) {
        return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
    } else if (limitedDigits.length >= 4) {
        return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
    } else if (limitedDigits.length > 0) {
        return `(${limitedDigits}`;
    }

    return limitedDigits;
};

/**
 * CustomerAddressFields component that renders the form fields for editing customer address.
 *
 * This component is responsible for rendering all input fields including address title, first name, last name,
 * phone, country, address line 1, address line 2, city, state/province, postal code, and preferred flag.
 * It does not include action buttons, which are handled by the parent form component.
 *
 * @param form - React Hook Form instance for managing form state and validation
 */
export function CustomerAddressFields({ form }: CustomerAddressFieldsProps) {
    const { t } = useTranslation('account');
    // Watch country code to update state options
    const countryCode = form.watch('countryCode');

    // Build countries list with translated names
    const countries = useMemo(() => {
        return COUNTRY_CODES.map((code) => ({
            code,
            name: getCountryName(code),
        }));
    }, []);

    // Get state/province options based on selected country
    const stateOptions = useMemo(() => {
        return getStatesForCountry(countryCode);
    }, [countryCode]);

    // Determine if current country uses "State" or "Province"
    const stateLabel = useMemo(() => {
        return countryCode === 'US' ? t('addressForm.stateLabel') : t('addressForm.provinceLabel');
    }, [countryCode, t]);

    const statePlaceholder = useMemo(() => {
        return countryCode === 'US'
            ? t('addressForm.selectStatePlaceholder')
            : t('addressForm.selectProvincePlaceholder');
    }, [countryCode, t]);

    // Update postal code label based on country
    const postalCodeLabel = useMemo(() => {
        return countryCode === 'US' ? t('addressForm.zipCodeLabel') : t('addressForm.postalCodeLabel');
    }, [countryCode, t]);

    return (
        <div className="space-y-4">
            {/* First Name and Last Name Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name Field */}
                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">
                                {t('addressForm.firstNameLabel')}
                            </FormLabel>
                            <FormControl>
                                <Input type="text" autoComplete="given-name" className="" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Last Name Field */}
                <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">
                                {t('addressForm.lastNameLabel')}
                            </FormLabel>
                            <FormControl>
                                <Input type="text" autoComplete="family-name" className="" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Phone Field */}
            <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                            {t('addressForm.phoneLabel')}
                        </FormLabel>
                        <FormControl>
                            <Input
                                type="tel"
                                autoComplete="tel"
                                maxLength={32}
                                placeholder={t('addressForm.phonePlaceholder')}
                                className=""
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                    const formatted = formatPhoneWithParens(e.target.value);
                                    field.onChange(formatted);
                                }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Country Field */}
            <FormField
                control={form.control}
                name="countryCode"
                render={({ field }) => (
                    <FormItem className="[&_[data-slot=native-select-wrapper]]:w-full">
                        <FormLabel className="text-sm font-medium text-foreground">
                            {t('addressForm.countryLabel')}
                        </FormLabel>
                        <FormControl>
                            <NativeSelect
                                name={field.name}
                                value={field.value}
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                    // Reset state code when country changes
                                    form.setValue('stateCode', '');
                                    form.setValue('postalCode', '');
                                }}
                                className="">
                                {countries.map((country) => (
                                    <option key={country.code} value={country.code}>
                                        {country.name}
                                    </option>
                                ))}
                            </NativeSelect>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Address Line 1 Field */}
            <FormField
                control={form.control}
                name="address1"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                            {t('addressForm.addressLabel')}
                        </FormLabel>
                        <FormControl>
                            <Input type="text" autoComplete="address-line1" className="" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Address Line 2 Field */}
            <FormField
                control={form.control}
                name="address2"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                            {t('addressForm.address2Label')}
                        </FormLabel>
                        <FormControl>
                            <Input
                                type="text"
                                autoComplete="address-line2"
                                placeholder={t('addressForm.address2Placeholder')}
                                className=""
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Zip Code, City, and State Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Postal Code Field */}
                <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">{postalCodeLabel}</FormLabel>
                            <FormControl>
                                <Input type="text" autoComplete="postal-code" className="" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* City Field */}
                <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">
                                {t('addressForm.cityLabel')}
                            </FormLabel>
                            <FormControl>
                                <Input type="text" autoComplete="address-level2" className="" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* State/Province Field */}
                <FormField
                    control={form.control}
                    name="stateCode"
                    render={({ field }) => (
                        <FormItem className="[&_[data-slot=native-select-wrapper]]:w-full">
                            <FormLabel className="text-sm font-medium text-foreground">{stateLabel}</FormLabel>
                            <FormControl>
                                <NativeSelect
                                    name={field.name}
                                    value={field.value || ''}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    className="">
                                    <option value="">{statePlaceholder}</option>
                                    {stateOptions.map((state) => (
                                        <option key={state.code} value={state.code}>
                                            {state.name}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}
