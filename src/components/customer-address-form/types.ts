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
import { type UseFormReturn } from 'react-hook-form';
import type { ScapiFetcher } from '@/hooks/use-scapi-fetcher';
import type { ShopperCustomers } from '@/scapi';

// Type for the form data (inferred from schema in index.tsx)
// This is the parsed/output shape (after .default(false) is applied to `preferred`).
export type CustomerAddressFormData = {
    addressId?: string;
    firstName: string;
    lastName: string;
    phone: string;
    countryCode: 'US' | 'CA';
    address1: string;
    address2?: string;
    city: string;
    stateCode: string;
    postalCode: string;
    preferred: boolean;
};

// Form input shape — mirrors CustomerAddressFormData but `preferred` is optional
// because the schema applies `.default(false)` only on parse.
export type CustomerAddressFormInput = Omit<CustomerAddressFormData, 'preferred'> & {
    preferred?: boolean;
};

// Props interface for CustomerAddressForm component
export interface CustomerAddressFormProps {
    initialData?: Partial<CustomerAddressFormData>;
    // The fetcher returns CustomerAddress directly (unwrapped by ScapiFetcher)
    updateFetcher: ScapiFetcher<
        ShopperCustomers.schemas['CustomerAddress'],
        ShopperCustomers.schemas['CustomerAddress']
    >;
    onSuccess?: (formData: CustomerAddressFormData) => void;
    onError?: (error: string) => void;
    onCancel?: () => void;
    // If true and initialData is undefined (new address), automatically set preferred to true
    isFirstAddress?: boolean;
}

// Props interface for CustomerAddressFields component
export interface CustomerAddressFieldsProps {
    form: UseFormReturn<CustomerAddressFormInput, unknown, CustomerAddressFormData>;
}
