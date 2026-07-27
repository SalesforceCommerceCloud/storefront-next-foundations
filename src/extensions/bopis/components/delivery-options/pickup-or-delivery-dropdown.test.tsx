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
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PickupOrDeliveryDropdown from './pickup-or-delivery-dropdown';
import { DELIVERY_OPTIONS } from '@/extensions/bopis/constants';

const tMap: Record<string, string> = {
    'deliveryOptions.pickupOrDelivery.shipToAddress': 'Ship to Address',
    'deliveryOptions.pickupOrDelivery.storePickup': 'Pick Up in Store',
    'deliveryOptions.pickupOrDelivery.storePickupLabel': 'Pick Up',
    'deliveryOptions.pickupOrDelivery.delivery': 'Delivery',
};
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => tMap[key] || key,
    }),
}));

describe('PickupOrDeliveryDropdown', () => {
    it('renders Delivery label and ShoppingCart icon when value is DELIVERY', () => {
        render(<PickupOrDeliveryDropdown value={DELIVERY_OPTIONS.DELIVERY} onChange={() => {}} />);
        expect(screen.getByText('Delivery')).toBeInTheDocument();
        // Icon SVG for ShoppingCart
        expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('renders Pick Up label and Store icon when value is PICKUP', () => {
        render(<PickupOrDeliveryDropdown value={DELIVERY_OPTIONS.PICKUP} onChange={() => {}} />);
        expect(screen.getByText('Pick Up')).toBeInTheDocument();
        // Icon SVG for Store
        expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('shows dropdown options on trigger click', async () => {
        render(<PickupOrDeliveryDropdown value={DELIVERY_OPTIONS.DELIVERY} onChange={() => {}} />);
        const user = userEvent.setup();
        await user.click(screen.getByRole('button'));
        expect(await screen.findByText('Ship to Address')).toBeInTheDocument();
        expect(await screen.findByText('Pick Up in Store')).toBeInTheDocument();
    });

    it('always enables both options (no isPickupDisabled/isDeliveryDisabled)', async () => {
        render(<PickupOrDeliveryDropdown value={DELIVERY_OPTIONS.DELIVERY} onChange={() => {}} />);
        const user = userEvent.setup();
        await user.click(screen.getByRole('button'));
        expect(await screen.findByText('Ship to Address')).not.toHaveAttribute('aria-disabled');
        expect(await screen.findByText('Pick Up in Store')).not.toHaveAttribute('aria-disabled');
    });

    it('calls onChange handler with correct value', async () => {
        const onChange = vi.fn();
        render(<PickupOrDeliveryDropdown value={DELIVERY_OPTIONS.DELIVERY} onChange={onChange} />);
        const user = userEvent.setup();
        await user.click(screen.getByRole('button'));
        const pickupItem = await screen.findByText('Pick Up in Store');
        await user.click(pickupItem);
        expect(onChange).toHaveBeenCalledWith(DELIVERY_OPTIONS.PICKUP);
    });
});
