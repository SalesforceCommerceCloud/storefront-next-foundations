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
import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressModal } from './address-modal';

vi.mock('@/hooks/use-autocomplete-suggestions', () => ({
    useAutocompleteSuggestions: vi.fn(() => ({
        suggestions: [],
        isLoading: false,
        resetSession: vi.fn(),
        fetchSuggestions: vi.fn(),
    })),
    MIN_INPUT_LENGTH: 3,
}));
vi.mock('@/lib/address/address-suggestions', () => ({
    processAddressSuggestion: vi.fn(),
}));

describe('AddressModal', () => {
    test('does not render dialog content when open is false', () => {
        render(<AddressModal open={false} onOpenChange={vi.fn()} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByText('Add New Address')).not.toBeInTheDocument();
    });

    test('renders dialog with title and form when open is true', () => {
        render(<AddressModal open={true} onOpenChange={vi.fn()} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Add New Address' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument();
    });

    test('calls onOpenChange(false) when Cancel is clicked', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        render(<AddressModal open={true} onOpenChange={onOpenChange} />);
        await user.click(screen.getByRole('button', { name: /cancel/i }));
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    test('resets form when opened', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<AddressModal open={true} onOpenChange={vi.fn()} />);
        await user.type(screen.getByPlaceholderText(/first name/i), 'Jane');
        expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('Jane');

        rerender(<AddressModal open={false} onOpenChange={vi.fn()} />);
        rerender(<AddressModal open={true} onOpenChange={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('');
        });
    });

    test('calls onSave with address data when form is valid and Save is clicked', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<AddressModal open={true} onOpenChange={vi.fn()} onSave={onSave} countryCode="US" />);

        await user.type(screen.getByPlaceholderText(/first name/i), 'Jane');
        await user.type(screen.getByPlaceholderText(/last name/i), 'Doe');
        await user.type(screen.getByRole('textbox', { name: /address line 1|^address$/i }), '123 Main St');
        await user.type(screen.getByRole('textbox', { name: /city/i }), 'San Francisco');
        await user.selectOptions(screen.getByRole('combobox', { name: /state/i }), 'CA');
        await user.type(screen.getByRole('textbox', { name: /zip|postal/i }), '94102');

        await user.click(screen.getByRole('button', { name: /^save$/i }));

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledTimes(1);
        });
        const data = onSave.mock.calls[0][0];
        expect(data.firstName).toBe('Jane');
        expect(data.lastName).toBe('Doe');
        expect(data.address1).toBe('123 Main St');
        expect(data.city).toBe('San Francisco');
        expect(data.stateCode).toBe('CA');
        expect(data.postalCode).toBe('94102');
    });

    test('calls onOpenChange(false) after successful save', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        const onSave = vi.fn();
        render(<AddressModal open={true} onOpenChange={onOpenChange} onSave={onSave} countryCode="US" />);

        await user.type(screen.getByPlaceholderText(/first name/i), 'Jane');
        await user.type(screen.getByPlaceholderText(/last name/i), 'Doe');
        await user.type(screen.getByRole('textbox', { name: /address line 1|^address$/i }), '123 Main St');
        await user.type(screen.getByRole('textbox', { name: /city/i }), 'San Francisco');
        await user.selectOptions(screen.getByRole('combobox', { name: /state/i }), 'CA');
        await user.type(screen.getByRole('textbox', { name: /zip|postal/i }), '94102');
        await user.click(screen.getByRole('button', { name: /^save$/i }));

        await waitFor(() => {
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    test('does not submit when required fields are empty', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<AddressModal open={true} onOpenChange={vi.fn()} onSave={onSave} />);
        await user.click(screen.getByRole('button', { name: /^save$/i }));
        expect(onSave).not.toHaveBeenCalled();
    });

    test('uses default countryCode US when not provided', () => {
        render(<AddressModal open={true} onOpenChange={vi.fn()} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /state/i })).toBeInTheDocument();
    });

    test('passes countryCode to form default values', () => {
        render(<AddressModal open={true} onOpenChange={vi.fn()} countryCode="CA" />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        // With showCountry true, modal shows Country and State comboboxes
        const comboboxes = screen.getAllByRole('combobox');
        expect(comboboxes.length).toBeGreaterThanOrEqual(2);
    });

    test('has accessible dialog with aria-labelledby and aria-describedby', () => {
        render(<AddressModal open={true} onOpenChange={vi.fn()} />);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-labelledby', 'address-modal-title');
        expect(dialog).toHaveAttribute('aria-describedby', 'address-modal-desc');
        expect(screen.getByRole('heading', { name: 'Add New Address' })).toHaveAttribute('id', 'address-modal-title');
    });

    test('shows addressId field when showAddressId is true', () => {
        render(<AddressModal open={true} onOpenChange={vi.fn()} showAddressId={true} />);
        expect(screen.getByPlaceholderText(/e\.g\., Home, Work/i)).toBeInTheDocument();
    });

    test('hides addressId field when showAddressId is false', () => {
        render(<AddressModal open={true} onOpenChange={vi.fn()} showAddressId={false} />);
        expect(screen.queryByPlaceholderText(/e\.g\., Home, Work/i)).not.toBeInTheDocument();
    });

    test('populates form fields from defaultValues', () => {
        render(
            <AddressModal
                open={true}
                onOpenChange={vi.fn()}
                defaultValues={{
                    firstName: 'Jane',
                    lastName: 'Smith',
                    address1: '456 Oak Ave',
                    city: 'Portland',
                }}
            />
        );
        expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('Jane');
        expect(screen.getByPlaceholderText(/last name/i)).toHaveValue('Smith');
    });

    test('shows "Edit Address" title when isEditMode is true', () => {
        render(<AddressModal open={true} onOpenChange={vi.fn()} isEditMode={true} />);
        expect(screen.getByRole('heading', { name: 'Edit Address' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Add New Address' })).not.toBeInTheDocument();
    });

    test('shows "Add Address" title when isEditMode is false', () => {
        render(<AddressModal open={true} onOpenChange={vi.fn()} isEditMode={false} />);
        expect(screen.getByRole('heading', { name: 'Add New Address' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Edit Address' })).not.toBeInTheDocument();
    });

    test('defaults to "Add New Address" title when isEditMode is not provided', () => {
        render(<AddressModal open={true} onOpenChange={vi.fn()} />);
        expect(screen.getByRole('heading', { name: 'Add New Address' })).toBeInTheDocument();
    });

    test('strips phoneCountryCode from saved data', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<AddressModal open={true} onOpenChange={vi.fn()} onSave={onSave} countryCode="US" showPhone={true} />);

        await user.type(screen.getByPlaceholderText(/first name/i), 'Jane');
        await user.type(screen.getByPlaceholderText(/last name/i), 'Doe');
        await user.type(screen.getByRole('textbox', { name: /address line 1|^address$/i }), '123 Main St');
        await user.type(screen.getByRole('textbox', { name: /city/i }), 'San Francisco');
        await user.selectOptions(screen.getByRole('combobox', { name: /state/i }), 'CA');
        await user.type(screen.getByRole('textbox', { name: /zip|postal/i }), '94102');
        await user.type(screen.getByRole('textbox', { name: /phone/i }), '5551234567');

        await user.click(screen.getByRole('button', { name: /^save$/i }));

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledTimes(1);
        });
        const data = onSave.mock.calls[0][0];
        // phoneCountryCode should not be in the result
        expect(data).not.toHaveProperty('phoneCountryCode');
        // phone should include country code
        expect(data.phone).toContain('+1');
    });

    describe('isLoading prop', () => {
        test('disables Save and Cancel buttons when isLoading is true', () => {
            render(<AddressModal open={true} onOpenChange={vi.fn()} isLoading={true} />);
            expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
            expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
        });

        test('shows "Saving..." text on save button when isLoading is true', () => {
            render(<AddressModal open={true} onOpenChange={vi.fn()} isLoading={true} />);
            expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
        });

        test('does not self-close on save when isLoading is provided', async () => {
            const user = userEvent.setup();
            const onOpenChange = vi.fn();
            const onSave = vi.fn();
            render(
                <AddressModal
                    open={true}
                    onOpenChange={onOpenChange}
                    onSave={onSave}
                    isLoading={false}
                    countryCode="US"
                />
            );

            await user.type(screen.getByPlaceholderText(/first name/i), 'Jane');
            await user.type(screen.getByPlaceholderText(/last name/i), 'Doe');
            await user.type(screen.getByRole('textbox', { name: /address line 1|^address$/i }), '123 Main St');
            await user.type(screen.getByRole('textbox', { name: /city/i }), 'San Francisco');
            await user.selectOptions(screen.getByRole('combobox', { name: /state/i }), 'CA');
            await user.type(screen.getByRole('textbox', { name: /zip|postal/i }), '94102');
            await user.click(screen.getByRole('button', { name: /^save$/i }));

            await waitFor(() => {
                expect(onSave).toHaveBeenCalledTimes(1);
            });
            expect(onOpenChange).not.toHaveBeenCalledWith(false);
        });

        test('buttons are enabled when isLoading is false', () => {
            render(<AddressModal open={true} onOpenChange={vi.fn()} isLoading={false} />);
            expect(screen.getByRole('button', { name: /^save$/i })).toBeEnabled();
            expect(screen.getByRole('button', { name: /cancel/i })).toBeEnabled();
        });
    });
});
