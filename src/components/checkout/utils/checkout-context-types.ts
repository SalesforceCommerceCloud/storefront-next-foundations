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
import { createContext } from 'react';
import type { ShopperCustomers } from '@/scapi';
import type { ShipmentDistribution } from './checkout-distribution';

export const CHECKOUT_STEPS = {
    CONTACT_INFO: 0,
    PICKUP: 1,
    SHIPPING_ADDRESS: 2,
    SHIPPING_OPTIONS: 3,
    PAYMENT: 4,
    PLACE_ORDER: 5,
} as const;

export type CheckoutStep = (typeof CHECKOUT_STEPS)[keyof typeof CHECKOUT_STEPS];

/**
 * Action intent values for checkout form submissions
 * Maps to the checkout step keys in camelCase format
 */
export const CHECKOUT_ACTION_INTENTS = {
    CONTACT_INFO: 'contactInfo',
    SHIPPING_ADDRESS: 'shippingAddress',
    SHIPPING_OPTIONS: 'shippingOptions',
    PAYMENT: 'payment',
} as const;

export type CheckoutActionIntent = (typeof CHECKOUT_ACTION_INTENTS)[keyof typeof CHECKOUT_ACTION_INTENTS];

export interface CustomerProfile {
    customer?: ShopperCustomers.schemas['Customer'];
    addresses: ShopperCustomers.schemas['CustomerAddress'][];
    paymentInstruments: ShopperCustomers.schemas['CustomerPaymentInstrument'][];
    preferredShippingAddress?: ShopperCustomers.schemas['CustomerAddress'];
    preferredBillingAddress?: ShopperCustomers.schemas['CustomerAddress'];
}

export interface CheckoutContextValue {
    step: CheckoutStep;
    computedStep: CheckoutStep;
    editingStep: CheckoutStep | null;
    STEPS: typeof CHECKOUT_STEPS;
    customerProfile?: CustomerProfile;
    shippingDefaultSet: Promise<undefined>;
    shipmentDistribution: ShipmentDistribution;
    savedAddresses: ShopperCustomers.schemas['CustomerAddress'][];
    setSavedAddresses: (addresses: ShopperCustomers.schemas['CustomerAddress'][]) => void;
    // sfdc-extension-block-start SFDC_EXT_MULTISHIP
    productItemAddresses?: Map<string, ShopperCustomers.schemas['CustomerAddress']>;
    setProductItemAddresses?: (productItemAddresses: Map<string, ShopperCustomers.schemas['CustomerAddress']>) => void;
    // sfdc-extension-block-end SFDC_EXT_MULTISHIP
    goToNextStep: () => void;
    goToStep: (step: CheckoutStep) => void;
    exitEditMode: () => void;
    /** Pin shopper to `step`, overriding basket-driven auto-advance. Optional for test mocks. */
    pinToStep?: (step: CheckoutStep) => void;
}

export const CheckoutContext = createContext<CheckoutContextValue | null>(null);
