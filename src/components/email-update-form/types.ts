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
import type { EmailUpdateFormData } from './index';

// Type for the submission payload
export type EmailUpdateSubmissionData = {
    currentPassword?: string;
    email: string;
    login: string;
};

// Type for the fetcher data response
export type EmailUpdateFetcherData = {
    success: boolean;
    error?: string;
};

// Props interface for EmailUpdateForm component
export interface EmailUpdateFormProps {
    initialData?: Partial<EmailUpdateFormData>;
    updateFetcher: ScapiFetcher<EmailUpdateFetcherData, EmailUpdateSubmissionData>;
    onSuccess?: (formData: EmailUpdateFormData) => void;
    onError?: (error: string) => void;
    onCancel?: () => void;
    requirePassword?: boolean;
}

// Props interface for EmailUpdateFields component
export interface EmailUpdateFieldsProps {
    form: UseFormReturn<EmailUpdateFormData>;
    updateFetcher: ScapiFetcher<EmailUpdateFetcherData, EmailUpdateSubmissionData>;
    onCancel?: () => void;
    requirePassword?: boolean;
}
