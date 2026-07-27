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
// This file is excluded from coverage as it primarily handles React Hook Form integration,
// React Router fetcher coordination, and API submission logic. These aspects require complex
// mocking of hooks, context providers, and network requests that are better tested through
// integration tests. The core validation logic is thoroughly tested in index.test.tsx.
/* c8 ignore end */

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { ShopperCustomers } from '@/scapi';

// components
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Spinner } from '@/components/spinner';
import { CustomerAddressFields } from './customer-address-fields';

//hooks
import { useScapiFetcherEffect } from '@/hooks/use-scapi-fetcher-effect';

//lib
import { FETCHER_STATES } from '@/lib/fetcher-states';
import { generateAddressId } from '@/lib/address/address-id-utils';

//types
import { createCustomerAddressFormSchema, type CustomerAddressFormData, type CustomerAddressFormInput } from './index';
import { type CustomerAddressFormProps } from './types';

/**
 * CustomerAddressForm component that provides a form interface for editing customer address information.
 *
 * This component renders a form for editing address fields including address title, first name, last name, phone,
 * country, address line 1, address line 2, city, state/province, postal code, and preferred flag.
 * It handles form validation, submission, and displays appropriate success/error feedback.
 * The form automatically resets on successful submission. Success and error handling is managed
 * through the useScapiFetcherEffect hook's onSuccess/onError callbacks.
 *
 * Success/Error Display:
 * - If `onSuccess`/`onError` callbacks are provided, they are handled by the callbacks (typically for toast notifications)
 * - If no `onSuccess`/`onError` callbacks are provided, success/error messages are displayed inline at the top of the form
 *
 * The component includes action buttons (Save and Cancel) that are rendered as part of the form.
 * The fields themselves are rendered by the CustomerAddressFields component, which focuses solely
 * on field presentation.
 *
 * @param initialData - Optional initial data to populate the form fields
 * @param updateFetcher - React Router fetcher for handling address update requests
 * @param onSuccess - Optional callback function called when address is successfully updated (receives form data). If not provided, success message is displayed inline.
 * @param onError - Optional callback function called when address update fails (receives error). If not provided, errors are displayed inline.
 * @param onCancel - Optional callback function called when user cancels the form
 *
 * @returns JSX element containing the customer address form
 *
 * @example
 * ```tsx
 * // Basic usage with initial data and callbacks
 * <CustomerAddressForm
 *   initialData={{ addressId: 'Home', firstName: 'John', lastName: 'Doe', address1: '123 Main St', address2: 'Apt 4B', city: 'New York', countryCode: 'US' }}
 *   updateFetcher={updateFetcher}
 *   onSuccess={(formData) => console.log('Address updated!', formData)}
 *   onError={(error) => console.error('Update failed:', error)}
 *   onCancel={() => setEditing(false)}
 * />
 *
 * // Usage without callbacks - success/error messages will be displayed inline
 * <CustomerAddressForm updateFetcher={updateFetcher} />
 * ```
 */
