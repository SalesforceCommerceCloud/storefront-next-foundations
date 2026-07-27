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
import type { CustomerProfile } from '@/components/checkout/utils/checkout-context-types';
import { customerAddressToOrderAddress } from '@/lib/address/address-utils';

/**
 * Prefill contact info form with customer data
 */
export function getContactInfoFromCustomer(customerProfile?: CustomerProfile) {
    if (!customerProfile?.customer) {
        return {};
    }

    const customer = customerProfile.customer;
    return {
        // For social login users, customer.login is the provider's external ID (e.g. "Google-123...")
        // not an email. Prefer customer.email, fall back to login only if it looks like an email.
        email: customer.email || (customer.login?.includes('@') ? customer.login : '') || '',
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        phone: customer.phoneHome || customer.phoneBusiness || customer.phoneMobile || '',
    };
}

/**
 * Prefill shipping address form with customer's preferred address
 * Prioritizes shipping address first, then billing address, then any available address
 */
export function getShippingAddressFromCustomer(customerProfile?: CustomerProfile) {
    if (!customerProfile?.addresses || customerProfile.addresses.length === 0) {
        return {};
    }

    // First priority: preferred shipping address
    let address = customerProfile.preferredShippingAddress;

    // Second priority: billing address (as fallback)
    if (!address) {
        address = customerProfile.preferredBillingAddress;
    }

    // Third priority: any address with billing in the ID
    if (!address) {
        address = customerProfile.addresses.find((addr) => addr.addressId?.toLowerCase().includes('billing'));
    }

    // Fourth priority: first available address
    if (!address) {
        address = customerProfile.addresses[0];
    }

    // If still no address, return empty
    if (!address) {
        return {};
    }

    return {
        firstName: address.firstName || '',
        lastName: address.lastName || '',
        address1: address.address1 || '',
        address2: address.address2 || '',
        city: address.city || '',
        stateCode: address.stateCode || '',
        postalCode: address.postalCode || '',
        countryCode: address.countryCode || 'US',
        phone: address.phone || '',
    };
}

/**
 * Prefill billing address form with customer's preferred billing address
 */
export function getBillingAddressFromCustomer(customerProfile?: CustomerProfile) {
    if (!customerProfile?.preferredBillingAddress) {
        // Fall back to shipping address if no separate billing address
        return getShippingAddressFromCustomer(customerProfile);
    }

    const address = customerProfile.preferredBillingAddress;
    return {
        firstName: address.firstName || '',
        lastName: address.lastName || '',
        address1: address.address1 || '',
        address2: address.address2 || '',
        city: address.city || '',
        stateCode: address.stateCode || '',
        postalCode: address.postalCode || '',
        countryCode: address.countryCode || 'US',
        phone: address.phone || '',
    };
}

/**
 * Get customer's saved payment methods for selection
 */
export function getPaymentMethodsFromCustomer(customerProfile?: CustomerProfile): Array<{
    id: string;
    type: string;
    cardType?: string;
    maskedNumber?: string;
    expirationMonth?: number;
    expirationYear?: number;
    cardholderName?: string;
    preferred?: boolean;
}> {
    if (!customerProfile?.paymentInstruments || customerProfile.paymentInstruments.length === 0) {
        return [];
    }

    return customerProfile.paymentInstruments.map((instrument, index) => {
        return {
            id: instrument.paymentInstrumentId || `payment_${index}`,
            type: instrument.paymentMethodId || 'CREDIT_CARD',
            cardType: instrument.paymentCard?.cardType || 'unknown',
            // API expects full masked format (e.g. '************1234'). Prefer API's maskedNumber;
            // otherwise build from numberLastDigits (last 4 digits only).
            maskedNumber:
                instrument.paymentCard?.maskedNumber ||
                (instrument.paymentCard?.numberLastDigits
                    ? `************${instrument.paymentCard.numberLastDigits}`
                    : undefined),
            expirationMonth: instrument.paymentCard?.expirationMonth,
            expirationYear: instrument.paymentCard?.expirationYear,
            cardholderName: instrument.paymentCard?.holder || '',
            preferred: index === 0, // First payment method as preferred by default
        };
    });
}

/**
 * Get default shipping method from available methods
 *
 * Determines which shipping method should be selected based on a priority system:
 * 1. Current selection (if user has already chosen a method)
 * 2. Commerce Cloud's defaultShippingMethodId
 * 3. First available method
 *
 * @param availableShippingMethods - Array of available shipping methods from Commerce Cloud API
 * @param currentlySelected - Currently selected shipping method from basket (if any)
 * @param defaultShippingMethodId - Default shipping method ID from Commerce Cloud API
 *                                   (ShippingMethodResult.defaultShippingMethodId)
 * @returns The shipping method ID to select, or undefined if no methods available
 */
export function getDefaultShippingMethod(
    availableShippingMethods?: Array<{
        id: string;
        name: string;
        price?: number;
        description?: string;
    }>,
    currentlySelected?: { id?: string } | null,
    defaultShippingMethodId?: string | null
): string | undefined {
    // If shopper has already selected a method, continue with shopper's choice
    if (currentlySelected?.id) {
        return currentlySelected.id;
    }

    // Early return if no shipping methods available for this address
    if (!availableShippingMethods || availableShippingMethods.length === 0) {
        return undefined;
    }

    // Use Commerce Cloud's configured defaultShippingMethodId from API
    // Also validate that the ID exists in available methods to prevent invalid selections
    if (defaultShippingMethodId) {
        const isValidDefaultId = availableShippingMethods.some((method) => method.id === defaultShippingMethodId);
        if (isValidDefaultId) {
            return defaultShippingMethodId;
        }
    }

    // Fallback: Select the first available method
    return availableShippingMethods[0]?.id;
}

/** Address book item shape returned by getAddressBookFromCustomer (matches SCAPI address fields). */
export type AddressBookItem = {
    id: string;
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    stateCode: string;
    postalCode: string;
    countryCode: string;
    phone?: string;
    preferred?: boolean;
    type?: 'shipping' | 'billing';
};

/**
 * Get customer's address book for selection
 */
export function getAddressBookFromCustomer(customerProfile?: CustomerProfile): AddressBookItem[] {
    if (!customerProfile?.addresses || customerProfile.addresses.length === 0) {
        return [];
    }

    return customerProfile.addresses.map((address): AddressBookItem => {
        const orderAddress = customerAddressToOrderAddress(address);
        return {
            ...orderAddress,
            id: address.addressId || '',
            preferred: address.preferred || false,
            type: address.addressId?.includes('billing') ? 'billing' : 'shipping',
        } as AddressBookItem;
    });
}

/**
 * Check if customer has any saved data that can be prefilled
 */
export function hasCustomerDataForPrefill(customerProfile?: CustomerProfile): {
    hasContactInfo: boolean;
    hasAddresses: boolean;
    hasPaymentMethods: boolean;
    hasAnyData: boolean;
} {
    const hasContactInfo = !!(
        customerProfile?.customer?.login ||
        customerProfile?.customer?.email ||
        customerProfile?.customer?.firstName
    );
    const hasAddresses = !!(customerProfile?.addresses && customerProfile.addresses.length > 0);
    const hasPaymentMethods = !!(customerProfile?.paymentInstruments && customerProfile.paymentInstruments.length > 0);

    return {
        hasContactInfo,
        hasAddresses,
        hasPaymentMethods,
        hasAnyData: hasContactInfo || hasAddresses || hasPaymentMethods,
    };
}
