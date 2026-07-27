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

// Type for the form data (inferred from schema in index.tsx)
export type PasswordUpdateFormData = {
    currentPassword: string;
    password: string;
    confirmPassword: string; // Virtual field for validation only, not included in submission
};

// Type for the submission payload (excludes virtual fields)
export type PasswordUpdateSubmissionData = {
    currentPassword: string;
    password: string;
};

// Type for the fetcher data response
export type PasswordUpdateFetcherData = {
    success: boolean;
    error?: string;
};

// Props interface for PasswordUpdateForm component
export interface PasswordUpdateFormProps {
    initialData?: Partial<PasswordUpdateFormData>;
    updateFetcher: ScapiFetcher<PasswordUpdateFetcherData, PasswordUpdateSubmissionData>;
    onSuccess?: (formData: PasswordUpdateFormData) => void;
    onError?: (error: string) => void;
    onCancel?: () => void;
}

// Props interface for PasswordUpdateFields component
export interface PasswordUpdateFieldsProps {
    form: UseFormReturn<PasswordUpdateFormData>;
    updateFetcher: ScapiFetcher<PasswordUpdateFetcherData, PasswordUpdateSubmissionData>;
    onCancel?: () => void;
}