export const CustomerAddressForm = ({
    initialData,
    updateFetcher,
    onSuccess,
    onError,
    onCancel,
    isFirstAddress = false,
}: CustomerAddressFormProps) => {
    const { t } = useTranslation('account');
    const schema = useMemo(() => createCustomerAddressFormSchema(t), [t]);

    const form = useForm<CustomerAddressFormInput, unknown, CustomerAddressFormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            firstName: initialData?.firstName || '',
            lastName: initialData?.lastName || '',
            phone: initialData?.phone || '',
            countryCode: initialData?.countryCode || 'US',
            address1: initialData?.address1 || '',
            address2: initialData?.address2 || '',
            city: initialData?.city || '',
            stateCode: initialData?.stateCode || '',
            postalCode: initialData?.postalCode || '',
            preferred: Boolean(initialData?.preferred ?? false),
        },
    });

    // State for inline error display (used when onError is not provided)
    const [inlineErrorMessage, setInlineErrorMessage] = useState<string | undefined>(undefined);
    // State for inline success display (used when onSuccess is not provided)
    const [inlineSuccessMessage, setInlineSuccessMessage] = useState<string | undefined>(undefined);

    // Use useScapiFetcherEffect to handle fetcher state changes
    // This handles form-specific concerns (reset, error state) and calls parent callbacks
    // Note: data is already the address object (unwrapped by ScapiFetcher)
    // The generic type is inferred from updateFetcher which is ScapiFetcher<CustomerAddress>
    useScapiFetcherEffect(updateFetcher, {
        onSuccess: (data) => {
            if (!data) return;

            // data is already the address object (unwrapped by ScapiFetcher)
            // Type is correctly inferred from the fetcher's generic type
            const address = data;

            const formData: CustomerAddressFormData = {
                firstName: address.firstName || '',
                lastName: address.lastName || '',
                phone: address.phone || '',
                countryCode: (address.countryCode as 'US' | 'CA') || 'US',
                address1: address.address1 || '',
                address2: address.address2 || '',
                city: address.city || '',
                stateCode: address.stateCode || '',
                postalCode: address.postalCode || '',
                preferred: Boolean(address.preferred ?? false),
            };

            // Clear inline error on success
            setInlineErrorMessage(undefined);
            // Reset form on success
            form.reset();
            // If no onSuccess callback provided, set inline success state for display
            if (!onSuccess) {
                setInlineSuccessMessage(t('addressForm.successMessage'));
            }
            // Call parent callback - parent will handle toasts and other UI feedback
            onSuccess?.(formData);
        },
        onError: (errors) => {
            const errorMessage = errors && errors.length > 0 ? errors.join(', ') : t('addressForm.errorMessage');
            // Set form error state
            form.setError('root', {
                type: 'manual',
                message: errorMessage,
            });
            // Clear inline success on error
            setInlineSuccessMessage(undefined);
            // If no onError callback provided, set inline error state for display
            if (!onError) {
                setInlineErrorMessage(errorMessage);
            }
            // Call parent callback - parent will handle toasts
            onError?.(errorMessage);
        },
    });

    /**
     * Handles form submission for updating customer address.
     *
     * This function is called when the form is submitted and performs the following:
     * 1. Validates the form data using the Zod schema
     * 2. Calls the updateFetcher.submit with the validated data
     * 3. The API response is handled by the parent component's fetcher effect handlers
     *
     * @param data - The validated form data containing address information
     */
    const handleSubmit = form.handleSubmit((data) => {
        // Auto-generate addressId for all addresses
        // Use existing addressId for edits, or generate new one for new addresses
        const addressId = initialData?.addressId || generateAddressId();

        // If this is the first address and it's a new address (no initialData), set preferred to true
        const shouldSetPreferred = isFirstAddress && !initialData;

        // Prepare address data in the format expected by Commerce SDK
        // Only include optional fields if they have values to prevent "undefined" string serialization
        const addressData: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId,
            firstName: data.firstName,
            lastName: data.lastName,
            countryCode: data.countryCode,
            address1: data.address1,
            city: data.city,
            postalCode: data.postalCode,
            preferred: shouldSetPreferred ? true : Boolean(data.preferred),
        };

        // Only include optional fields if they have truthy values
        // This prevents undefined values from being serialized as "undefined" strings in FormData
        if (data.phone) {
            addressData.phone = data.phone;
        }
        if (data.address2) {
            addressData.address2 = data.address2;
        }
        if (data.stateCode) {
            addressData.stateCode = data.stateCode;
        }

        // Plain-object payloads are submitted as JSON by useScapiFetcher's auto-detect,
        // so typed values (e.g., `preferred` as boolean) survive the round-trip without
        // server-side per-field coercion. Response is handled by the parent's fetcher effect.
        void updateFetcher.submit(addressData);
    });

    /**
     * Handles cancel action.
     * Resets the form and calls the onCancel callback if provided.
     */
    const handleCancel = () => {
        setInlineErrorMessage(undefined);
        setInlineSuccessMessage(undefined);
        form.reset();
        onCancel?.();
    };

    const isSubmitting = updateFetcher.state === FETCHER_STATES.SUBMITTING;

    return (
        <div className="w-full relative">
            <Form {...form}>
                <form onSubmit={(e) => void handleSubmit(e)} data-testid="customer-address-form">
                    {inlineSuccessMessage && (
                        <div className="mb-4 p-3 bg-success/10 rounded-ui border border-success/20">
                            <p className="text-sm text-success">{inlineSuccessMessage}</p>
                        </div>
                    )}
                    {inlineErrorMessage && (
                        <div className="mb-4 p-3 bg-destructive/10 rounded-ui border border-destructive/20">
                            <p className="text-sm text-destructive">{inlineErrorMessage}</p>
                        </div>
                    )}
                    <CustomerAddressFields form={form} />
                    {/* Separator */}
                    <hr className="border-border mt-4" />

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 justify-end">
                        {onCancel && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancel}
                                disabled={isSubmitting}
                                className="px-6">
                                {t('addressForm.cancelButton')}
                            </Button>
                        )}
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6">
                            {isSubmitting ? t('addressForm.savingButton') : t('addressForm.saveButton')}
                        </Button>
                    </div>
                </form>
            </Form>
            {/* Spinner Overlay */}
            {isSubmitting && (
                <div
                    className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 pointer-events-none flex items-center justify-center"
                    data-testid="customer-address-form-loading">
                    <Spinner size="lg" />
                </div>
            )}
        </div>
    );
};
