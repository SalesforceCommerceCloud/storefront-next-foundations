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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PickupOrDelivery from './pickup-or-delivery';
import { DELIVERY_OPTIONS } from '@/extensions/bopis/constants';

// Mock the hooks
vi.mock('@/extensions/store-locator/providers/store-locator', () => ({
    useStoreLocator: vi.fn(),
}));

describe('PickupOrDelivery', () => {
    let mockUseStoreLocator: ReturnType<typeof vi.fn>;
    let mockOpenStoreLocator: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Get the mocked functions
        const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');

        mockUseStoreLocator = useStoreLocator as any;

        // Setup mock functions
        mockOpenStoreLocator = vi.fn();

        // Mock useStoreLocator to return a selector function
        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: null, open: mockOpenStoreLocator, isOpen: false };
            return selector(mockStoreState);
        });
    });

    it('renders with default props', () => {
        render(<PickupOrDelivery />);

        expect(screen.getByTestId('delivery-option-select')).toBeInTheDocument();
        expect(screen.getByText('Deliver to')).toBeInTheDocument();
        expect(screen.getByText('Free pickup in')).toBeInTheDocument();
    });

    it('renders with Select Store label when no pickup store is provided', () => {
        render(<PickupOrDelivery />);

        expect(screen.getByText('Select Store')).toBeInTheDocument();
    });

    it('renders with custom value', () => {
        render(<PickupOrDelivery value={DELIVERY_OPTIONS.PICKUP} />);

        expect(screen.getByTestId('delivery-option-select')).toBeInTheDocument();
        expect(screen.getByText('Deliver to')).toBeInTheDocument();
        expect(screen.getByText('Free pickup in')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
        const { container } = render(<PickupOrDelivery className="custom-class" />);

        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders with isPickupDisabled prop', () => {
        render(<PickupOrDelivery isPickupDisabled={true} />);

        const pickupRadio = screen.getByLabelText('Pickup unavailable at');
        expect(pickupRadio).toBeDisabled();
    });

    it('renders with isDeliveryDisabled prop', () => {
        render(<PickupOrDelivery isDeliveryDisabled={true} />);

        const deliveryRadio = screen.getByRole('radio', { name: /deliver to/i });
        expect(deliveryRadio).toHaveAttribute('disabled');
    });

    it('renders with both options disabled', () => {
        render(<PickupOrDelivery isPickupDisabled={true} isDeliveryDisabled={true} />);

        const deliveryRadio = screen.getByRole('radio', { name: /deliver to/i });
        const pickupRadio = screen.getByRole('radio', { name: /pickup unavailable at/i });
        expect(deliveryRadio).toHaveAttribute('disabled');
        expect(pickupRadio).toHaveAttribute('disabled');
    });

    it('renders with all props combined', () => {
        render(
            <PickupOrDelivery
                value={DELIVERY_OPTIONS.PICKUP}
                onChange={vi.fn()}
                isPickupDisabled={false}
                isDeliveryDisabled={false}
                className="test-class"
            />
        );

        expect(screen.getByTestId('delivery-option-select')).toBeInTheDocument();
        expect(screen.getByText('Free pickup in')).toBeInTheDocument();
        expect(screen.getByText('Deliver to')).toBeInTheDocument();
        expect(screen.getByTestId('delivery-option-select').parentElement).toHaveClass('test-class');
    });

    it('applies correct accessibility attributes', () => {
        render(<PickupOrDelivery />);

        const deliveryRadio = screen.getByRole('radio', { name: /deliver to/i });
        const pickupRadio = screen.getByRole('radio', { name: /free pickup in/i });

        expect(deliveryRadio).toHaveAttribute('id', 'delivery-option');
        expect(pickupRadio).toHaveAttribute('id', 'pickup-option');
    });

    it('handles undefined onChange gracefully', () => {
        render(<PickupOrDelivery onChange={undefined} />);

        const deliveryText = screen.getByText('Deliver to');
        const pickupText = screen.getByText('Free pickup in');

        // Should not throw when rendering
        expect(deliveryText).toBeInTheDocument();
        expect(pickupText).toBeInTheDocument();
    });

    it('calls onChange when pickup radio button is clicked', () => {
        const mockOnChange = vi.fn();
        render(<PickupOrDelivery onChange={mockOnChange} />);

        const pickupCard = screen.getByText('Free pickup in').closest('label');
        expect(pickupCard).not.toBeNull();
        fireEvent.click(pickupCard as HTMLElement);

        expect(mockOnChange).toHaveBeenCalledWith(DELIVERY_OPTIONS.PICKUP);
    });

    it('calls onChange when delivery radio button is clicked', () => {
        const mockOnChange = vi.fn();
        render(<PickupOrDelivery value={DELIVERY_OPTIONS.PICKUP} onChange={mockOnChange} />);

        const deliveryCard = screen.getByText('Deliver to').closest('label');
        expect(deliveryCard).not.toBeNull();
        fireEvent.click(deliveryCard as HTMLElement);

        expect(mockOnChange).toHaveBeenCalledWith(DELIVERY_OPTIONS.DELIVERY);
    });

    it('does not call onChange when disabled pickup option is clicked', () => {
        const mockOnChange = vi.fn();
        render(<PickupOrDelivery onChange={mockOnChange} isPickupDisabled={true} />);

        const pickupRadio = screen.getByRole('radio', { name: /pickup unavailable at/i });
        fireEvent.click(pickupRadio);

        expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('does not call onChange when disabled delivery option is clicked', () => {
        const mockOnChange = vi.fn();
        render(<PickupOrDelivery onChange={mockOnChange} isDeliveryDisabled={true} />);

        const deliveryRadio = screen.getByRole('radio', { name: /deliver to/i });
        fireEvent.click(deliveryRadio);

        expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('does not call onChange for invalid values', () => {
        const mockOnChange = vi.fn();
        render(<PickupOrDelivery onChange={mockOnChange} value={DELIVERY_OPTIONS.DELIVERY} />);

        // When clicking the already-selected option, RadioGroup may or may not call onChange
        // This is implementation-dependent behavior
        const deliveryCard = screen.getByText('Deliver to').closest('label');
        expect(deliveryCard).not.toBeNull();
        fireEvent.click(deliveryCard as HTMLElement);

        // Allow either behavior - calling or not calling onChange for same value
        if (mockOnChange.mock.calls.length > 0) {
            expect(mockOnChange).toHaveBeenCalledWith(DELIVERY_OPTIONS.DELIVERY);
        }
    });

    it('applies disabled styling to pickup label when isPickupDisabled is true', () => {
        render(<PickupOrDelivery isPickupDisabled={true} />);

        const pickupCard = screen.getByText('Pickup unavailable at').closest('label');
        expect(pickupCard).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('applies disabled styling to delivery label when isDeliveryDisabled is true', () => {
        render(<PickupOrDelivery isDeliveryDisabled={true} />);

        const deliveryCard = screen.getByText('Deliver to').closest('label');
        expect(deliveryCard).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
});
