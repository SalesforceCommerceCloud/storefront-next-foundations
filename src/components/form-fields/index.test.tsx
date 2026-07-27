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

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { NativeSelectOption } from '@/components/ui/native-select';
import { FormInput, FormNativeSelect } from './index';

interface TestFormData {
    email: string;
    country: string;
}

function TestWrapper({
    children,
    defaultValues = { email: '', country: 'US' },
}: {
    children: (form: ReturnType<typeof useForm<TestFormData>>) => React.ReactNode;
    defaultValues?: Partial<TestFormData>;
}) {
    const form = useForm<TestFormData>({ defaultValues: { email: '', country: 'US', ...defaultValues } });
    return <FormProvider {...form}>{children(form)}</FormProvider>;
}

describe('FormInput', () => {
    test('renders with data-slot="input" attribute for design system styling', () => {
        render(
            <TestWrapper>
                {(form) => (
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormInput placeholder="Enter email" {...field} />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </TestWrapper>
        );

        const input = screen.getByPlaceholderText('Enter email');
        expect(input).toHaveAttribute('data-slot', 'input');
    });

    test('sets id from form context for label association', () => {
        render(
            <TestWrapper>
                {(form) => (
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormInput placeholder="Enter email" {...field} />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </TestWrapper>
        );

        const input = screen.getByPlaceholderText('Enter email');
        expect(input).toHaveAttribute('id');
        expect(input.id).toContain('form-item');
    });

    test('sets aria-invalid to false when no error', () => {
        render(
            <TestWrapper>
                {(form) => (
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormInput placeholder="Enter email" {...field} />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </TestWrapper>
        );

        const input = screen.getByPlaceholderText('Enter email');
        expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    test('does not set aria-describedby when no error exists', () => {
        render(
            <TestWrapper>
                {(form) => (
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormInput placeholder="Enter email" {...field} />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </TestWrapper>
        );

        const input = screen.getByPlaceholderText('Enter email');
        expect(input).not.toHaveAttribute('aria-describedby');
    });

    test('passes through additional props to the underlying input', () => {
        render(
            <TestWrapper>
                {(form) => (
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormInput type="email" placeholder="Enter email" autoComplete="email" {...field} />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </TestWrapper>
        );

        const input = screen.getByPlaceholderText('Enter email');
        expect(input).toHaveAttribute('type', 'email');
        expect(input).toHaveAttribute('autocomplete', 'email');
    });
});

describe('FormNativeSelect', () => {
    test('renders with data-slot="native-select" attribute for design system styling', () => {
        render(
            <TestWrapper>
                {(form) => (
                    <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                            <FormItem>
                                <FormNativeSelect aria-label="Country" {...field}>
                                    <NativeSelectOption value="US">United States</NativeSelectOption>
                                    <NativeSelectOption value="CA">Canada</NativeSelectOption>
                                </FormNativeSelect>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </TestWrapper>
        );

        const select = screen.getByRole('combobox', { name: 'Country' });
        expect(select).toHaveAttribute('data-slot', 'native-select');
    });

    test('sets id and aria-invalid from form context', () => {
        render(
            <TestWrapper>
                {(form) => (
                    <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                            <FormItem>
                                <FormNativeSelect aria-label="Country" {...field}>
                                    <NativeSelectOption value="US">United States</NativeSelectOption>
                                </FormNativeSelect>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </TestWrapper>
        );

        const select = screen.getByRole('combobox', { name: 'Country' });
        expect(select).toHaveAttribute('id');
        expect(select.id).toContain('form-item');
        expect(select).toHaveAttribute('aria-invalid', 'false');
    });
});
