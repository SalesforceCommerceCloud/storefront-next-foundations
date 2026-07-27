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

import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import AddressDisplay from './index';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import type { ShopperCustomers } from '@/scapi';

const { t } = getTranslation();

const mockUSMinimalAddress: ShopperCustomers.schemas['CustomerAddress'] = {
    addressId: 'address-1',
    firstName: 'John',
    lastName: 'Doe',
    address1: '123 Main Street',
    city: 'New York',
    stateCode: 'NY',
    postalCode: '10001',
    countryCode: 'US',
};

const mockUSCompleteAddress: ShopperCustomers.schemas['CustomerAddress'] = {
    ...mockUSMinimalAddress,
    address2: 'Apt 4B',
    phone: '555-123-4567',
    preferred: false,
    title: 'Mr.',
    companyName: 'Acme Inc.',
};

describe('AddressDisplay', () => {
    describe('when no address is provided', () => {
        test('user sees "No address provided" message', () => {
            render(<AddressDisplay address={null as never} />);

            expect(screen.getByText('No address provided')).toBeInTheDocument();
        });

        test('user does not see any address details', () => {
            render(<AddressDisplay address={null as never} />);

            // No address line, city, etc. should be visible
            expect(screen.queryByText(/123|Main St|New York/i)).not.toBeInTheDocument();
        });
    });

    describe('when complete address with all fields is provided', () => {
        const completeAddress = mockUSCompleteAddress;

        test('renders address1 and location line', () => {
            render(<AddressDisplay address={completeAddress} />);

            // AddressDisplay now only shows address1 and location line
            expect(screen.getByText('123 Main Street')).toBeInTheDocument();
            // Location line format: postalCode, city, state, country
            expect(screen.getByText('10001, New York, New York, United States')).toBeInTheDocument();
        });

        test('displays name by default (showName defaults to true), but not address2 or phone', () => {
            const { container } = render(<AddressDisplay address={completeAddress} />);

            // Name is displayed by default (showName defaults to true)
            expect(container.textContent).toContain('John Doe');
            // address2 and phone are not displayed in the format
            expect(container.textContent).not.toContain('Apt 4B');
            expect(container.textContent).not.toContain('555-123-4567');
        });

        test('displays full name when showName is true', () => {
            render(<AddressDisplay address={completeAddress} showName />);

            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('123 Main Street')).toBeInTheDocument();
        });

        test('does not display name when showName is false', () => {
            const { container } = render(<AddressDisplay address={completeAddress} showName={false} />);

            expect(container.textContent).not.toContain('John Doe');
        });
    });

    describe('when address has only required fields', () => {
        const minimalAddress: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: 'address-minimal',
            firstName: 'John',
            lastName: 'Doe',
            address1: '456 Oak Avenue',
            city: 'Seattle',
            countryCode: 'US',
        };

        test('user sees address1 and city with country', () => {
            render(<AddressDisplay address={minimalAddress} />);

            expect(screen.getByText('456 Oak Avenue')).toBeInTheDocument();
            expect(screen.getByText('Seattle, United States')).toBeInTheDocument();
        });
    });

    describe('when address has city with state but no postal code', () => {
        const addressWithState: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: 'address-state',
            firstName: 'John',
            lastName: 'Doe',
            address1: '789 Pine Road',
            city: 'Austin',
            stateCode: 'TX',
            countryCode: 'US',
        };

        test('user sees city, state name, and country', () => {
            render(<AddressDisplay address={addressWithState} />);

            expect(screen.getByText('789 Pine Road')).toBeInTheDocument();
            expect(screen.getByText('Austin, Texas, United States')).toBeInTheDocument();
        });
    });

    describe('when address has city with postal code but no state', () => {
        const addressWithPostal: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: 'address-postal',
            firstName: 'John',
            lastName: 'Doe',
            address1: '321 Elm Boulevard',
            city: 'Boston',
            postalCode: '02101',
            countryCode: 'US',
        };

        test('user sees postal code, city, and country', () => {
            render(<AddressDisplay address={addressWithPostal} />);

            expect(screen.getByText('321 Elm Boulevard')).toBeInTheDocument();
            expect(screen.getByText('02101, Boston, United States')).toBeInTheDocument();
        });
    });

    describe('when address has all location fields', () => {
        const fullCityAddress: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: 'address-full',
            firstName: 'John',
            lastName: 'Doe',
            address1: '555 Maple Lane',
            city: 'Chicago',
            stateCode: 'IL',
            postalCode: '60601',
            countryCode: 'US',
        };

        test('user sees postal code, city, state name, and country name', () => {
            render(<AddressDisplay address={fullCityAddress} />);

            expect(screen.getByText('555 Maple Lane')).toBeInTheDocument();
            expect(screen.getByText('60601, Chicago, Illinois, United States')).toBeInTheDocument();
        });
    });

    describe('when address has empty string values', () => {
        const addressWithEmptyStrings: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: 'address-empty',
            firstName: 'John',
            lastName: 'Doe',
            address1: '999 Test Street',
            address2: '',
            city: 'Portland',
            stateCode: 'OR',
            postalCode: '',
            countryCode: 'US',
            phone: '',
        };

        test('user sees address1 and city only', () => {
            render(<AddressDisplay address={addressWithEmptyStrings} />);

            expect(screen.getByText('999 Test Street')).toBeInTheDocument();
            // With stateCode but empty postalCode, we get city + state + country
            expect(screen.getByText('Portland, Oregon, United States')).toBeInTheDocument();
        });
    });

    describe('showName prop edge cases', () => {
        test('displays only firstName when lastName is missing', () => {
            const addressWithFirstNameOnly: ShopperCustomers.schemas['CustomerAddress'] = {
                ...mockUSMinimalAddress,
                firstName: 'Jane',
                lastName: '',
            };

            render(<AddressDisplay address={addressWithFirstNameOnly} showName />);

            expect(screen.getByText('Jane')).toBeInTheDocument();
        });

        test('displays only lastName when firstName is missing', () => {
            const addressWithLastNameOnly: ShopperCustomers.schemas['CustomerAddress'] = {
                ...mockUSMinimalAddress,
                lastName: 'Smith',
                firstName: undefined,
            };

            render(<AddressDisplay address={addressWithLastNameOnly} showName />);

            expect(screen.getByText('Smith')).toBeInTheDocument();
        });

        test('does not render name element when both firstName and lastName are missing', () => {
            const addressWithoutName: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'address-no-name',
                firstName: undefined,
                lastName: '',
                address1: '300 Test St',
                city: 'Phoenix',
                stateCode: 'AZ',
                postalCode: '85001',
                countryCode: 'US',
            };

            const { container } = render(<AddressDisplay address={addressWithoutName} showName />);

            // Should only have address1 and location line, no name
            expect(container.textContent).toContain('300 Test St');
            expect(container.textContent).toContain('Phoenix');
        });
    });

    describe('Canadian addresses', () => {
        const canadianAddress: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: 'address-8',
            firstName: 'Sarah',
            lastName: 'Martin',
            address1: '24 Sussex Drive',
            city: 'Ottawa',
            stateCode: 'ON',
            postalCode: 'K1M 1M4',
            countryCode: 'CA',
            phone: '+1-613-555-0199',
        };

        test('user sees Canadian address with province name and country name', () => {
            render(<AddressDisplay address={canadianAddress} />);

            expect(screen.getByText('24 Sussex Drive')).toBeInTheDocument();
            expect(screen.getByText('K1M 1M4, Ottawa, Ontario, Canada')).toBeInTheDocument();
        });
    });

    describe('Default badge display', () => {
        test('displays default badge when isPreferred is true and showName is true', () => {
            render(<AddressDisplay address={mockUSMinimalAddress} showName={true} isPreferred={true} />);

            expect(screen.getByText(t('account:addresses.default'))).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        test('does not display default badge when isPreferred is false', () => {
            render(<AddressDisplay address={mockUSMinimalAddress} showName={true} isPreferred={false} />);

            expect(screen.queryByText(t('account:addresses.default'))).not.toBeInTheDocument();
        });

        test('does not display default badge when isPreferred is not provided', () => {
            render(<AddressDisplay address={mockUSMinimalAddress} showName={true} />);

            expect(screen.queryByText(t('account:addresses.default'))).not.toBeInTheDocument();
        });

        test('does not display default badge when showName is false even if isPreferred is true', () => {
            render(<AddressDisplay address={mockUSMinimalAddress} showName={false} isPreferred={true} />);

            // Name is not shown, so badge should not be shown either
            expect(screen.queryByText(t('account:addresses.default'))).not.toBeInTheDocument();
        });

        test('displays badge inline with name', () => {
            const { container } = render(
                <AddressDisplay address={mockUSMinimalAddress} showName={true} isPreferred={true} />
            );

            // Badge and name should be in the same flex container
            const nameContainer = container.querySelector('.flex.items-center.gap-2');
            expect(nameContainer).toBeInTheDocument();
            expect(nameContainer?.textContent).toContain('John Doe');
            expect(nameContainer?.textContent).toContain(t('account:addresses.default'));
        });
    });
});
