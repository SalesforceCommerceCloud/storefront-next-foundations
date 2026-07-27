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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SavedAddressesList } from './saved-addresses-list';
import type { AddressBookItem } from '@/lib/customer/profile-utils';

const address1: AddressBookItem = {
    id: 'addr-1',
    firstName: 'Jane',
    lastName: 'Doe',
    address1: '123 Main St',
    city: 'San Francisco',
    stateCode: 'CA',
    postalCode: '94102',
    countryCode: 'US',
    preferred: true,
};
const address2: AddressBookItem = {
    id: 'addr-2',
    firstName: 'Bob',
    lastName: 'Smith',
    address1: '456 Oak Ave',
    city: 'Boston',
    stateCode: 'MA',
    postalCode: '02101',
    countryCode: 'US',
    preferred: false,
};

describe('SavedAddressesList', () => {
    test('renders nothing when addresses is empty', () => {
        const { container } = render(<SavedAddressesList addresses={[]} />);
        expect(container.firstChild).toBeNull();
    });

    test('renders addresses with radio group and selects preferred by default', () => {
        render(<SavedAddressesList addresses={[address1, address2]} />);
        expect(screen.getByRole('radiogroup', { name: /select a saved address/i })).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText('123 Main St')).toBeInTheDocument();
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
        const radio1 = screen.getByRole('radio', { name: /jane doe/i });
        const radio2 = screen.getByRole('radio', { name: /bob smith/i });
        expect(radio1).toBeChecked();
        expect(radio2).not.toBeChecked();
    });

    test('selects first address when none is preferred', () => {
        const noPreferred = [
            { ...address1, preferred: false },
            { ...address2, preferred: false },
        ];
        render(<SavedAddressesList addresses={noPreferred} />);
        expect(screen.getByRole('radio', { name: /jane doe/i })).toBeChecked();
    });

    test('calls onValueChange when user selects another address', async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();
        render(<SavedAddressesList addresses={[address1, address2]} onValueChange={onValueChange} />);
        await user.click(screen.getByRole('radio', { name: /bob smith/i }));
        expect(onValueChange).toHaveBeenCalledWith('addr-2');
    });

    test('respects controlled value', () => {
        render(<SavedAddressesList addresses={[address1, address2]} value="addr-2" />);
        expect(screen.getByRole('radio', { name: /bob smith/i })).toBeChecked();
        expect(screen.getByRole('radio', { name: /jane doe/i })).not.toBeChecked();
    });

    test('shows View all when more than maxVisible addresses', async () => {
        const user = userEvent.setup();
        const addresses: AddressBookItem[] = [
            address1,
            address2,
            { ...address1, id: 'addr-3', firstName: 'Alice' },
            { ...address1, id: 'addr-4', firstName: 'Charlie' },
        ];
        render(<SavedAddressesList addresses={addresses} maxVisible={3} />);
        expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument();
        expect(screen.getByText(/jane doe/i)).toBeInTheDocument();
        expect(screen.getByText(/bob smith/i)).toBeInTheDocument();
        expect(screen.getByText(/alice/i)).toBeInTheDocument();
        expect(screen.queryByText(/charlie/i)).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /view all/i }));
        expect(screen.getByText(/charlie/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /view less/i })).toBeInTheDocument();
    });

    test('View less collapses the list', async () => {
        const user = userEvent.setup();
        const addresses: AddressBookItem[] = [address1, address2, { ...address1, id: 'addr-3', firstName: 'Alice' }];
        render(<SavedAddressesList addresses={addresses} maxVisible={2} />);
        await user.click(screen.getByRole('button', { name: /view all/i }));
        await user.click(screen.getByRole('button', { name: /view less/i }));
        expect(screen.queryByText(/alice/i)).not.toBeInTheDocument();
    });

    test('uses default aria-label for the radio group', () => {
        render(<SavedAddressesList addresses={[address1]} />);
        expect(screen.getByRole('radiogroup', { name: 'Select a saved address' })).toBeInTheDocument();
    });

    test('shows Add New Address button when onAddNewAddress is provided and calls it on click', async () => {
        const user = userEvent.setup();
        const onAddNewAddress = vi.fn();
        render(<SavedAddressesList addresses={[address1, address2]} onAddNewAddress={onAddNewAddress} />);
        const addButton = screen.getByRole('button', { name: /add new address/i });
        expect(addButton).toBeInTheDocument();
        await user.click(addButton);
        expect(onAddNewAddress).toHaveBeenCalledTimes(1);
    });

    test('does not show Add New Address button when onAddNewAddress is not provided', () => {
        render(<SavedAddressesList addresses={[address1]} />);
        expect(screen.queryByRole('button', { name: /add new address/i })).not.toBeInTheDocument();
    });

    test('shows Edit Address link for each address when onEditAddress is provided', () => {
        const onEditAddress = vi.fn();
        render(<SavedAddressesList addresses={[address1, address2]} onEditAddress={onEditAddress} />);
        const editLinks = screen.getAllByRole('button', { name: /edit address/i });
        expect(editLinks).toHaveLength(2);
    });

    test('does not show Edit Address link when onEditAddress is not provided', () => {
        render(<SavedAddressesList addresses={[address1, address2]} />);
        expect(screen.queryByRole('button', { name: /edit address/i })).not.toBeInTheDocument();
    });

    test('calls onEditAddress with the correct address id when clicked', async () => {
        const user = userEvent.setup();
        const onEditAddress = vi.fn();
        render(<SavedAddressesList addresses={[address1, address2]} onEditAddress={onEditAddress} />);
        const editLinks = screen.getAllByRole('button', { name: /edit address/i });
        await user.click(editLinks[1]);
        expect(onEditAddress).toHaveBeenCalledWith('addr-2');
    });
});
