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
import type { ShopperBasketsV2, ShopperCustomers } from '@/scapi';
import type { AddressBookItem } from '@/lib/customer/profile-utils';

/**
 * Normalizes address field values for comparison
 */
const normalize = (value: string | undefined | null) => (!value ? '' : value);

/**
 * Creates a normalized string key from an address for deduplication and comparison.
 * @param address - OrderAddress or CustomerAddress to create a key for
 * @returns A hyphen-separated string of normalized core address fields
 */
export function getAddressKey(
    address: ShopperBasketsV2.schemas['OrderAddress'] | ShopperCustomers.schemas['CustomerAddress']
): string {
    return `${normalize(address.firstName)}-${normalize(address.lastName)}-${normalize(address.address1)}-${normalize(address.city)}-${normalize(address.stateCode)}-${normalize(address.postalCode)}-${normalize(address.countryCode)}`;
}

/**
 * Compares two addresses for equality by their normalized field values.
 */
export function isAddressEqual(
    address1?: ShopperBasketsV2.schemas['OrderAddress'] | null,
    address2?: ShopperBasketsV2.schemas['OrderAddress'] | null
): boolean {
    if (!address1 || !address2) return false;
    return getAddressKey(address1) === getAddressKey(address2);
}

/**
 * Converts an OrderAddress to a CustomerAddress format
 * This is useful for creating guest addresses or converting between address types
 *
 * @param orderAddress - The order address to convert
 * @param preferred - Whether this should be marked as a preferred address (defaults to false)
 * @returns CustomerAddress with auto-generated addressId
 */
export function orderAddressToCustomerAddress(
    orderAddress: ShopperBasketsV2.schemas['OrderAddress'],
    preferred: boolean = false
): ShopperCustomers.schemas['CustomerAddress'] {
    return {
        addressId: `shipping_${Date.now()}`, // Generate unique address ID
        address1: orderAddress.address1 || '',
        address2: orderAddress.address2,
        city: orderAddress.city || '',
        countryCode: orderAddress.countryCode || 'US',
        firstName: orderAddress.firstName || '',
        lastName: orderAddress.lastName || '',
        phone: orderAddress.phone,
        postalCode: orderAddress.postalCode || '',
        stateCode: orderAddress.stateCode,
        preferred,
    };
}

/**
 * Checks if an address has no meaningful content (all fields are empty/falsy)
 * Ignores the id field and only checks actual address fields
 * @param address - Address object to check
 * @returns true if address is empty or has no meaningful content
 */
export function isAddressEmpty(address: ShopperBasketsV2.schemas['OrderAddress'] | undefined | null): boolean {
    if (!address) return true;
    return (
        normalize(address.address1) === '' &&
        normalize(address.city) === '' &&
        normalize(address.countryCode) === '' &&
        normalize(address.firstName) === '' &&
        normalize(address.lastName) === '' &&
        normalize(address.phone) === '' &&
        normalize(address.postalCode) === '' &&
        normalize(address.stateCode) === ''
    );
}

/**
 * True when billing cannot satisfy SFCC order placement (e.g. phone-only stub set from contact step).
 * Used so checkout can copy a full shipping address onto billing when this returns true.
 */
export function isOrderBillingAddressIncomplete(
    address: ShopperBasketsV2.schemas['OrderAddress'] | undefined | null
): boolean {
    if (!address || isAddressEmpty(address)) {
        return true;
    }
    const address1 = normalize(address.address1);
    const city = normalize(address.city);
    const postalCode = normalize(address.postalCode);
    const countryCode = normalize(address.countryCode);
    return address1 === '' || city === '' || postalCode === '' || countryCode === '';
}

type FormattedAddress = {
    /** Full name line (firstName + lastName). */
    nameLine: string;
    /** Street line (address1 + address2). */
    streetLine: string;
    /** City line (postalCode, city, stateCode, countryCode). */
    cityLine: string;
    /** Street and city joined for display (streetLine + cityLine). */
    addressLine: string;
    /** Single-line format for dropdowns: name, address1, city, stateCode, postalCode. */
    fullAddress: string;
};

