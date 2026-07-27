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

import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { FETCHER_STATES } from '@/lib/fetcher-states';
import { type EmailUpdateFieldsProps } from './types';
import { useTranslation } from 'react-i18next';

/**
 * EmailUpdateFields component that renders the form fields for updating email address.
 *
 * @param form - React Hook Form instance for managing form state and validation
 * @param updateFetcher - React Router fetcher for handling email update requests
 * @param onCancel - Optional callback function to handle cancel action
 */
export function EmailUpdateFields({ form, updateFetcher, onCancel, requirePassword = true }: EmailUpdateFieldsProps) {
    const { t } = useTranslation('account');
    const isSubmitting = updateFetcher.state === FETCHER_STATES.SUBMITTING;

    return (
        <div className="space-y-4">
            {/* Email Field */}
            <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">{t('email.title')}</FormLabel>
                        <FormControl>
                            <Input
                                type="email"
                                placeholder={t('email.newEmailPlaceholder')}
                                className="rounded-ui border-border focus:ring-2 focus:ring-ring focus:border-transparent"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Current Password Field — only shown when requirePassword=true */}
            {requirePassword && (
                <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">
                                {t('email.currentPassword')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="password"
                                    placeholder={t('email.currentPasswordPlaceholder')}
                                    className="rounded-ui border-border focus:ring-2 focus:ring-ring focus:border-transparent"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting} className="rounded-ui">
                    {isSubmitting ? t('email.saving') : t('email.saveButton')}
                </Button>
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="rounded-ui bg-card border-border text-foreground hover:bg-muted/50 px-4 py-2 text-sm font-medium">
                        {t('email.cancelButton')}
                    </Button>
                )}
            </div>
        </div>
    );
}
