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
export type CustomerProfileFormData = {
    firstName: string;
    lastName: string;
    phone?: string;
    gender?: string;
    birthday?: string;
};

// Type for the fetcher data response
export type CustomerProfileFetcherData = {
    success: boolean;
    customer?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        login?: string;
        phoneHome?: string;
        phoneMobile?: string;
        gender?: number;
        birthday?: string;
    };
    error?: string;
};

// Props interface for CustomerProfileForm component
export interface CustomerProfileFormProps {
    initialData?: Partial<CustomerProfileFormData>;
    updateFetcher: ScapiFetcher<ShopperCustomers.schemas['Customer'], ShopperCustomers.schemas['Customer']>;
    onSuccess?: (formData: CustomerProfileFormData) => void;
    onError?: (error: string) => void;
    onCancel?: () => void;
    /** When true, action buttons (Save/Cancel) are not rendered; use with formId for external submit. */
    hideActions?: boolean;
    /** Form id for external submit button (e.g. header Save) via form={formId}. */
    formId?: string;
}

// Props interface for CustomerProfileFields component
export interface CustomerProfileFieldsProps {
    form: UseFormReturn<CustomerProfileFormData>;
    updateFetcher: ScapiFetcher<ShopperCustomers.schemas['Customer'], ShopperCustomers.schemas['Customer']>;
    onCancel?: () => void;
    /** When true, do not render Save/Cancel buttons (used when actions are in parent, e.g. card header). */
    hideActions?: boolean;
}