/**
 * Formats an address for display. Returns structured lines and a single-line string.
 * @param address - The address to format
 * @param fallbackText - Used for fullAddress when address is null/undefined (defaults to empty string)
 * @returns Object with nameLine, streetLine, cityLine, and fullAddress (single-line for dropdowns)
 */
export function formatAddress(
    address?: ShopperBasketsV2.schemas['OrderAddress'] | ShopperCustomers.schemas['CustomerAddress'] | null,
    fallbackText: string = ''
): FormattedAddress {
    if (!address) {
        return { nameLine: '', streetLine: '', cityLine: '', addressLine: '', fullAddress: fallbackText };
    }
    const nameLine =
        address.firstName && address.lastName
            ? `${address.firstName} ${address.lastName}`
            : [address.firstName, address.lastName].filter(Boolean).join(' ') || '';
    const streetLine = [address.address1, address.address2].filter(Boolean).join(' ');
    const cityLine = [address.postalCode, address.city, address.stateCode, address.countryCode]
        .filter(Boolean)
        .join(', ');
    const fullAddressParts = [
        address.firstName && address.lastName ? `${address.firstName} ${address.lastName}` : null,
        address.address1,
        address.city && address.stateCode ? `${address.city}, ${address.stateCode}` : address.city || address.stateCode,
        address.postalCode,
    ].filter(Boolean);
    const fullAddress = fullAddressParts.join(', ');
    const addressLine = [streetLine, cityLine].filter(Boolean).join(', ');
    return { nameLine, streetLine, cityLine, addressLine, fullAddress };
}

/**
 * Converts a CustomerAddress to an OrderAddress format.
 * Uses the same structure as the shipping address submission body.
 * Applies default empty strings and 'US' for countryCode so the result is safe to spread into AddressBookItem.
 *
 * @param customerAddress - The customer address to convert
 * @returns OrderAddress without id (id should be added separately from addressId); all string fields normalized
 */
export function customerAddressToOrderAddress(
    customerAddress: ShopperCustomers.schemas['CustomerAddress']
): ShopperBasketsV2.schemas['OrderAddress'] {
    return {
        address1: customerAddress.address1 ?? '',
        address2: customerAddress.address2,
        city: customerAddress.city ?? '',
        countryCode: customerAddress.countryCode ?? 'US',
        firstName: customerAddress.firstName ?? '',
        lastName: customerAddress.lastName ?? '',
        phone: customerAddress.phone,
        postalCode: customerAddress.postalCode ?? '',
        stateCode: customerAddress.stateCode ?? '',
    };
}

/**
 * Finds the saved address that matches a basket/order shipping address by comparing
 * core address fields. Returns the matching address ID, or undefined if no match.
 */
export function findMatchingSavedAddressId(
    shippingAddress: ShopperBasketsV2.schemas['OrderAddress'] | undefined | null,
    savedAddresses: AddressBookItem[]
): string | undefined {
    if (!shippingAddress || savedAddresses.length === 0) return undefined;

    const key = getAddressKey(shippingAddress);
    const match = savedAddresses.find((saved) => getAddressKey(saved) === key);

    return match?.id;
}

/**
 * Converts an address book item to FormData for shipping address form submission.
 */
export function addressToFormData(address: AddressBookItem): FormData {
    const formData = new FormData();
    if (address.firstName) formData.append('firstName', address.firstName);
    if (address.lastName) formData.append('lastName', address.lastName);
    if (address.address1) formData.append('address1', address.address1);
    if (address.address2) formData.append('address2', address.address2);
    if (address.city) formData.append('city', address.city);
    if (address.stateCode) formData.append('stateCode', address.stateCode);
    if (address.postalCode) formData.append('postalCode', address.postalCode);
    if (address.countryCode) formData.append('countryCode', address.countryCode);
    if (address.phone) formData.append('phone', address.phone);
    return formData;
}
