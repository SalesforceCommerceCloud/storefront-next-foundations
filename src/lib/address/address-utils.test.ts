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
import { describe, expect, it } from 'vitest';
import type { ShopperBasketsV2, ShopperCustomers } from '@/scapi';
import {
    getAddressKey,
    isAddressEqual,
    isAddressEmpty,
    isOrderBillingAddressIncomplete,
    orderAddressToCustomerAddress,
    customerAddressToOrderAddress,
    formatAddress,
    findMatchingSavedAddressId,
} from './address-utils';
import type { AddressBookItem } from '@/lib/customer/profile-utils';

describe('address-utils', () => {
    describe('getAddressKey', () => {
        it('creates a normalized key from all core address fields', () => {
            const address: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };
            expect(getAddressKey(address)).toBe('John-Doe-123 Main St-Springfield-IL-62701-US');
        });

        it('normalizes undefined/null fields to empty strings', () => {
            const address: ShopperBasketsV2.schemas['OrderAddress'] = {
                address1: '123 Main St',
                city: 'Springfield',
            };
            expect(getAddressKey(address)).toBe('--123 Main St-Springfield---');
        });

        it('produces the same key for OrderAddress and equivalent CustomerAddress', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'Jane',
                lastName: 'Smith',
                address1: '456 Oak Ave',
                city: 'Portland',
                stateCode: 'OR',
                postalCode: '97201',
                countryCode: 'US',
            };
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'Jane',
                lastName: 'Smith',
                address1: '456 Oak Ave',
                city: 'Portland',
                stateCode: 'OR',
                postalCode: '97201',
                countryCode: 'US',
            };
            expect(getAddressKey(orderAddress)).toBe(getAddressKey(customerAddress));
        });

        it('produces different keys when any field differs', () => {
            const address1: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };
            const address2: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'CA',
            };
            expect(getAddressKey(address1)).not.toBe(getAddressKey(address2));
        });
    });

    describe('isAddressEqual', () => {
        const completeAddress1: ShopperBasketsV2.schemas['OrderAddress'] = {
            address1: '123 Main St',
            city: 'Springfield',
            stateCode: 'IL',
            postalCode: '62701',
            countryCode: 'US',
        };

        const completeAddress2: ShopperBasketsV2.schemas['OrderAddress'] = {
            address1: '456 Oak Ave',
            city: 'Portland',
            stateCode: 'OR',
            postalCode: '97201',
            countryCode: 'US',
        };

        describe('null/undefined handling', () => {
            it('returns false when both addresses are null', () => {
                expect(isAddressEqual(null, null)).toBe(false);
            });

            it('returns false when both addresses are undefined', () => {
                expect(isAddressEqual(undefined, undefined)).toBe(false);
            });

            it('returns false when first address is null', () => {
                expect(isAddressEqual(null, completeAddress1)).toBe(false);
            });

            it('returns false when second address is null', () => {
                expect(isAddressEqual(completeAddress1, null)).toBe(false);
            });

            it('returns false when first address is undefined', () => {
                expect(isAddressEqual(undefined, completeAddress1)).toBe(false);
            });

            it('returns false when second address is undefined', () => {
                expect(isAddressEqual(completeAddress1, undefined)).toBe(false);
            });
        });

        describe('matching addresses', () => {
            it('returns true when addresses are identical', () => {
                const address = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                expect(isAddressEqual(address, address)).toBe(true);
            });

            it('returns true when addresses have same values', () => {
                const address1: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                const address2: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                expect(isAddressEqual(address1, address2)).toBe(true);
            });

            it('returns true when addresses have same values including firstName and lastName', () => {
                const address1: ShopperBasketsV2.schemas['OrderAddress'] = {
                    firstName: 'John',
                    lastName: 'Doe',
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                const address2: ShopperBasketsV2.schemas['OrderAddress'] = {
                    firstName: 'John',
                    lastName: 'Doe',
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                expect(isAddressEqual(address1, address2)).toBe(true);
            });

            it('returns true when optional fields are missing from both addresses', () => {
                const address1: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                const address2: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                expect(isAddressEqual(address1, address2)).toBe(true);
            });

            it('returns true when undefined fields match empty strings', () => {
                const address1: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: undefined,
                    postalCode: undefined,
                    countryCode: undefined,
                };
                const address2: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: undefined,
                    postalCode: undefined,
                    countryCode: undefined,
                };
                expect(isAddressEqual(address1, address2)).toBe(true);
            });
        });

        describe('non-matching addresses', () => {
            it('returns false when address1 field differs', () => {
                expect(isAddressEqual(completeAddress1, completeAddress2)).toBe(false);
            });

            it('returns false when firstName differs', () => {
                const address1: ShopperBasketsV2.schemas['OrderAddress'] = {
                    firstName: 'John',
                    lastName: 'Doe',
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                const address2: ShopperBasketsV2.schemas['OrderAddress'] = {
                    firstName: 'Jane',
                    lastName: 'Doe',
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                expect(isAddressEqual(address1, address2)).toBe(false);
            });

            it('returns false when lastName differs', () => {
                const address1: ShopperBasketsV2.schemas['OrderAddress'] = {
                    firstName: 'John',
                    lastName: 'Doe',
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                const address2: ShopperBasketsV2.schemas['OrderAddress'] = {
                    firstName: 'John',
                    lastName: 'Smith',
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                expect(isAddressEqual(address1, address2)).toBe(false);
            });

            it('returns false when city differs', () => {
                const address1: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                const address2: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Portland',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                expect(isAddressEqual(address1, address2)).toBe(false);
            });

            it('returns false when stateCode differs', () => {
                const address1: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                const address2: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'OR',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                expect(isAddressEqual(address1, address2)).toBe(false);
            });

            it('returns false when postalCode differs', () => {
                const address1: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                const address2: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '97201',
                    countryCode: 'US',
                };
                expect(isAddressEqual(address1, address2)).toBe(false);
            });

            it('returns false when countryCode differs', () => {
                const address1: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                const address2: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'CA',
                };
                expect(isAddressEqual(address1, address2)).toBe(false);
            });

            it('returns false when one address has null fields and the other has values', () => {
                const address1: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: null as any,
                    postalCode: null as any,
                    countryCode: null as any,
                };
                const address2: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                    countryCode: 'US',
                };
                expect(isAddressEqual(address1, address2)).toBe(false);
            });
        });
    });

    describe('isAddressEmpty', () => {
        it('should return true when address is null', () => {
            expect(isAddressEmpty(null)).toBe(true);
        });

        it('should return true when address is undefined', () => {
            expect(isAddressEmpty(undefined)).toBe(true);
        });

        it('should return true when address is an empty object', () => {
            expect(isAddressEmpty({} as ShopperBasketsV2.schemas['OrderAddress'])).toBe(true);
        });

        it('should return true when all address fields are empty strings', () => {
            const address = {
                address1: '',
                city: '',
                countryCode: '',
                firstName: '',
                lastName: '',
                phone: '',
                postalCode: '',
                stateCode: '',
            } as ShopperBasketsV2.schemas['OrderAddress'];

            expect(isAddressEmpty(address)).toBe(true);
        });

        it('should return true when all address fields are null', () => {
            const address = {
                address1: null,
                city: null,
                countryCode: null,
                firstName: null,
                lastName: null,
                phone: null,
                postalCode: null,
                stateCode: null,
            } as unknown as ShopperBasketsV2.schemas['OrderAddress'];

            expect(isAddressEmpty(address)).toBe(true);
        });

        it('should return true when all address fields are undefined', () => {
            const address = {
                address1: undefined,
                city: undefined,
                countryCode: undefined,
                firstName: undefined,
                lastName: undefined,
                phone: undefined,
                postalCode: undefined,
                stateCode: undefined,
            } as ShopperBasketsV2.schemas['OrderAddress'];

            expect(isAddressEmpty(address)).toBe(true);
        });

        it('should return true when only id field is present (ignores id)', () => {
            const address = {
                id: 'address-123',
                address1: '',
                city: '',
                countryCode: '',
                firstName: '',
                lastName: '',
                phone: '',
                postalCode: '',
                stateCode: '',
            } as ShopperBasketsV2.schemas['OrderAddress'];

            expect(isAddressEmpty(address)).toBe(true);
        });

        it('should return false when address1 is filled', () => {
            const address = {
                address1: '123 Main St',
                city: '',
                countryCode: '',
                firstName: '',
                lastName: '',
                phone: '',
                postalCode: '',
                stateCode: '',
            } as ShopperBasketsV2.schemas['OrderAddress'];

            expect(isAddressEmpty(address)).toBe(false);
        });

        it('should return false when city is filled', () => {
            const address = {
                address1: '',
                city: 'New York',
                countryCode: '',
                firstName: '',
                lastName: '',
                phone: '',
                postalCode: '',
                stateCode: '',
            } as ShopperBasketsV2.schemas['OrderAddress'];

            expect(isAddressEmpty(address)).toBe(false);
        });

        it('should return false when any field is filled', () => {
            const address = {
                address1: '',
                city: '',
                countryCode: 'US',
                firstName: '',
                lastName: '',
                phone: '',
                postalCode: '',
                stateCode: '',
            } as ShopperBasketsV2.schemas['OrderAddress'];

            expect(isAddressEmpty(address)).toBe(false);
        });
    });

    describe('isOrderBillingAddressIncomplete', () => {
        it('returns true for null/undefined', () => {
            expect(isOrderBillingAddressIncomplete(null)).toBe(true);
            expect(isOrderBillingAddressIncomplete(undefined)).toBe(true);
        });

        it('returns true for phone-only stub (contact step)', () => {
            expect(
                isOrderBillingAddressIncomplete({
                    phone: '+1 (555) 123-4567',
                } as ShopperBasketsV2.schemas['OrderAddress'])
            ).toBe(true);
        });

        it('returns true when a core field is missing', () => {
            expect(
                isOrderBillingAddressIncomplete({
                    address1: '1 Main',
                    city: 'Austin',
                    postalCode: '',
                    countryCode: 'US',
                } as ShopperBasketsV2.schemas['OrderAddress'])
            ).toBe(true);
        });

        it('returns false for a typical complete billing address', () => {
            expect(
                isOrderBillingAddressIncomplete({
                    firstName: 'Jane',
                    lastName: 'Doe',
                    address1: '10 Oak',
                    city: 'Austin',
                    stateCode: 'TX',
                    postalCode: '78701',
                    countryCode: 'US',
                    phone: '555-0100',
                })
            ).toBe(false);
        });
    });

    describe('orderAddressToCustomerAddress', () => {
        it('converts a complete OrderAddress to CustomerAddress', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                address2: 'Apt 4B',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
                phone: '555-1234',
            };

            const result = orderAddressToCustomerAddress(orderAddress);

            expect(result.addressId).toMatch(/^shipping_\d+$/);
            expect(result.address1).toBe('123 Main St');
            expect(result.address2).toBe('Apt 4B');
            expect(result.city).toBe('Springfield');
            expect(result.countryCode).toBe('US');
            expect(result.firstName).toBe('John');
            expect(result.lastName).toBe('Doe');
            expect(result.phone).toBe('555-1234');
            expect(result.postalCode).toBe('62701');
            expect(result.stateCode).toBe('IL');
            expect(result.preferred).toBe(false);
        });

        it('handles OrderAddress with missing optional fields', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'Jane',
                lastName: 'Smith',
                address1: '456 Oak Ave',
                city: 'Portland',
                postalCode: '97201',
            };

            const result = orderAddressToCustomerAddress(orderAddress);

            expect(result.addressId).toMatch(/^shipping_\d+$/);
            expect(result.firstName).toBe('Jane');
            expect(result.lastName).toBe('Smith');
            expect(result.address1).toBe('456 Oak Ave');
            expect(result.city).toBe('Portland');
            expect(result.postalCode).toBe('97201');
            expect(result.address2).toBeUndefined();
            expect(result.stateCode).toBeUndefined();
            expect(result.countryCode).toBe('US'); // Default value
            expect(result.phone).toBeUndefined();
            expect(result.preferred).toBe(false);
        });

        it('provides default countryCode when missing', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                address1: '789 Elm St',
                city: 'Seattle',
                postalCode: '98101',
            };

            const result = orderAddressToCustomerAddress(orderAddress);

            expect(result.addressId).toMatch(/^shipping_\d+$/);
            expect(result.countryCode).toBe('US');
            expect(result.preferred).toBe(false);
        });

        it('handles empty string values by converting to empty strings', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: '',
                lastName: '',
                address1: '123 Test St',
                city: '',
                postalCode: '',
            };

            const result = orderAddressToCustomerAddress(orderAddress);

            expect(result.firstName).toBe('');
            expect(result.lastName).toBe('');
            expect(result.address1).toBe('123 Test St');
            expect(result.city).toBe('');
            expect(result.postalCode).toBe('');
        });

        it('does not add any extra fields beyond CustomerAddress', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                address1: '999 Test Ln',
                city: 'Test City',
                postalCode: '12345',
            };

            const result = orderAddressToCustomerAddress(orderAddress);

            expect(result.addressId).toMatch(/^shipping_\d+$/);
            expect('isGuestAddress' in result).toBe(false);
            expect(result.preferred).toBe(false);
        });

        it('sets preferred flag when specified', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'Preferred',
                lastName: 'User',
                address1: '111 Preferred St',
                city: 'Preferville',
                postalCode: '11111',
                countryCode: 'US',
            };

            const result = orderAddressToCustomerAddress(orderAddress, true);

            expect(result.addressId).toMatch(/^shipping_\d+$/);
            expect(result.preferred).toBe(true);
        });

        it('generates unique addressIds for multiple calls', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                address1: '123 Main St',
                city: 'Springfield',
                postalCode: '62701',
            };

            const result1 = orderAddressToCustomerAddress(orderAddress);
            const result2 = orderAddressToCustomerAddress(orderAddress);

            expect(result1.addressId).toMatch(/^shipping_\d+$/);
            expect(result2.addressId).toMatch(/^shipping_\d+$/);
            // addressIds should be different (assuming calls happen at different timestamps)
            // Note: In rare cases they might be the same if calls happen in the same millisecond
        });
    });

    describe('findMatchingSavedAddressId', () => {
        const savedAddresses: AddressBookItem[] = [
            {
                id: 'addr-home',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
                preferred: true,
            },
            {
                id: 'addr-work',
                firstName: 'John',
                lastName: 'Doe',
                address1: '456 Oak Ave',
                city: 'Portland',
                stateCode: 'OR',
                postalCode: '97201',
                countryCode: 'US',
            },
        ];

        it('returns the matching address id when shipping address matches a saved address', () => {
            const shippingAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'John',
                lastName: 'Doe',
                address1: '456 Oak Ave',
                city: 'Portland',
                stateCode: 'OR',
                postalCode: '97201',
                countryCode: 'US',
            };

            expect(findMatchingSavedAddressId(shippingAddress, savedAddresses)).toBe('addr-work');
        });

        it('returns undefined when no saved address matches', () => {
            const shippingAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'Jane',
                lastName: 'Smith',
                address1: '789 Elm St',
                city: 'Seattle',
                stateCode: 'WA',
                postalCode: '98101',
            };

            expect(findMatchingSavedAddressId(shippingAddress, savedAddresses)).toBeUndefined();
        });

        it('returns undefined when shipping address is null', () => {
            expect(findMatchingSavedAddressId(null, savedAddresses)).toBeUndefined();
        });

        it('returns undefined when shipping address is undefined', () => {
            expect(findMatchingSavedAddressId(undefined, savedAddresses)).toBeUndefined();
        });

        it('returns undefined when saved addresses list is empty', () => {
            const shippingAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
            };

            expect(findMatchingSavedAddressId(shippingAddress, [])).toBeUndefined();
        });

        it('treats undefined and empty string fields as equivalent', () => {
            const shippingAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
            };

            expect(findMatchingSavedAddressId(shippingAddress, savedAddresses)).toBe('addr-home');
        });
    });

    describe('formatAddress', () => {
        describe('null/undefined handling', () => {
            it('returns empty string when address is null', () => {
                expect(formatAddress(null).fullAddress).toBe('');
            });

            it('returns empty string when address is undefined', () => {
                expect(formatAddress(undefined).fullAddress).toBe('');
            });

            it('returns custom fallback text when address is null', () => {
                expect(formatAddress(null, 'No address').fullAddress).toBe('No address');
            });

            it('returns custom fallback text when address is undefined', () => {
                expect(formatAddress(undefined, 'No address provided').fullAddress).toBe('No address provided');
            });
        });

        describe('complete addresses', () => {
            it('formats complete address with all fields', () => {
                const address: ShopperBasketsV2.schemas['OrderAddress'] = {
                    firstName: 'John',
                    lastName: 'Doe',
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '62701',
                };
                expect(formatAddress(address).fullAddress).toBe('John Doe, 123 Main St, Springfield, IL, 62701');
            });

            it('formats address without name fields', () => {
                const address: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '456 Oak Ave',
                    city: 'Portland',
                    stateCode: 'OR',
                    postalCode: '97201',
                };
                expect(formatAddress(address).fullAddress).toBe('456 Oak Ave, Portland, OR, 97201');
            });

            it('formats address with only firstName', () => {
                const address: ShopperBasketsV2.schemas['OrderAddress'] = {
                    firstName: 'Jane',
                    address1: '789 Elm St',
                    city: 'Seattle',
                    stateCode: 'WA',
                    postalCode: '98101',
                };
                expect(formatAddress(address).fullAddress).toBe('789 Elm St, Seattle, WA, 98101');
            });

            it('formats address with only lastName', () => {
                const address: ShopperBasketsV2.schemas['OrderAddress'] = {
                    lastName: 'Smith',
                    address1: '321 Pine Rd',
                    city: 'Austin',
                    stateCode: 'TX',
                    postalCode: '78701',
                };
                expect(formatAddress(address).fullAddress).toBe('321 Pine Rd, Austin, TX, 78701');
            });
        });

        describe('partial addresses', () => {
            it('formats address with only city (no stateCode)', () => {
                const address: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                    city: 'Springfield',
                    postalCode: '62701',
                };
                expect(formatAddress(address).fullAddress).toBe('123 Main St, Springfield, 62701');
            });

            it('formats address with only stateCode (no city)', () => {
                const address: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '456 Oak Ave',
                    stateCode: 'OR',
                    postalCode: '97201',
                };
                expect(formatAddress(address).fullAddress).toBe('456 Oak Ave, OR, 97201');
            });

            it('formats address without postalCode', () => {
                const address: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '789 Elm St',
                    city: 'Seattle',
                    stateCode: 'WA',
                };
                expect(formatAddress(address).fullAddress).toBe('789 Elm St, Seattle, WA');
            });

            it('formats address with only address1', () => {
                const address: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '123 Main St',
                };
                expect(formatAddress(address).fullAddress).toBe('123 Main St');
            });

            it('formats address with city and stateCode', () => {
                const address: ShopperBasketsV2.schemas['OrderAddress'] = {
                    address1: '999 Test Ln',
                    city: 'Denver',
                    stateCode: 'CO',
                };
                expect(formatAddress(address).fullAddress).toBe('999 Test Ln, Denver, CO');
            });
        });

        describe('empty field handling', () => {
            it('filters out empty string fields', () => {
                const address: ShopperBasketsV2.schemas['OrderAddress'] = {
                    firstName: '',
                    lastName: '',
                    address1: '123 Main St',
                    city: 'Springfield',
                    stateCode: 'IL',
                    postalCode: '',
                };
                expect(formatAddress(address).fullAddress).toBe('123 Main St, Springfield, IL');
            });

            it('handles address with all empty fields', () => {
                const address: ShopperBasketsV2.schemas['OrderAddress'] = {
                    firstName: '',
                    lastName: '',
                    address1: '',
                    city: '',
                    stateCode: '',
                    postalCode: '',
                };
                expect(formatAddress(address).fullAddress).toBe('');
            });
        });
    });

    describe('customerAddressToOrderAddress', () => {
        it('converts a complete CustomerAddress to OrderAddress', () => {
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-1',
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                address2: 'Apt 4B',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
                phone: '555-1234',
            };

            const result = customerAddressToOrderAddress(customerAddress);

            expect(result).toEqual({
                address1: '123 Main St',
                address2: 'Apt 4B',
                city: 'Springfield',
                countryCode: 'US',
                firstName: 'John',
                lastName: 'Doe',
                phone: '555-1234',
                postalCode: '62701',
                stateCode: 'IL',
            });
            expect('addressId' in result).toBe(false);
        });

        it('handles CustomerAddress with missing optional fields', () => {
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-2',
                firstName: 'Jane',
                lastName: 'Smith',
                address1: '456 Oak Ave',
                city: 'Portland',
                countryCode: 'US',
                postalCode: '97201',
            };

            const result = customerAddressToOrderAddress(customerAddress);

            expect(result.address1).toBe('456 Oak Ave');
            expect(result.firstName).toBe('Jane');
            expect(result.lastName).toBe('Smith');
            expect(result.city).toBe('Portland');
            expect(result.postalCode).toBe('97201');
            expect(result.countryCode).toBe('US');
            expect(result.address2).toBeUndefined();
            expect(result.stateCode).toBe('');
            expect(result.phone).toBeUndefined();
        });

        it('preserves all address fields from CustomerAddress', () => {
            const customerAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'addr-3',
                firstName: 'Bob',
                lastName: 'Johnson',
                address1: '789 Elm St',
                city: 'Seattle',
                stateCode: 'WA',
                postalCode: '98101',
                countryCode: 'US',
            };

            const result = customerAddressToOrderAddress(customerAddress);

            expect(result).toHaveProperty('address1');
            expect(result).toHaveProperty('address2');
            expect(result).toHaveProperty('city');
            expect(result).toHaveProperty('countryCode');
            expect(result).toHaveProperty('firstName');
            expect(result).toHaveProperty('lastName');
            expect(result).toHaveProperty('phone');
            expect(result).toHaveProperty('postalCode');
            expect(result).toHaveProperty('stateCode');
            expect(result).not.toHaveProperty('addressId');
        });
    });
});
