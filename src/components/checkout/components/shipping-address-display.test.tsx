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
import { ShippingAddressDisplay, type ShippingAddressDisplayProps } from './shipping-address-display';

function renderDisplay(props: Partial<ShippingAddressDisplayProps> = {}) {
    return render(<ShippingAddressDisplay {...props} />);
}

/** Full address (has countryCode so isAddressEmpty returns false) */
const fullAddress = {
    firstName: 'Jane',
    lastName: 'Doe',
    address1: '123 Main St',
    address2: 'Apt 4',
    city: 'San Francisco',
    stateCode: 'CA',
    postalCode: '94102',
    phone: '555-123-4567',
    countryCode: 'US',
};

const emptyAddressFields = {
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    stateCode: '',
    postalCode: '',
    phone: '',
    countryCode: '',
};

describe('ShippingAddressDisplay', () => {
    describe('when address is empty or missing', () => {
        test.each<{ address: ShippingAddressDisplayProps['address']; label: string }>([
            { address: null, label: 'null' },
            { address: undefined, label: 'undefined' },
            { address: {}, label: 'empty object' },
            { address: emptyAddressFields, label: 'all fields empty' },
        ])('renders nothing for $label', ({ address }) => {
            const { container } = renderDisplay({ address });
            expect(container.firstChild).toBeNull();
        });

        test('renders nothing when address is null', () => {
            const { container } = render(<ShippingAddressDisplay address={null} />);
            expect(container.firstChild).toBeNull();
        });
    });

    describe('when address is present', () => {
        test('renders address in standard format: Name, Address1 Address2, ZipCode, City, StateCode, Country', () => {
            const { container } = renderDisplay({ address: fullAddress });

            expect(screen.getByText('Jane Doe')).toBeInTheDocument();
            expect(screen.getByText('123 Main St Apt 4')).toBeInTheDocument();
            expect(screen.getByText('94102, San Francisco, CA, US')).toBeInTheDocument();
            expect(screen.queryByText('555-123-4567')).not.toBeInTheDocument();
            // Summary variant uses <p> tags, not Typography with text-muted-foreground
            expect(container.querySelectorAll('p').length).toBeGreaterThan(0);
        });

        test('renders only present fields for minimal address', () => {
            renderDisplay({ address: { firstName: 'Bob', address1: '1 Main St' } });

            expect(screen.getByText(/Bob/)).toBeInTheDocument();
            expect(screen.getByText('1 Main St')).toBeInTheDocument();
            expect(screen.queryByText('123 Main St')).not.toBeInTheDocument();
        });
    });

    describe('optional address2', () => {
        test('line2 shows only address1 when address2 is missing', () => {
            const { address2, ...noAddress2 } = fullAddress;
            void address2;
            renderDisplay({ address: noAddress2 });

            expect(screen.getByText('123 Main St')).toBeInTheDocument();
            expect(screen.queryByText('Apt 4')).not.toBeInTheDocument();
        });

        test('line2 shows only address1 when address2 is empty string', () => {
            renderDisplay({ address: { ...fullAddress, address2: '' } });

            expect(screen.getByText('123 Main St')).toBeInTheDocument();
            expect(screen.queryByText('Apt 4')).not.toBeInTheDocument();
        });

        test('line2 shows address1 and address2 when both present', () => {
            renderDisplay({ address: fullAddress });
            expect(screen.getByText('123 Main St Apt 4')).toBeInTheDocument();
        });
    });

    describe('optional stateCode and countryCode', () => {
        test('line3 omits state when stateCode is missing', () => {
            const { stateCode, ...noState } = fullAddress;
            void stateCode;
            renderDisplay({ address: noState });

            expect(screen.getByText('94102, San Francisco, US')).toBeInTheDocument();
        });

        test('line3 shows ZipCode, City, StateCode, Country when all present', () => {
            renderDisplay({ address: fullAddress });
            expect(screen.getByText('94102, San Francisco, CA, US')).toBeInTheDocument();
        });
    });

    describe('displayPhone', () => {
        test('does not show phone when displayPhone is false', () => {
            renderDisplay({ address: fullAddress, displayPhone: false });
            expect(screen.queryByText('555-123-4567')).not.toBeInTheDocument();
        });

        test('shows phone when displayPhone is true', () => {
            renderDisplay({ address: fullAddress, displayPhone: true });
            expect(screen.getByText('555-123-4567')).toBeInTheDocument();
        });
    });

    describe('variant', () => {
        test('card variant shows default badge when address.preferred is true', () => {
            render(<ShippingAddressDisplay address={{ ...fullAddress, preferred: true }} variant="card" />);
            expect(screen.getByText('Default')).toBeInTheDocument();
        });

        test('card variant uses Typography with space-y-1.5 and text-muted-foreground', () => {
            const { container } = render(<ShippingAddressDisplay address={fullAddress} variant="card" />);
            expect(container.querySelector('.space-y-1\\.5')).toBeInTheDocument();
            expect(container.querySelectorAll('[class*="text-muted-foreground"]').length).toBeGreaterThan(0);
        });

        test('summary variant uses p tags without special styling classes', () => {
            const { container } = render(<ShippingAddressDisplay address={fullAddress} variant="summary" />);
            expect(container.querySelectorAll('p').length).toBeGreaterThan(0);
            expect(container.querySelector('.space-y-1\\.5')).not.toBeInTheDocument();
        });

        test('summary variant does not show default badge when address.preferred is true', () => {
            render(<ShippingAddressDisplay address={{ ...fullAddress, preferred: true }} variant="summary" />);
            expect(screen.queryByText('Default')).not.toBeInTheDocument();
        });
    });
});
